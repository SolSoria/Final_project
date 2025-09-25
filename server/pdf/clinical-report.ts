import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Chart, registerables } from 'chart.js';
import puppeteer from 'puppeteer';
import { type Patient, type Session, type MlPrediction } from '@shared/schema';

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    borderDash?: number[];
  }>;
}

interface ReportData {
  patient: Patient;
  sessions: Session[];
  mlPredictions?: MlPrediction[];
  dateRange: { start: Date; end: Date };
  includeML: boolean;
}

export class ClinicalReportService {
  private chartRenderer: ChartJSNodeCanvas;

  constructor() {
    // Register Chart.js components for server-side rendering
    Chart.register(...registerables);
    
    this.chartRenderer = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white',
      chartCallback: (ChartJS) => {
        // Register all Chart.js components in the callback as well
        ChartJS.register(...registerables);
        ChartJS.defaults.font.family = 'Arial, sans-serif';
        ChartJS.defaults.font.size = 12;
      }
    });
  }

  async generateReport(data: ReportData): Promise<Buffer> {
    const { patient, sessions, mlPredictions = [], includeML } = data;
    
    // Generate trend charts as base64 images
    const chartImages = await this.generateChartImages(sessions, mlPredictions, includeML);
    
    // Create HTML report template
    const htmlContent = this.createHTMLTemplate(patient, sessions, chartImages, includeML);
    
    // Convert HTML to PDF using Puppeteer
    return await this.generatePDFFromHTML(htmlContent);
  }

  private async generatePDFFromHTML(htmlContent: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });

    try {
      const page = await browser.newPage();
      
      // Set content and wait for it to load
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // Generate PDF with proper clinical report settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>', // Empty header
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
            NeuroScopeQ Clinical Report - Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `
      });
      
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private async generateChartImages(
    sessions: Session[], 
    mlPredictions: MlPrediction[], 
    includeML: boolean
  ): Promise<Record<string, string>> {
    const metrics = ['encephalopathyScore', 'deltaPct', 'adr', 'sef95'] as const;
    const images: Record<string, string> = {};

    for (const metric of metrics) {
      const chartData = this.prepareChartData(sessions, mlPredictions, metric, includeML);
      const imageBuffer = await this.chartRenderer.renderToBuffer({
        type: 'line',
        data: chartData,
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: this.getMetricTitle(metric),
              font: { size: 16, weight: 'bold' }
            },
            legend: {
              display: includeML,
              position: 'top'
            }
          },
          scales: {
            x: {
              display: true,
              title: { display: true, text: 'Date' }
            },
            y: {
              display: true,
              title: { display: true, text: this.getMetricUnit(metric) }
            }
          }
        }
      });
      
      images[metric] = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    }

    return images;
  }

  private prepareChartData(
    sessions: Session[], 
    mlPredictions: MlPrediction[], 
    metric: keyof Pick<Session, 'encephalopathyScore' | 'deltaPct' | 'adr' | 'sef95'>,
    includeML: boolean
  ): ChartData {
    const sortedSessions = sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const labels = sortedSessions.map(session => 
      new Date(session.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    );

    const datasets = [
      {
        label: 'Rule-based',
        data: sortedSessions.map(session => session[metric]),
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F6',
        borderWidth: 2
      }
    ];

    if (includeML && mlPredictions.length > 0) {
      const mlData = sortedSessions.map(session => {
        const mlPred = mlPredictions.find(ml => ml.sessionId === session.id);
        return mlPred ? mlPred[metric] : 0; // Use 0 instead of null for missing predictions
      }).filter(value => value !== null) as number[]; // Filter out nulls and cast to number[]

      datasets.push({
        label: 'ML (Random Forest)',
        data: mlData,
        borderColor: '#10B981',
        backgroundColor: '#10B981',
        borderDash: [5, 5],
        borderWidth: 2
      });
    }

    return { labels, datasets };
  }

  private createHTMLTemplate(
    patient: Patient, 
    sessions: Session[], 
    chartImages: Record<string, string>,
    includeML: boolean
  ): string {
    const latestSession = sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const reportDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>NeuroScopeQ Clinical Report - ${patient.name}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.4; 
          color: #333; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px;
        }
        .header { 
          border-bottom: 3px solid #3B82F6; 
          margin-bottom: 30px; 
          padding-bottom: 20px; 
        }
        .logo { 
          font-size: 24px; 
          font-weight: bold; 
          color: #3B82F6; 
          margin-bottom: 10px; 
        }
        .patient-info { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px; 
          margin-bottom: 30px; 
          background: #F8FAFC; 
          padding: 20px; 
          border-radius: 8px; 
        }
        .metric-summary { 
          margin-bottom: 30px; 
        }
        .metric-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
          gap: 15px; 
          margin-bottom: 20px; 
        }
        .metric-card { 
          background: white; 
          border: 1px solid #E5E7EB; 
          border-radius: 8px; 
          padding: 15px; 
          text-align: center; 
        }
        .metric-title { 
          font-size: 12px; 
          color: #6B7280; 
          margin-bottom: 5px; 
        }
        .metric-value { 
          font-size: 20px; 
          font-weight: bold; 
          margin-bottom: 5px; 
        }
        .severity-normal { color: #10B981; }
        .severity-mild { color: #F59E0B; }
        .severity-moderate { color: #EF4444; }
        .severity-severe { color: #DC2626; }
        .chart-section { 
          margin-bottom: 30px; 
          page-break-inside: avoid; 
        }
        .chart-title { 
          font-size: 16px; 
          font-weight: bold; 
          margin-bottom: 15px; 
          color: #374151; 
        }
        .chart-image { 
          width: 100%; 
          height: auto; 
          border: 1px solid #E5E7EB; 
          border-radius: 8px; 
        }
        .sessions-summary { 
          margin-bottom: 30px; 
        }
        .sessions-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 15px; 
        }
        .sessions-table th, .sessions-table td { 
          border: 1px solid #E5E7EB; 
          padding: 8px; 
          text-align: left; 
          font-size: 12px; 
        }
        .sessions-table th { 
          background: #F8FAFC; 
          font-weight: bold; 
        }
        .footer { 
          margin-top: 40px; 
          padding-top: 20px; 
          border-top: 1px solid #E5E7EB; 
          font-size: 12px; 
          color: #6B7280; 
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .chart-section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">NeuroScopeQ Clinical Report</div>
        <div>Generated: ${reportDate}</div>
      </div>

      <div class="patient-info">
        <div>
          <h3>Patient Information</h3>
          <p><strong>Name:</strong> ${patient.name}</p>
          <p><strong>Age:</strong> ${patient.age} years</p>
          <p><strong>Sex:</strong> ${patient.sex}</p>
          <p><strong>Cohort:</strong> ${patient.cohort}</p>
        </div>
        <div>
          <h3>Clinical Setting</h3>
          <p><strong>Setting:</strong> ${patient.setting}</p>
          <p><strong>Bed:</strong> ${patient.bed}</p>
          <p><strong>Sessions:</strong> ${sessions.length}</p>
          ${includeML ? '<p><strong>ML Analysis:</strong> Enabled (Random Forest)</p>' : ''}
        </div>
      </div>

      ${latestSession ? this.generateLatestMetrics(latestSession) : ''}

      <div class="chart-section">
        <h3 class="chart-title">Encephalopathy Score Trend</h3>
        <img src="${chartImages.encephalopathyScore}" class="chart-image" alt="Encephalopathy Score Trend">
      </div>

      <div class="chart-section">
        <h3 class="chart-title">Delta % Trend</h3>
        <img src="${chartImages.deltaPct}" class="chart-image" alt="Delta % Trend">
      </div>

      <div class="chart-section">
        <h3 class="chart-title">Alpha/Delta Ratio Trend</h3>
        <img src="${chartImages.adr}" class="chart-image" alt="Alpha/Delta Ratio Trend">
      </div>

      <div class="chart-section">
        <h3 class="chart-title">SEF95 Trend</h3>
        <img src="${chartImages.sef95}" class="chart-image" alt="SEF95 Trend">
      </div>

      ${this.generateSessionsTable(sessions)}

      <div class="footer">
        <p>This report was generated by NeuroScopeQ EEG Clinical Monitoring Dashboard.</p>
        <p>Report includes ${sessions.length} session(s) from ${sessions.length > 0 ? new Date(Math.min(...sessions.map(s => new Date(s.date).getTime()))).toLocaleDateString() : 'N/A'} to ${sessions.length > 0 ? new Date(Math.max(...sessions.map(s => new Date(s.date).getTime()))).toLocaleDateString() : 'N/A'}.</p>
        ${includeML ? '<p>Machine Learning predictions generated using Random Forest model trained on TUH EEG corpus.</p>' : ''}
      </div>
    </body>
    </html>`;
  }

  private generateLatestMetrics(session: Session): string {
    return `
      <div class="metric-summary">
        <h3>Latest Session Metrics (${new Date(session.date).toLocaleDateString()})</h3>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-title">Encephalopathy Score</div>
            <div class="metric-value ${this.getSeverityClass(session.encephalopathyScore, 'encephalopathy')}">${session.encephalopathyScore.toFixed(1)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Delta %</div>
            <div class="metric-value ${this.getSeverityClass(session.deltaPct, 'delta')}">${session.deltaPct.toFixed(1)}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Alpha/Delta Ratio</div>
            <div class="metric-value ${this.getSeverityClass(session.adr, 'adr')}">${session.adr.toFixed(2)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">SEF95</div>
            <div class="metric-value ${this.getSeverityClass(session.sef95, 'sef95')}">${session.sef95.toFixed(1)} Hz</div>
          </div>
        </div>
      </div>`;
  }

  private generateSessionsTable(sessions: Session[]): string {
    const sortedSessions = sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return `
      <div class="sessions-summary">
        <h3>Session History</h3>
        <table class="sessions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Enceph. Score</th>
              <th>Delta %</th>
              <th>ADR</th>
              <th>SEF95</th>
              <th>Valid Min</th>
              <th>Artifact %</th>
            </tr>
          </thead>
          <tbody>
            ${sortedSessions.map(session => `
              <tr>
                <td>${new Date(session.date).toLocaleDateString()} ${new Date(session.date).toLocaleTimeString()}</td>
                <td>${session.encephalopathyScore.toFixed(1)}</td>
                <td>${session.deltaPct.toFixed(1)}%</td>
                <td>${session.adr.toFixed(2)}</td>
                <td>${session.sef95.toFixed(1)} Hz</td>
                <td>${session.minutesValid.toFixed(0)}</td>
                <td>${session.artifactPct.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  private getSeverityClass(value: number, metric: string): string {
    // Simplified severity classification for display
    switch (metric) {
      case 'encephalopathy':
        if (value <= 2) return 'severity-normal';
        if (value <= 4) return 'severity-mild';
        if (value <= 6) return 'severity-moderate';
        return 'severity-severe';
      case 'delta':
        if (value <= 20) return 'severity-normal';
        if (value <= 35) return 'severity-mild';
        return 'severity-moderate';
      case 'adr':
        if (value >= 0.8) return 'severity-normal';
        if (value >= 0.6) return 'severity-mild';
        return 'severity-moderate';
      case 'sef95':
        if (value >= 11) return 'severity-normal';
        if (value >= 7.5) return 'severity-mild';
        return 'severity-moderate';
      default:
        return 'severity-normal';
    }
  }

  private getMetricTitle(metric: string): string {
    switch (metric) {
      case 'encephalopathyScore': return 'Encephalopathy Score';
      case 'deltaPct': return 'Delta Percentage';
      case 'adr': return 'Alpha/Delta Ratio';
      case 'sef95': return 'SEF95 (Hz)';
      default: return metric;
    }
  }

  private getMetricUnit(metric: string): string {
    switch (metric) {
      case 'encephalopathyScore': return 'Score';
      case 'deltaPct': return 'Percentage (%)';
      case 'adr': return 'Ratio';
      case 'sef95': return 'Frequency (Hz)';
      default: return 'Value';
    }
  }
}
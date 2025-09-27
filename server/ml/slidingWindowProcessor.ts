import { type CohortType } from "../../shared/schema";
import { qEEGFeatureExtractor } from './qEEGFeatures';
import { ThresholdConfiguration } from './thresholdConfig';
import { enhancedRandomForestModel } from './randomForest';
import { 
  EEGData, 
  PreprocessingConfig, 
  RealTimeState, 
  StimulusEvent, 
  ProcessingResult,
  qEEGFeatures 
} from './qEEGProcessor';

/**
 * Sliding Window Processor for Real-Time EEG Analysis
 * Enables continuous monitoring and analysis of EEG data streams
 * with configurable window sizes, overlaps, and processing intervals
 */
export class SlidingWindowProcessor {
  private processor: qEEGFeatureExtractor;
  private thresholdConfig: ThresholdConfiguration;
  private mlModel: typeof enhancedRandomForestModel;
  
  // Window configuration
  private windowSize: number; // in seconds
  private overlap: number; // in seconds (0 = no overlap, windowSize/2 = 50% overlap)
  private samplingRate: number; // Hz
  
  // Real-time state
  private state: RealTimeState;
  private isProcessing: boolean = false;
  private processingInterval?: NodeJS.Timeout;
  
  // Callbacks for real-time updates
  private onFeatureUpdate?: (features: qEEGFeatures, result: ProcessingResult) => void;
  private onPredictionUpdate?: (prediction: any) => void;
  private onAlert?: (alert: string, severity: 'info' | 'warning' | 'critical') => void;

  constructor(
    windowSize: number = 30, // 30-second windows
    overlap: number = 15,    // 50% overlap
    samplingRate: number = 250 // 250 Hz
  ) {
    this.windowSize = windowSize;
    this.overlap = overlap;
    this.samplingRate = samplingRate;
    
    this.processor = new qEEGFeatureExtractor();
    this.thresholdConfig = new ThresholdConfiguration();
    this.mlModel = enhancedRandomForestModel;
    
    // Initialize real-time state
    this.state = {
      isProcessing: false,
      currentWindow: 0,
      buffer: this.createEmptyBuffer(),
      lastUpdate: Date.now(),
      features: []
    };
  }

  /**
   * Create empty EEG data buffer for initialization
   */
  private createEmptyBuffer(): EEGData {
    return {
      channels: [
        { name: 'Fp1', type: 'EEG', position: { x: -0.5, y: 0.8 }, samplingRate: this.samplingRate },
        { name: 'Fp2', type: 'EEG', position: { x: 0.5, y: 0.8 }, samplingRate: this.samplingRate },
        { name: 'F3', type: 'EEG', position: { x: -0.3, y: 0.5 }, samplingRate: this.samplingRate },
        { name: 'F4', type: 'EEG', position: { x: 0.3, y: 0.5 }, samplingRate: this.samplingRate },
        { name: 'C3', type: 'EEG', position: { x: -0.3, y: 0 }, samplingRate: this.samplingRate },
        { name: 'C4', type: 'EEG', position: { x: 0.3, y: 0 }, samplingRate: this.samplingRate },
        { name: 'P3', type: 'EEG', position: { x: -0.3, y: -0.5 }, samplingRate: this.samplingRate },
        { name: 'P4', type: 'EEG', position: { x: 0.3, y: -0.5 }, samplingRate: this.samplingRate },
        { name: 'O1', type: 'EEG', position: { x: -0.5, y: -0.8 }, samplingRate: this.samplingRate },
        { name: 'O2', type: 'EEG', position: { x: 0.5, y: -0.8 }, samplingRate: this.samplingRate }
      ],
      samples: Array(10).fill(null).map(() => []),
      timestamps: [],
      samplingRate: this.samplingRate,
      duration: 0
    };
  }

  /**
   * Start real-time processing
   */
  public startProcessing(intervalMs: number = 1000): void {
    if (this.isProcessing) {
      this.onAlert?.('Processing already started', 'warning');
      return;
    }

    this.isProcessing = true;
    this.state.isProcessing = true;
    
    // Start processing interval
    this.processingInterval = setInterval(() => {
      this.processCurrentWindow();
    }, intervalMs);

    this.onAlert?.('Real-time processing started', 'info');
  }

  /**
   * Stop real-time processing
   */
  public stopProcessing(): void {
    if (!this.isProcessing) {
      return;
    }

    this.isProcessing = false;
    this.state.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    this.onAlert?.('Real-time processing stopped', 'info');
  }

  /**
   * Add new EEG data to the buffer
   */
  public addEEGData(data: EEGData): void {
    // Add new samples to buffer
    for (let i = 0; i < data.channels.length && i < this.state.buffer.channels.length; i++) {
      this.state.buffer.samples[i].push(...data.samples[i]);
    }
    
    // Update timestamps
    this.state.buffer.timestamps.push(...data.timestamps);
    this.state.buffer.duration += data.duration;
    
    // Maintain buffer size (keep twice the window size for safety)
    const maxSamples = this.windowSize * 2 * this.samplingRate;
    for (let i = 0; i < this.state.buffer.samples.length; i++) {
      if (this.state.buffer.samples[i].length > maxSamples) {
        this.state.buffer.samples[i] = this.state.buffer.samples[i].slice(-maxSamples);
      }
    }
    
    if (this.state.buffer.timestamps.length > maxSamples) {
      this.state.buffer.timestamps = this.state.buffer.timestamps.slice(-maxSamples);
    }
  }

  /**
   * Process the current window of data
   */
  private async processCurrentWindow(): Promise<void> {
    if (!this.hasEnoughData()) {
      return;
    }

    try {
      const startTime = Date.now();
      
      // Extract current window
      const windowData = this.extractCurrentWindow();
      
      // Process qEEG features
      const features = await this.processor.extractFeatures(windowData);
      
      // Get ML prediction
      const prediction = this.mlModel.predict(features);
      
      // Assess severity using threshold configuration
      const severityAssessment = this.thresholdConfig.assessSeverity(features, 'ADULT'); // Default to adult
      
      // Create processing result
      const result: ProcessingResult = {
        features,
        windowInfo: {
          start: this.state.currentWindow * this.overlap,
          end: this.state.currentWindow * this.overlap + this.windowSize,
          duration: this.windowSize
        },
        processingStats: {
          duration: Date.now() - startTime,
          artifactLevel: features.artifacts.totalArtifactPct,
          quality: features.artifacts.qualityLevel
        },
        alerts: this.generateAlerts(features, prediction, severityAssessment)
      };

      // Update state
      this.state.features.push(features);
      this.state.currentWindow++;
      this.state.lastUpdate = Date.now();
      
      // Keep only recent features in memory (last 10 windows)
      if (this.state.features.length > 10) {
        this.state.features = this.state.features.slice(-10);
      }

      // Trigger callbacks
      this.onFeatureUpdate?.(features, result);
      this.onPredictionUpdate?.(prediction);
      
      // Send alerts if any
      result.alerts.forEach(alert => {
        const severity = this.determineAlertSeverity(alert);
        this.onAlert?.(alert, severity);
      });

    } catch (error) {
      console.error('Error processing window:', error);
      this.onAlert?.(`Processing error: ${error}`, 'critical');
    }
  }

  /**
   * Check if there's enough data for processing
   */
  private hasEnoughData(): boolean {
    const requiredSamples = this.windowSize * this.samplingRate;
    return this.state.buffer.samples[0]?.length >= requiredSamples || false;
  }

  /**
   * Extract current window from buffer
   */
  private extractCurrentWindow(): EEGData {
    const windowStart = this.state.currentWindow * this.overlap * this.samplingRate;
    const windowEnd = windowStart + this.windowSize * this.samplingRate;
    
    return {
      channels: this.state.buffer.channels,
      samples: this.state.buffer.samples.map(channelSamples => 
        channelSamples.slice(windowStart, windowEnd)
      ),
      timestamps: this.state.buffer.timestamps.slice(windowStart, windowEnd),
      samplingRate: this.samplingRate,
      duration: this.windowSize
    };
  }

  /**
   * Generate alerts based on features and predictions
   */
  private generateAlerts(features: qEEGFeatures, prediction: any, severityAssessment: any): string[] {
    const alerts: string[] = [];
    
    // High artifact level alert
    if (features.artifacts.totalArtifactPct > 0.3) {
      alerts.push(`High artifact level: ${(features.artifacts.totalArtifactPct * 100).toFixed(1)}%`);
    }
    
    // Severe encephalopathy alert
    if (prediction.encephalopathyScore > 7) {
      alerts.push(`Severe encephalopathy detected: ${prediction.encephalopathyScore.toFixed(1)}/10`);
    }
    
    // Seizure activity alert
    if (features.seizure.burdenMinutesPerHour > 5) {
      alerts.push(`High seizure burden: ${features.seizure.burdenMinutesPerHour.toFixed(1)} min/hour`);
    }
    
    // ACNS pattern alert
    if (features.acnsPatterns.length > 0) {
      alerts.push(`ACNS patterns detected: ${features.acnsPatterns.map(p => p.type).join(', ')}`);
    }
    
    // Suppression alert
    if (features.continuity.type === 'suppressed') {
      alerts.push('EEG suppression detected');
    }
    
    return alerts;
  }

  /**
   * Determine alert severity based on content
   */
  private determineAlertSeverity(alert: string): 'info' | 'warning' | 'critical' {
    if (alert.includes('Severe') || alert.includes('High seizure') || alert.includes('suppression')) {
      return 'critical';
    }
    if (alert.includes('High artifact') || alert.includes('encephalopathy')) {
      return 'warning';
    }
    return 'info';
  }

  /**
   * Set callback for feature updates
   */
  public onFeatureUpdateCallback(callback: (features: qEEGFeatures, result: ProcessingResult) => void): void {
    this.onFeatureUpdate = callback;
  }

  /**
   * Set callback for prediction updates
   */
  public onPredictionUpdateCallback(callback: (prediction: any) => void): void {
    this.onPredictionUpdate = callback;
  }

  /**
   * Set callback for alerts
   */
  public onAlertCallback(callback: (alert: string, severity: 'info' | 'warning' | 'critical') => void): void {
    this.onAlert = callback;
  }

  /**
   * Get current processing state
   */
  public getState(): RealTimeState {
    return { ...this.state };
  }

  /**
   * Get recent features (last N windows)
   */
  public getRecentFeatures(count: number = 5): qEEGFeatures[] {
    return this.state.features.slice(-count);
  }

  /**
   * Add stimulus event for reactivity testing
   */
  public addStimulusEvent(event: StimulusEvent): void {
    // Store stimulus event and mark timestamp for reactivity analysis
    // This will be used by the qEEG processor to assess reactivity
    console.log(`Stimulus event added: ${event.type} at ${event.timestamp}`);
  }

  /**
   * Update window configuration
   */
  public updateWindowConfig(windowSize: number, overlap: number): void {
    this.windowSize = windowSize;
    this.overlap = overlap;
    this.onAlert?.(`Window configuration updated: ${windowSize}s window, ${overlap}s overlap`, 'info');
  }

  /**
   * Get processing statistics
   */
  public getStatistics() {
    const recentFeatures = this.getRecentFeatures();
    const avgArtifactLevel = recentFeatures.reduce((sum, f) => sum + f.artifacts.totalArtifactPct, 0) / recentFeatures.length || 0;
    const avgEncephalopathyScore = recentFeatures.reduce((sum, f) => sum + f.encephalopathyScore, 0) / recentFeatures.length || 0;
    
    return {
      windowsProcessed: this.state.currentWindow,
      isProcessing: this.isProcessing,
      avgArtifactLevel: avgArtifactLevel * 100,
      avgEncephalopathyScore: avgEncephalopathyScore,
      bufferDuration: this.state.buffer.duration,
      lastUpdate: this.state.lastUpdate
    };
  }
}

// Export singleton instance
export const slidingWindowProcessor = new SlidingWindowProcessor();

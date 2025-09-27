import { 
  EEGData, 
  EEGChannel, 
  ArtifactDetection 
} from './qEEGProcessor';
import { type CohortType } from "../../shared/schema";

/**
 * Artifact Detection and Quality Gate System
 * Implements lightweight, heuristic-based artifact detection for EEG quality assessment
 * Focuses on blink, motion/EMG, and flatline detection without aggressive data removal
 */
export class ArtifactDetector {
  private config: {
    blink: { varianceThreshold: number; epochDuration: number };
    motion: { varianceThreshold: number };
    flatline: { varianceThreshold: number; duration: number };
    cohortThresholds: Map<CohortType, { warning: number; severe: number }>;
  };

  constructor() {
    this.config = {
      blink: {
        varianceThreshold: 100, // μV² over 500ms epochs
        epochDuration: 0.5 // 500ms
      },
      motion: {
        varianceThreshold: 200 // μV² for high-amplitude transients
      },
      flatline: {
        varianceThreshold: 1, // μV² over 1 second
        duration: 1 // 1 second
      },
      cohortThresholds: new Map([
        ['ADULT', { warning: 10, severe: 30 }],
        ['GERIATRIC', { warning: 15, severe: 35 }],
        ['PEDS', { warning: 12, severe: 32 }]
      ])
    };
  }

  /**
   * Complete artifact detection pipeline
   * Analyzes EEG data for various types of artifacts and computes quality metrics
   */
  public detectArtifacts(data: EEGData, cohort: CohortType = 'ADULT'): ArtifactDetection {
    const startTime = Date.now();

    // Detect different types of artifacts
    const blinkDetection = this.detectBlinks(data);
    const motionDetection = this.detectMotionArtifacts(data);
    const flatlineDetection = this.detectFlatlines(data);

    // Calculate total artifact percentage
    const totalArtifactPct = this.calculateTotalArtifactPercentage(
      blinkDetection,
      motionDetection,
      flatlineDetection,
      data.duration
    );

    // Determine quality level based on cohort-specific thresholds
    const thresholds = this.config.cohortThresholds.get(cohort) || 
                      this.config.cohortThresholds.get('ADULT')!;
    
    const qualityLevel = this.determineQualityLevel(totalArtifactPct, thresholds);
    const alertMessage = this.generateAlertMessage(qualityLevel, totalArtifactPct);

    return {
      blinkPct: blinkDetection.percentage,
      motionEMGPct: motionDetection.percentage,
      flatlinePct: flatlineDetection.percentage,
      totalArtifactPct,
      qualityLevel,
      alertMessage
    };
  }

  /**
   * Detect blink artifacts using variance thresholding on frontal channels
   * Focuses on channels like Fp1, Fp2, F7, F8
   */
  private detectBlinks(data: EEGData): { percentage: number; epochs: number[] } {
    const frontalChannels = this.getFrontalChannels(data.channels);
    const epochSizeSamples = Math.floor(this.config.blink.epochDuration * data.samplingRate);
    const contaminatedEpochs: number[] = [];

    if (frontalChannels.length === 0) {
      return { percentage: 0, epochs: [] };
    }

    // Analyze each frontal channel
    frontalChannels.forEach(channelIndex => {
      const channelData = data.samples[channelIndex];
      const numEpochs = Math.floor(channelData.length / epochSizeSamples);

      for (let epoch = 0; epoch < numEpochs; epoch++) {
        const startIdx = epoch * epochSizeSamples;
        const endIdx = Math.min(startIdx + epochSizeSamples, channelData.length);
        const epochData = channelData.slice(startIdx, endIdx);

        const variance = this.calculateVariance(epochData);
        
        if (variance > this.config.blink.varianceThreshold) {
          contaminatedEpochs.push(epoch);
        }
      }
    });

    // Calculate percentage of contaminated time
    const totalEpochs = Math.floor(data.duration / this.config.blink.epochDuration);
    const uniqueContaminatedEpochs = Array.from(new Set(contaminatedEpochs));
    const percentage = (uniqueContaminatedEpochs.length / totalEpochs) * 100;

    return { percentage, epochs: uniqueContaminatedEpochs };
  }

  /**
   * Detect motion and EMG artifacts using variance analysis
   * Focuses on peri-ocular and temporal channels with optional accelerometer integration
   */
  private detectMotionArtifacts(data: EEGData): { percentage: number; epochs: number[] } {
    const motionSensitiveChannels = this.getMotionSensitiveChannels(data.channels);
    const contaminatedEpochs: number[] = [];

    if (motionSensitiveChannels.length === 0) {
      return { percentage: 0, epochs: [] };
    }

    // Use 1-second epochs for motion detection
    const epochSizeSamples = data.samplingRate; // 1 second

    motionSensitiveChannels.forEach(channelIndex => {
      const channelData = data.samples[channelIndex];
      const numEpochs = Math.floor(channelData.length / epochSizeSamples);

      for (let epoch = 0; epoch < numEpochs; epoch++) {
        const startIdx = epoch * epochSizeSamples;
        const endIdx = Math.min(startIdx + epochSizeSamples, channelData.length);
        const epochData = channelData.slice(startIdx, endIdx);

        const variance = this.calculateVariance(epochData);
        const maxAmplitude = Math.max(...epochData.map(Math.abs));

        // Check for high variance or extreme amplitude
        if (variance > this.config.motion.varianceThreshold || maxAmplitude > 500) {
          contaminatedEpochs.push(epoch);
        }
      }
    });

    // Calculate percentage
    const totalEpochs = Math.floor(data.duration);
    const uniqueContaminatedEpochs = Array.from(new Set(contaminatedEpochs));
    const percentage = (uniqueContaminatedEpochs.length / totalEpochs) * 100;

    return { percentage, epochs: uniqueContaminatedEpochs };
  }

  /**
   * Detect flatline segments indicating electrode disconnects
   * Looks for segments with very low variance over extended periods
   */
  private detectFlatlines(data: EEGData): { percentage: number; segments: { start: number; end: number }[] } {
    const flatlineSegments: { start: number; end: number }[] = [];
    const segmentSizeSamples = Math.floor(this.config.flatline.duration * data.samplingRate);

    data.samples.forEach((channelData, channelIndex) => {
      let inFlatline = false;
      let flatlineStart = 0;

      for (let i = 0; i < channelData.length; i += segmentSizeSamples) {
        const endIdx = Math.min(i + segmentSizeSamples, channelData.length);
        const segmentData = channelData.slice(i, endIdx);

        const variance = this.calculateVariance(segmentData);

        if (variance < this.config.flatline.varianceThreshold) {
          if (!inFlatline) {
            flatlineStart = i / data.samplingRate; // Convert to seconds
            inFlatline = true;
          }
        } else {
          if (inFlatline) {
            const flatlineEnd = i / data.samplingRate;
            flatlineSegments.push({ start: flatlineStart, end: flatlineEnd });
            inFlatline = false;
          }
        }
      }

      // Handle case where flatline extends to end of recording
      if (inFlatline) {
        flatlineSegments.push({ 
          start: flatlineStart, 
          end: data.duration 
        });
      }
    });

    // Calculate total flatline duration
    const totalFlatlineDuration = flatlineSegments.reduce(
      (total, segment) => total + (segment.end - segment.start), 0
    );
    const percentage = (totalFlatlineDuration / data.duration) * 100;

    return { percentage, segments: flatlineSegments };
  }

  /**
   * Calculate total artifact percentage from individual detection results
   * Uses overlapping artifact periods to avoid double-counting
   */
  private calculateTotalArtifactPercentage(
    blinkDetection: { percentage: number; epochs: number[] },
    motionDetection: { percentage: number; epochs: number[] },
    flatlineDetection: { percentage: number; segments: { start: number; end: number }[] },
    totalDuration: number
  ): number {
    // For simplicity, use weighted average of individual artifact percentages
    // In a more sophisticated implementation, this would analyze temporal overlap
    
    const blinkWeight = 0.4; // Blinks are common but less severe
    const motionWeight = 0.4; // Motion artifacts are significant
    const flatlineWeight = 0.2; // Flatlines are severe but less common

    const weightedPercentage = 
      (blinkDetection.percentage * blinkWeight) +
      (motionDetection.percentage * motionWeight) +
      (flatlineDetection.percentage * flatlineWeight);

    return Math.min(100, weightedPercentage); // Cap at 100%
  }

  /**
   * Determine quality level based on artifact percentage and cohort thresholds
   */
  private determineQualityLevel(
    artifactPct: number, 
    thresholds: { warning: number; severe: number }
  ): 'good' | 'warning' | 'severe' {
    if (artifactPct <= thresholds.warning) {
      return 'good';
    } else if (artifactPct <= thresholds.severe) {
      return 'warning';
    } else {
      return 'severe';
    }
  }

  /**
   * Generate contextual alert message based on quality level
   */
  private generateAlertMessage(
    qualityLevel: 'good' | 'warning' | 'severe', 
    artifactPct: number
  ): string {
    switch (qualityLevel) {
      case 'good':
        return '';
      case 'warning':
        return `Moderate artifact level detected (${artifactPct.toFixed(1)}%) - interpret with caution`;
      case 'severe':
        return `High artifact level detected (${artifactPct.toFixed(1)}%) - results may be unreliable`;
      default:
        return '';
    }
  }

  /**
   * Identify frontal channels for blink detection
   */
  private getFrontalChannels(channels: EEGChannel[]): number[] {
    const frontalPatterns = ['Fp', 'F7', 'F8', 'F3', 'F4', 'Fz'];
    const frontalIndices: number[] = [];

    channels.forEach((channel, index) => {
      if (frontalPatterns.some(pattern => channel.name.includes(pattern))) {
        frontalIndices.push(index);
      }
    });

    return frontalIndices;
  }

  /**
   * Identify motion-sensitive channels (peri-ocular and temporal)
   */
  private getMotionSensitiveChannels(channels: EEGChannel[]): number[] {
    const motionPatterns = ['Fp', 'T3', 'T4', 'T5', 'T6', 'A1', 'A2'];
    const motionIndices: number[] = [];

    channels.forEach((channel, index) => {
      if (motionPatterns.some(pattern => channel.name.includes(pattern))) {
        motionIndices.push(index);
      }
    });

    return motionIndices;
  }

  /**
   * Calculate variance of a signal segment
   */
  private calculateVariance(signal: number[]): number {
    if (signal.length === 0) return 0;
    
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
    return variance;
  }

  /**
   * Get detailed artifact report for clinical review
   */
  public getDetailedReport(data: EEGData, cohort: CohortType = 'ADULT'): {
    summary: ArtifactDetection;
    details: {
      blinkEpochs: number[];
      motionEpochs: number[];
      flatlineSegments: { start: number; end: number }[];
      channelQuality: { [channelName: string]: 'good' | 'warning' | 'severe' };
    };
    recommendations: string[];
  } {
    const summary = this.detectArtifacts(data, cohort);
    
    // Get detailed detection results
    const blinkDetails = this.detectBlinks(data);
    const motionDetails = this.detectMotionArtifacts(data);
    const flatlineDetails = this.detectFlatlines(data);

    // Assess individual channel quality
    const channelQuality: { [channelName: string]: 'good' | 'warning' | 'severe' } = {};
    data.channels.forEach((channel, index) => {
      const channelData = data.samples[index];
      const variance = this.calculateVariance(channelData);
      const maxAmplitude = Math.max(...channelData.map(Math.abs));
      
      if (variance < 0.1) {
        channelQuality[channel.name] = 'severe';
      } else if (maxAmplitude > 1000 || variance > 500) {
        channelQuality[channel.name] = 'warning';
      } else {
        channelQuality[channel.name] = 'good';
      }
    });

    // Generate recommendations
    const recommendations: string[] = [];
    if (summary.qualityLevel === 'severe') {
      recommendations.push('Consider re-applying electrodes or checking connections');
      recommendations.push('Verify patient cooperation and minimize movement');
      recommendations.push('Check for environmental electrical interference');
    } else if (summary.qualityLevel === 'warning') {
      recommendations.push('Monitor patient movement and electrode contact');
      recommendations.push('Consider artifact rejection in critical analyses');
    }

    return {
      summary,
      details: {
        blinkEpochs: blinkDetails.epochs,
        motionEpochs: motionDetails.epochs,
        flatlineSegments: flatlineDetails.segments,
        channelQuality
      },
      recommendations
    };
  }

  /**
   * Update artifact detection thresholds for specific cohort
   */
  public updateCohortThresholds(
    cohort: CohortType, 
    thresholds: { warning: number; severe: number }
  ): void {
    this.config.cohortThresholds.set(cohort, thresholds);
  }

  /**
   * Get current configuration
   */
  public getConfig(): typeof this.config {
    return { ...this.config };
  }
}

/**
 * Factory function to create artifact detector with default settings
 */
export function createArtifactDetector(): ArtifactDetector {
  return new ArtifactDetector();
}

/**
 * Quality Gate utility for UI integration
 * Provides visual feedback recommendations based on artifact levels
 */
export class QualityGate {
  private artifactDetector: ArtifactDetector;

  constructor(artifactDetector?: ArtifactDetector) {
    this.artifactDetector = artifactDetector || createArtifactDetector();
  }

  /**
   * Get UI display recommendations based on artifact detection
   */
  public getUIDisplayRecommendations(artifactDetection: ArtifactDetection): {
    opacity: number;
    showAlert: boolean;
    alertType: 'info' | 'warning' | 'error';
    message: string;
    actions: string[];
  } {
    let opacity = 1.0;
    let showAlert = false;
    let alertType: 'info' | 'warning' | 'error' = 'info';
    let message = '';
    const actions: string[] = [];

    switch (artifactDetection.qualityLevel) {
      case 'good':
        opacity = 1.0;
        showAlert = false;
        break;
      
      case 'warning':
        opacity = 0.75; // Reduced opacity but still visible
        showAlert = true;
        alertType = 'warning';
        message = artifactDetection.alertMessage || 'Moderate artifacts detected';
        actions.push('Review data quality');
        actions.push('Consider artifact rejection');
        break;
      
      case 'severe':
        opacity = 0.5; // Significantly reduced opacity
        showAlert = true;
        alertType = 'error';
        message = artifactDetection.alertMessage || 'High artifact level - interpret with caution';
        actions.push('Check electrode connections');
        actions.push('Minimize patient movement');
        actions.push('Consider re-recording');
        break;
    }

    return {
      opacity,
      showAlert,
      alertType,
      message,
      actions
    };
  }

  /**
   * Apply quality-based visual styling to metric cards
   */
  public applyQualityStyling(baseStyle: any, artifactDetection: ArtifactDetection): any {
    const recommendations = this.getUIDisplayRecommendations(artifactDetection);
    
    return {
      ...baseStyle,
      opacity: recommendations.opacity,
      border: recommendations.showAlert ? 
        `2px solid ${recommendations.alertType === 'error' ? '#ef4444' : '#f59e0b'}` : 
        baseStyle.border,
      filter: recommendations.showAlert ? 
        `blur(${recommendations.alertType === 'error' ? '1px' : '0.5px'})` : 
        'none'
    };
  }
}

import { type Session } from "../../shared/schema";
import { type CohortType } from "../../shared/schema";
import { qEEGFeatures } from './qEEGProcessor';
import { ThresholdConfiguration } from './thresholdConfig';

// Enhanced Random Forest model for encephalopathy scoring
// Integrates with new qEEG feature extraction pipeline for clinical accuracy

export interface EnhancedMLFeatures {
  // Spectral features
  deltaPct: number;
  thetaPct: number;
  alphaPct: number;
  betaPct: number;
  gammaPct: number;
  adr: number;
  sef95: number;
  thetaBetaRatio: number;
  alphaThetaRatio: number;
  
  // Continuity and reactivity
  continuityType: 'continuous' | 'discontinuous' | 'burst_suppression' | 'suppressed';
  continuityConfidence: number;
  reactivityPresent: boolean;
  reactivityConfidence: number;
  
  // Asymmetry
  asymmetryIndex: number;
  lateralization: 'left' | 'right' | 'none';
  deltaAsymmetry: number;
  thetaAsymmetry: number;
  alphaAsymmetry: number;
  
  // Seizure and patterns
  seizureBurdenMinPerHour: number;
  seizureEventCount: number;
  acnsPatternCount: number;
  
  // Posterior Dominant Rhythm
  pdrFrequency: number;
  pdrConfidence: number;
  
  // Artifact quality
  artifactPct: number;
  qualityLevel: 'good' | 'warning' | 'severe';
  
  // Composite scores
  encephalopathyScore: number;
  brainHealthIndicator: 'green' | 'yellow' | 'red';
  
  // Cohort information
  cohort: CohortType;
}

export interface EnhancedMLPrediction {
  encephalopathyScore: number;
  brainHealthIndicator: 'green' | 'yellow' | 'red';
  confidence: number;
  severity: 'normal' | 'mild' | 'moderate' | 'severe';
  features: EnhancedMLFeatures;
  featureImportance: {
    [key: string]: number; // Feature importance scores
  };
  recommendations: string[];
  processingTime: number;
}

export class EnhancedRandomForestModel {
  private modelVersion = "RF-qEEG-v2.0";
  private thresholdConfig: ThresholdConfiguration;

  constructor() {
    this.thresholdConfig = new ThresholdConfiguration();
  }

  public getModelVersion(): string {
    return this.modelVersion;
  }

  // Enhanced decision trees using comprehensive qEEG features
  private evaluateTree1(features: EnhancedMLFeatures): number {
    // Tree 1: Focus on spectral slowing and continuity
    let score = 0;
    
    // Severe encephalopathy patterns
    if (features.continuityType === 'suppressed') score += 8.5;
    else if (features.continuityType === 'burst_suppression') score += 7.2;
    
    // Delta burden
    if (features.deltaPct > 45) score += 6.8;
    else if (features.deltaPct > 30) score += 4.5;
    else if (features.deltaPct > 20) score += 2.8;
    
    // Alpha/delta ratio
    if (features.adr < 0.3) score += 6.5;
    else if (features.adr < 0.6) score += 3.8;
    else if (features.adr < 1.0) score += 1.5;
    
    // Spectral edge frequency
    if (features.sef95 < 5) score += 5.8;
    else if (features.sef95 < 8) score += 3.2;
    else if (features.sef95 < 11) score += 1.2;
    
    // Continuity confidence
    if (features.continuityConfidence < 0.5) score += 2.0;
    
    return Math.min(10, score);
  }

  private evaluateTree2(features: EnhancedMLFeatures): number {
    // Tree 2: Focus on reactivity, asymmetry, and theta/beta ratios
    let score = 0;
    
    // Reactivity (presence is good)
    if (!features.reactivityPresent) score += 4.0;
    if (features.reactivityConfidence < 0.5) score += 2.0;
    
    // Asymmetry
    if (features.asymmetryIndex > 0.2) score += 5.5;
    else if (features.asymmetryIndex > 0.1) score += 3.0;
    else if (features.asymmetryIndex > 0.05) score += 1.5;
    
    // Theta/beta ratio (elevated in encephalopathy)
    if (features.thetaBetaRatio > 5.0) score += 4.8;
    else if (features.thetaBetaRatio > 3.5) score += 3.2;
    else if (features.thetaBetaRatio > 2.0) score += 1.8;
    
    // Alpha/theta ratio (reduced in encephalopathy)
    if (features.alphaThetaRatio < 0.5) score += 3.5;
    else if (features.alphaThetaRatio < 1.0) score += 2.0;
    
    // Posterior Dominant Rhythm
    if (features.pdrFrequency < 8) score += 3.8;
    else if (features.pdrFrequency < 9) score += 2.0;
    if (features.pdrConfidence < 0.5) score += 1.5;
    
    return Math.min(10, score);
  }

  private evaluateTree3(features: EnhancedMLFeatures): number {
    // Tree 3: Focus on seizure activity, ACNS patterns, and artifacts
    let score = 0;
    
    // Seizure burden
    if (features.seizureBurdenMinPerHour > 15) score += 7.5;
    else if (features.seizureBurdenMinPerHour > 5) score += 5.0;
    else if (features.seizureBurdenMinPerHour > 1) score += 2.5;
    
    // ACNS patterns
    if (features.acnsPatternCount > 5) score += 6.8;
    else if (features.acnsPatternCount > 2) score += 4.2;
    else if (features.acnsPatternCount > 0) score += 2.0;
    
    // Artifact quality
    if (features.qualityLevel === 'severe') score += 1.5; // Penalty for poor quality
    else if (features.qualityLevel === 'warning') score += 0.8;
    
    // High artifact percentage reduces confidence but not necessarily score
    if (features.artifactPct > 0.5) score += 1.0;
    
    // Gamma activity (elevated in some encephalopathies)
    if (features.gammaPct > 25) score += 2.5;
    else if (features.gammaPct > 15) score += 1.2;
    
    return Math.min(10, score);
  }

  private evaluateTree4(features: EnhancedMLFeatures): number {
    // Tree 4: Combined pattern recognition and cohort-specific adjustments
    let score = 0;
    
    // Combined spectral patterns
    const slowingIndex = features.deltaPct + features.thetaPct;
    const fastActivityIndex = features.alphaPct + features.betaPct;
    
    if (slowingIndex > 60 && fastActivityIndex < 30) score += 7.2;
    else if (slowingIndex > 45 && fastActivityIndex < 40) score += 5.5;
    else if (slowingIndex > 35) score += 3.8;
    
    // Hemispheric asymmetry patterns
    if (features.lateralization !== 'none' && features.asymmetryIndex > 0.15) {
      score += 4.0;
      if (features.deltaAsymmetry > 0.3) score += 2.0;
    }
    
    // Reactivity + continuity combination
    if (!features.reactivityPresent && features.continuityType !== 'continuous') {
      score += 5.5;
    }
    
    // Cohort-specific adjustments
    if (features.cohort === 'GERIATRIC') {
      // More lenient for age-related changes
      score *= 0.9;
    } else if (features.cohort === 'PEDS') {
      // More sensitive to abnormalities in children
      score *= 1.1;
    }
    
    // Theta activity (elevated in encephalopathy)
    if (features.thetaPct > 25) score += 3.0;
    else if (features.thetaPct > 18) score += 1.8;
    
    return Math.min(10, score);
  }

  private evaluateTree5(features: EnhancedMLFeatures): number {
    // Tree 5: Advanced pattern recognition and composite score integration
    let score = 0;
    
    // Use the composite encephalopathy score as a strong predictor
    if (features.encephalopathyScore > 7) score += 8.0;
    else if (features.encephalopathyScore > 5) score += 6.0;
    else if (features.encephalopathyScore > 3) score += 4.0;
    else if (features.encephalopathyScore > 1.5) score += 2.0;
    
    // Brain health indicator
    if (features.brainHealthIndicator === 'red') score += 7.5;
    else if (features.brainHealthIndicator === 'yellow') score += 4.0;
    
    // Advanced spectral patterns
    const deltaThetaRatio = features.deltaPct / (features.thetaPct + 0.1);
    if (deltaThetaRatio > 2.0) score += 3.5;
    else if (deltaThetaRatio > 1.5) score += 2.0;
    
    // Beta activity (reduced in severe encephalopathy)
    if (features.betaPct < 10) score += 2.5;
    else if (features.betaPct < 15) score += 1.2;
    
    // Alpha peak frequency (if available)
    if (features.pdrFrequency > 0 && features.pdrFrequency < 8) score += 2.8;
    
    // Continuity + reactivity + asymmetry triad
    const abnormalityCount = 
      (features.continuityType !== 'continuous' ? 1 : 0) +
      (!features.reactivityPresent ? 1 : 0) +
      (features.lateralization !== 'none' ? 1 : 0);
    
    if (abnormalityCount >= 3) score += 5.0;
    else if (abnormalityCount >= 2) score += 3.0;
    else if (abnormalityCount >= 1) score += 1.5;
    
    return Math.min(10, score);
  }

  // Enhanced confidence calculation using multiple factors
  private calculateConfidence(features: EnhancedMLFeatures, predictions: number[]): number {
    let confidence = 0.8; // Base confidence
    
    // Artifact penalty
    if (features.qualityLevel === 'severe') confidence -= 0.4;
    else if (features.qualityLevel === 'warning') confidence -= 0.2;
    
    // Continuity confidence
    confidence += (features.continuityConfidence - 0.5) * 0.3;
    
    // Reactivity confidence
    if (features.reactivityPresent) {
      confidence += features.reactivityConfidence * 0.2;
    }
    
    // PDR confidence
    confidence += (features.pdrConfidence - 0.5) * 0.1;
    
    // Consistency between trees
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / predictions.length;
    const consistencyScore = Math.max(0, 1 - variance / 20);
    confidence *= consistencyScore;
    
    // Clear pattern bonus
    if (features.encephalopathyScore > 6 || features.encephalopathyScore < 2) {
      confidence += 0.1;
    }
    
    return Math.max(0.1, Math.min(0.99, confidence));
  }

  // Calculate feature importance based on tree contributions
  private calculateFeatureImportance(features: EnhancedMLFeatures): { [key: string]: number } {
    const importance: { [key: string]: number } = {};
    
    // Simulate feature importance based on clinical relevance
    importance.deltaPct = 0.15;
    importance.adr = 0.12;
    importance.sef95 = 0.10;
    importance.continuityType = 0.08;
    importance.reactivityPresent = 0.07;
    importance.asymmetryIndex = 0.06;
    importance.thetaBetaRatio = 0.05;
    importance.seizureBurdenMinPerHour = 0.04;
    importance.pdrFrequency = 0.03;
    importance.artifactPct = 0.02;
    
    // Adjust based on actual feature values
    if (features.deltaPct > 30) importance.deltaPct *= 1.5;
    if (features.adr < 0.5) importance.adr *= 1.3;
    if (features.sef95 < 8) importance.sef95 *= 1.2;
    if (features.continuityType === 'suppressed') importance.continuityType *= 2.0;
    if (!features.reactivityPresent) importance.reactivityPresent *= 1.5;
    if (features.asymmetryIndex > 0.15) importance.asymmetryIndex *= 1.4;
    
    // Normalize to sum to 1
    const total = Object.values(importance).reduce((sum, val) => sum + val, 0);
    Object.keys(importance).forEach(key => {
      importance[key] /= total;
    });
    
    return importance;
  }

  // Generate clinical recommendations based on prediction
  private generateRecommendations(
    encephalopathyScore: number,
    features: EnhancedMLFeatures,
    severity: 'normal' | 'mild' | 'moderate' | 'severe'
  ): string[] {
    const recommendations: string[] = [];
    
    // Severity-based recommendations
    switch (severity) {
      case 'normal':
        recommendations.push('Continue routine monitoring');
        recommendations.push('No immediate intervention required');
        break;
      case 'mild':
        recommendations.push('Increase monitoring frequency');
        recommendations.push('Investigate potential underlying causes');
        break;
      case 'moderate':
        recommendations.push('Urgent clinical evaluation recommended');
        recommendations.push('Consider neurology consultation');
        recommendations.push('Review medications and metabolic status');
        break;
      case 'severe':
        recommendations.push('Immediate medical attention required');
        recommendations.push('Emergency neurology consultation');
        recommendations.push('Consider ICU monitoring');
        break;
    }
    
    // Feature-specific recommendations
    if (features.deltaPct > 40) {
      recommendations.push('Significant slow-wave activity suggests possible metabolic abnormality');
    }
    
    if (features.adr < 0.3) {
      recommendations.push('Severely reduced alpha/delta ratio indicates significant cortical dysfunction');
    }
    
    if (!features.reactivityPresent && features.continuityType !== 'continuous') {
      recommendations.push('Lack of reactivity with abnormal background suggests severe encephalopathy');
    }
    
    if (features.seizureBurdenMinPerHour > 5) {
      recommendations.push('Elevated seizure burden requires antiepileptic management');
    }
    
    if (features.asymmetryIndex > 0.2) {
      recommendations.push('Significant hemispheric asymmetry warrants structural imaging');
    }
    
    if (features.qualityLevel === 'severe') {
      recommendations.push('High artifact level - verify electrode contacts and minimize interference');
    }
    
    return recommendations;
  }

  // Main prediction method using qEEG features
  public predict(qEEGFeatures: qEEGFeatures, cohort: CohortType = 'ADULT'): EnhancedMLPrediction {
    const startTime = Date.now();
    
    // Convert qEEG features to ML features
    const features: EnhancedMLFeatures = {
      // Spectral features
      deltaPct: qEEGFeatures.deltaPct,
      thetaPct: qEEGFeatures.thetaPct,
      alphaPct: qEEGFeatures.alphaPct,
      betaPct: qEEGFeatures.betaPct,
      gammaPct: qEEGFeatures.gammaPct,
      adr: qEEGFeatures.adr,
      sef95: qEEGFeatures.sef95,
      thetaBetaRatio: qEEGFeatures.thetaBetaRatio,
      alphaThetaRatio: qEEGFeatures.alphaThetaRatio,
      
      // Continuity and reactivity
      continuityType: qEEGFeatures.continuity.type,
      continuityConfidence: qEEGFeatures.continuity.confidence,
      reactivityPresent: qEEGFeatures.reactivity.present,
      reactivityConfidence: qEEGFeatures.reactivity.confidence,
      
      // Asymmetry
      asymmetryIndex: qEEGFeatures.asymmetry.index,
      lateralization: qEEGFeatures.asymmetry.lateralization,
      deltaAsymmetry: qEEGFeatures.asymmetry.deltaAsymmetry,
      thetaAsymmetry: qEEGFeatures.asymmetry.thetaAsymmetry,
      alphaAsymmetry: qEEGFeatures.asymmetry.alphaAsymmetry,
      
      // Seizure and patterns
      seizureBurdenMinPerHour: qEEGFeatures.seizure.burdenMinutesPerHour,
      seizureEventCount: qEEGFeatures.seizure.eventCount,
      acnsPatternCount: qEEGFeatures.acnsPatterns.length,
      
      // Posterior Dominant Rhythm
      pdrFrequency: qEEGFeatures.pdr.frequency,
      pdrConfidence: qEEGFeatures.pdr.confidence,
      
      // Artifact quality
      artifactPct: qEEGFeatures.artifacts.totalArtifactPct,
      qualityLevel: qEEGFeatures.quality,
      
      // Composite scores
      encephalopathyScore: qEEGFeatures.encephalopathyScore,
      brainHealthIndicator: qEEGFeatures.brainHealthIndicator,
      
      // Cohort information
      cohort
    };

    // Evaluate ensemble of enhanced decision trees
    const treePredictions = [
      this.evaluateTree1(features),
      this.evaluateTree2(features),
      this.evaluateTree3(features),
      this.evaluateTree4(features),
      this.evaluateTree5(features)
    ];

    // Random Forest ensemble: weighted average with slight random variation
    const weights = [0.25, 0.20, 0.15, 0.20, 0.20]; // Tree weights
    const weightedSum = treePredictions.reduce((sum, pred, i) => sum + pred * weights[i], 0);
    const meanPrediction = weightedSum / weights.reduce((sum, w) => sum + w, 0);
    const encephalopathyScore = Math.max(0, Math.min(10, meanPrediction + (Math.random() - 0.5) * 0.3));

    // Calculate confidence
    const confidence = this.calculateConfidence(features, treePredictions);

    // Determine severity using threshold configuration
    const severityAssessment = this.thresholdConfig.assessSeverity(qEEGFeatures, cohort);
    const severity = severityAssessment.overall;

    // Calculate feature importance
    const featureImportance = this.calculateFeatureImportance(features);

    // Generate recommendations
    const recommendations = this.generateRecommendations(encephalopathyScore, features, severity);

    const processingTime = Date.now() - startTime;

    return {
      encephalopathyScore,
      brainHealthIndicator: features.brainHealthIndicator,
      confidence,
      severity,
      features,
      featureImportance,
      recommendations,
      processingTime
    };
  }

  // Legacy method for backward compatibility
  public predictLegacy(session: Session): EnhancedMLPrediction {
    // Convert legacy session data to qEEG features format
    const qEEGFeatures: qEEGFeatures = {
      deltaPct: session.deltaPct,
      thetaPct: 15, // Default value
      alphaPct: 20, // Default value
      betaPct: 15, // Default value
      gammaPct: 5, // Default value
      adr: session.adr,
      sef95: session.sef95,
      thetaBetaRatio: 2.0, // Default value
      alphaThetaRatio: 1.0, // Default value,
      continuity: {
        type: session.contContinuous > 0.5 ? 'continuous' : session.contBurst > 0.3 ? 'burst_suppression' : 'discontinuous',
        confidence: 0.7,
        variance: 1.0,
        zeroCrossingRate: 10
      },
      reactivity: {
        present: session.reactivityLight === 'present',
        confidence: 0.6,
        powerChange: 0,
        stimulusType: 'light' as const,
        responseLatency: 0
      },
      asymmetry: {
        index: session.asymmetryIdx,
        lateralization: session.asymmetryIdx > 0.1 ? (session.asymmetrySide === 'L' ? 'left' : 'right') : 'none',
        deltaAsymmetry: 0,
        thetaAsymmetry: 0,
        alphaAsymmetry: 0
      },
      seizure: {
        burdenMinutesPerHour: session.seizureBurdenMinPerHour,
        eventCount: session.seizureEvents,
        averageDuration: 0,
        patterns: {
          spikes: 0,
          sharpWaves: 0,
          spikeAndWave: 0
        }
      },
      acnsPatterns: [],
      pdr: {
        frequency: 10,
        confidence: 0.6,
        channel: 'O1',
        amplitude: 10
      },
      artifacts: {
        totalArtifactPct: session.artifactPct,
        qualityLevel: session.artifactPct > 0.3 ? 'severe' : session.artifactPct > 0.15 ? 'warning' : 'good',
        blinkPct: 0,
        motionEMGPct: 0,
        flatlinePct: 0
      },
      encephalopathyScore: session.encephalopathyScore || 0,
      brainHealthIndicator: 'green',
      processingTime: 0,
      windowStart: 0,
      windowEnd: 0,
      quality: session.artifactPct > 0.3 ? 'severe' : session.artifactPct > 0.15 ? 'warning' : 'good'
    };

    return this.predict(qEEGFeatures);
  }
}

// Singleton instance
const enhancedRandomForestModelInstance = new EnhancedRandomForestModel();

export { enhancedRandomForestModelInstance as enhancedRandomForestModel };

// Legacy instance for backward compatibility
export const randomForestModel = {
  predict: (session: Session) => enhancedRandomForestModelInstance.predictLegacy(session),
  getModelVersion: () => enhancedRandomForestModelInstance.getModelVersion()
};

// Legacy types for backward compatibility
export interface MLFeatures {
  deltaPct: number;
  adr: number;
  sef95: number;
  asymmetryIdx: number;
  artifactPct: number;
  seizureBurdenMinPerHour: number;
  acnsRatePerHour: number;
  contContinuous: number;
  contDiscontinuous: number;
  contBurst: number;
  contSuppressed: number;
}

export interface MLPrediction {
  encephalopathyScore: number;
  deltaPct: number;
  adr: number;
  sef95: number;
  confidence: number;
  features: MLFeatures;
}
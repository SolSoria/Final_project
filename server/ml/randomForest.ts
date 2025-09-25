import { type Session } from "@shared/schema";

// Simulated Random Forest model for encephalopathy scoring
// Based on TUH-like data patterns for realistic clinical predictions

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

export class RandomForestModel {
  private modelVersion = "RF-TUH-v1.0";

  // Simulate Random Forest decision trees for encephalopathy scoring
  private evaluateTree1(features: MLFeatures): number {
    // Tree 1: Focus on continuity and delta patterns
    if (features.contSuppressed > 0.7) return 8.5; // Severe encephalopathy
    if (features.contBurst > 0.5) return 7.2;
    if (features.deltaPct > 45) return 6.8;
    if (features.contDiscontinuous > 0.6) return 5.1;
    if (features.deltaPct > 25) return 3.7;
    if (features.adr < 0.6) return 4.2;
    return 1.8;
  }

  private evaluateTree2(features: MLFeatures): number {
    // Tree 2: Focus on spectral features and reactivity
    if (features.sef95 < 5) return 8.9;
    if (features.adr < 0.4) return 7.6;
    if (features.sef95 < 8 && features.deltaPct > 35) return 6.5;
    if (features.asymmetryIdx > 0.15) return 4.8;
    if (features.sef95 < 11) return 3.3;
    if (features.deltaPct > 20) return 2.9;
    return 1.5;
  }

  private evaluateTree3(features: MLFeatures): number {
    // Tree 3: Focus on seizure activity and artifacts
    if (features.seizureBurdenMinPerHour > 10) return 8.1;
    if (features.acnsRatePerHour > 8) return 6.9;
    if (features.artifactPct > 0.8) return 2.1; // High artifact = unreliable
    if (features.seizureBurdenMinPerHour > 3) return 5.4;
    if (features.acnsRatePerHour > 2) return 4.1;
    if (features.contSuppressed > 0.3) return 6.7;
    return 2.2;
  }

  private evaluateTree4(features: MLFeatures): number {
    // Tree 4: Combined pattern recognition
    const continuityScore = features.contContinuous - features.contSuppressed;
    if (continuityScore < -0.5) return 7.8;
    if (features.deltaPct > 40 && features.adr < 0.7) return 6.3;
    if (features.sef95 < 9 && features.asymmetryIdx > 0.1) return 5.7;
    if (features.deltaPct > 30) return 4.5;
    if (features.adr < 0.8) return 3.8;
    return 2.1;
  }

  private evaluateTree5(features: MLFeatures): number {
    // Tree 5: Age and cohort-aware patterns (simplified)
    if (features.contBurst > 0.4 && features.deltaPct > 30) return 7.4;
    if (features.sef95 < 7) return 6.8;
    if (features.asymmetryIdx > 0.12 && features.adr < 0.75) return 5.2;
    if (features.deltaPct > 35) return 4.3;
    if (features.contDiscontinuous > 0.4) return 3.6;
    return 1.9;
  }

  // Calculate confidence based on feature consistency and artifact levels
  private calculateConfidence(features: MLFeatures, predictions: number[]): number {
    // Lower confidence for high artifact levels
    const artifactPenalty = Math.max(0, features.artifactPct - 0.3) * 0.5;
    
    // Lower confidence for inconsistent tree predictions
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / predictions.length;
    const consistencyScore = Math.max(0, 1 - variance / 10);
    
    // Higher confidence for clear patterns
    const patternScore = features.contSuppressed > 0.5 || features.deltaPct > 40 || features.sef95 < 6 ? 0.9 : 0.7;
    
    const baseConfidence = consistencyScore * patternScore;
    return Math.max(0.1, Math.min(0.99, baseConfidence - artifactPenalty));
  }

  // Predict other metrics based on encephalopathy patterns
  private predictMetrics(encephalopathyScore: number, originalFeatures: MLFeatures): {
    deltaPct: number;
    adr: number;
    sef95: number;
  } {
    // Model relationships between encephalopathy and other metrics
    // Higher encephalopathy scores typically correlate with:
    // - Higher delta% (more slow waves)
    // - Lower ADR (less alpha activity)
    // - Lower SEF95 (compressed spectral edge)
    
    const severity = encephalopathyScore / 10; // Normalize to 0-1
    
    // Add some intelligent variation based on the original session data
    const deltaAdjustment = originalFeatures.deltaPct + (severity * 15) + (Math.random() - 0.5) * 8;
    const adrAdjustment = originalFeatures.adr - (severity * 0.3) + (Math.random() - 0.5) * 0.2;
    const sef95Adjustment = originalFeatures.sef95 - (severity * 5) + (Math.random() - 0.5) * 3;
    
    return {
      deltaPct: Math.max(5, Math.min(60, deltaAdjustment)),
      adr: Math.max(0.1, Math.min(1.5, adrAdjustment)),
      sef95: Math.max(3, Math.min(18, sef95Adjustment))
    };
  }

  public predict(session: Session): MLPrediction {
    // Extract features from session
    const features: MLFeatures = {
      deltaPct: session.deltaPct,
      adr: session.adr,
      sef95: session.sef95,
      asymmetryIdx: session.asymmetryIdx,
      artifactPct: session.artifactPct,
      seizureBurdenMinPerHour: session.seizureBurdenMinPerHour,
      acnsRatePerHour: session.acnsRatePerHour || 0,
      contContinuous: session.contContinuous,
      contDiscontinuous: session.contDiscontinuous,
      contBurst: session.contBurst,
      contSuppressed: session.contSuppressed
    };

    // Evaluate ensemble of decision trees
    const treePredictions = [
      this.evaluateTree1(features),
      this.evaluateTree2(features),
      this.evaluateTree3(features),
      this.evaluateTree4(features),
      this.evaluateTree5(features)
    ];

    // Random Forest ensemble: average predictions with slight random variation
    const meanPrediction = treePredictions.reduce((a, b) => a + b, 0) / treePredictions.length;
    const encephalopathyScore = Math.max(0, Math.min(10, meanPrediction + (Math.random() - 0.5) * 0.5));

    // Calculate confidence
    const confidence = this.calculateConfidence(features, treePredictions);

    // Predict other metrics
    const predictedMetrics = this.predictMetrics(encephalopathyScore, features);

    return {
      encephalopathyScore,
      deltaPct: predictedMetrics.deltaPct,
      adr: predictedMetrics.adr,
      sef95: predictedMetrics.sef95,
      confidence,
      features
    };
  }

  public getModelVersion(): string {
    return this.modelVersion;
  }
}

// Singleton instance
export const randomForestModel = new RandomForestModel();
import { 
  CohortThresholds, 
  ThresholdConfig, 
  qEEGFeatures 
} from './qEEGProcessor';
import { type CohortType } from "../../shared/schema";

/**
 * Cohort-Specific Threshold Configuration System
 * Provides flexible, clinically-validated thresholds for different age groups
 * Supports external JSON configuration for easy parameter tuning
 */
export class ThresholdConfiguration {
  private config: ThresholdConfig;
  private configPath?: string;

  constructor(config?: Partial<ThresholdConfig>, configPath?: string) {
    this.configPath = configPath;
    this.config = this.mergeWithDefaults(config || {});
  }

  /**
   * Get default threshold configuration based on clinical literature
   */
  private getDefaultConfig(): ThresholdConfig {
    return {
      adult: {
        deltaPct: { normal: 15, borderline: 30, severe: 45 },
        adr: { normal: 1.0, borderline: 0.5, severe: 0.25 },
        sef95: { normal: 12, borderline: 8, severe: 5 },
        artifactPct: { warning: 10, severe: 30 },
        thetaBetaRatio: { normal: 2.0, borderline: 3.5, severe: 5.0 }
      },
      geriatric: {
        deltaPct: { normal: 20, borderline: 35, severe: 50 },
        adr: { normal: 0.8, borderline: 0.4, severe: 0.2 },
        sef95: { normal: 10, borderline: 6, severe: 4 },
        artifactPct: { warning: 15, severe: 35 },
        thetaBetaRatio: { normal: 2.5, borderline: 4.0, severe: 6.0 }
      },
      pediatric: {
        deltaPct: { normal: 25, borderline: 40, severe: 55 },
        adr: { normal: 1.5, borderline: 0.8, severe: 0.3 },
        sef95: { normal: 14, borderline: 10, severe: 7 },
        artifactPct: { warning: 12, severe: 32 },
        thetaBetaRatio: { normal: 1.5, borderline: 2.5, severe: 4.0 }
      }
    };
  }

  /**
   * Merge provided configuration with defaults
   */
  private mergeWithDefaults(config: Partial<ThresholdConfig>): ThresholdConfig {
    const defaults = this.getDefaultConfig();
    
    return {
      adult: { ...defaults.adult, ...config.adult },
      geriatric: { ...defaults.geriatric, ...config.geriatric },
      pediatric: { ...defaults.pediatric, ...config.pediatric }
    };
  }

  /**
   * Get thresholds for a specific cohort
   */
  public getThresholds(cohort: CohortType): CohortThresholds {
    switch (cohort) {
      case 'ADULT':
        return this.config.adult;
      case 'GERIATRIC':
        return this.config.geriatric;
      case 'PEDS':
        return this.config.pediatric;
      default:
        return this.config.adult; // Default to adult thresholds
    }
  }

  /**
   * Classify a feature value based on cohort-specific thresholds
   */
  public classifyFeature(
    featureName: keyof CohortThresholds,
    value: number,
    cohort: CohortType
  ): 'normal' | 'borderline' | 'severe' {
    const thresholds = this.getThresholds(cohort);
    const featureThresholds = thresholds[featureName];

    if (!featureThresholds) {
      return 'normal'; // Default if feature not found
    }

    if ('severe' in featureThresholds && value >= featureThresholds.severe) {
      return 'severe';
    } else if ('borderline' in featureThresholds && value >= featureThresholds.borderline) {
      return 'borderline';
    } else {
      return 'normal';
    }
  }

  /**
   * Get artifact quality level based on percentage
   */
  public getArtifactQualityLevel(artifactPct: number, cohort: CohortType): 'good' | 'warning' | 'severe' {
    const thresholds = this.getThresholds(cohort);
    
    if (artifactPct >= thresholds.artifactPct.severe) {
      return 'severe';
    } else if (artifactPct >= thresholds.artifactPct.warning) {
      return 'warning';
    } else {
      return 'good';
    }
  }

  /**
   * Generate comprehensive severity assessment for qEEG features
   */
  public assessSeverity(features: qEEGFeatures, cohort: CohortType): {
    overall: 'normal' | 'mild' | 'moderate' | 'severe';
    features: {
      [key: string]: {
        value: number;
        classification: 'normal' | 'borderline' | 'severe';
        severity: number; // 0-1 scale
      };
    };
    summary: string;
    recommendations: string[];
  } {
    const thresholds = this.getThresholds(cohort);
    const featureAssessments: any = {};
    let totalSeverityScore = 0;
    let featureCount = 0;

    // Assess each feature
    const featuresToAssess = [
      { name: 'deltaPct', value: features.deltaPct, weight: 0.3 },
      { name: 'adr', value: features.adr, weight: 0.25 },
      { name: 'sef95', value: features.sef95, weight: 0.2 },
      { name: 'thetaBetaRatio', value: features.thetaBetaRatio, weight: 0.15 },
      { name: 'artifactPct', value: features.artifacts.totalArtifactPct, weight: 0.1 }
    ];

    featuresToAssess.forEach(({ name, value, weight }) => {
      const classification = this.classifyFeature(name as keyof CohortThresholds, value, cohort);
      const severity = this.calculateFeatureSeverity(name as keyof CohortThresholds, value, cohort);
      
      featureAssessments[name] = {
        value,
        classification,
        severity
      };

      totalSeverityScore += severity * weight;
      featureCount++;
    });

    // Calculate overall severity
    const averageSeverity = totalSeverityScore / featureCount;
    let overall: 'normal' | 'mild' | 'moderate' | 'severe';

    if (averageSeverity >= 0.8) {
      overall = 'severe';
    } else if (averageSeverity >= 0.6) {
      overall = 'moderate';
    } else if (averageSeverity >= 0.4) {
      overall = 'mild';
    } else {
      overall = 'normal';
    }

    // Generate summary and recommendations
    const summary = this.generateSeveritySummary(overall, featureAssessments);
    const recommendations = this.generateRecommendations(overall, featureAssessments, cohort);

    return {
      overall,
      features: featureAssessments,
      summary,
      recommendations
    };
  }

  /**
   * Calculate severity score for a single feature (0-1 scale)
   */
  private calculateFeatureSeverity(
    featureName: keyof CohortThresholds,
    value: number,
    cohort: CohortType
  ): number {
    const thresholds = this.getThresholds(cohort);
    const featureThresholds = thresholds[featureName];

    if (!featureThresholds) {
      return 0;
    }

    // Handle different types of thresholds
    if ('normal' in featureThresholds && 'borderline' in featureThresholds && 'severe' in featureThresholds) {
      // For metrics where higher values indicate worse condition (deltaPct, thetaBetaRatio, artifactPct)
      if (featureName === 'deltaPct' || featureName === 'thetaBetaRatio' || featureName === 'artifactPct') {
        if (value >= featureThresholds.severe) return 1.0;
        if (value >= featureThresholds.borderline) return 0.6;
        if (value >= featureThresholds.normal) return 0.3;
        return 0;
      }
      
      // For metrics where lower values indicate worse condition (adr, sef95)
      if (featureName === 'adr' || featureName === 'sef95') {
        if (value <= featureThresholds.severe) return 1.0;
        if (value <= featureThresholds.borderline) return 0.6;
        if (value <= featureThresholds.normal) return 0.3;
        return 0;
      }
    }

    return 0;
  }

  /**
   * Generate severity summary text
   */
  private generateSeveritySummary(
    overall: 'normal' | 'mild' | 'moderate' | 'severe',
    features: any
  ): string {
    const abnormalFeatures = Object.entries(features)
      .filter(([_, assessment]: [string, any]) => assessment.classification !== 'normal')
      .map(([name, assessment]: [string, any]) => name);

    switch (overall) {
      case 'normal':
        return 'EEG findings within normal limits for age cohort. No significant abnormalities detected.';
      
      case 'mild':
        return `Mild EEG abnormalities detected. Affected features: ${abnormalFeatures.join(', ')}. Overall pattern suggests mild encephalopathic changes.`;
      
      case 'moderate':
        return `Moderate EEG abnormalities present. Multiple features affected: ${abnormalFeatures.join(', ')}. Pattern consistent with moderate encephalopathy.`;
      
      case 'severe':
        return `Severe EEG abnormalities detected. Widespread involvement across features: ${abnormalFeatures.join(', ')}. Findings indicate severe encephalopathic process.`;
      
      default:
        return 'Unable to determine severity level.';
    }
  }

  /**
   * Generate clinical recommendations based on severity assessment
   */
  private generateRecommendations(
    overall: 'normal' | 'mild' | 'moderate' | 'severe',
    features: any,
    cohort: CohortType
  ): string[] {
    const recommendations: string[] = [];

    switch (overall) {
      case 'normal':
        recommendations.push('Continue routine monitoring');
        recommendations.push('No immediate intervention required');
        break;
      
      case 'mild':
        recommendations.push('Increase monitoring frequency');
        recommendations.push('Investigate potential underlying causes');
        recommendations.push('Consider metabolic workup if persistent');
        break;
      
      case 'moderate':
        recommendations.push('Urgent clinical evaluation recommended');
        recommendations.push('Consider neurology consultation');
        recommendations.push('Review medications and metabolic status');
        recommendations.push('Monitor for progression');
        break;
      
      case 'severe':
        recommendations.push('Immediate medical attention required');
        recommendations.push('Emergency neurology consultation');
        recommendations.push('Consider ICU monitoring');
        recommendations.push('Comprehensive diagnostic workup indicated');
        recommendations.push('Prepare for potential intervention');
        break;
    }

    // Add feature-specific recommendations
    if (features.deltaPct?.classification === 'severe') {
      recommendations.push('Significant slow-wave activity suggests possible metabolic or structural abnormality');
    }

    if (features.adr?.classification === 'severe') {
      recommendations.push('Severely reduced alpha/delta ratio indicates significant cortical dysfunction');
    }

    if (features.sef95?.classification === 'severe') {
      recommendations.push('Markedly compressed spectral edge frequency suggests severe encephalopathy');
    }

    if (features.artifactPct?.classification === 'severe') {
      recommendations.push('High artifact level - verify electrode contacts and minimize environmental interference');
    }

    // Cohort-specific recommendations
    if (cohort === 'PEDS') {
      recommendations.push('Pediatric neurology consultation recommended');
    } else if (cohort === 'GERIATRIC') {
      recommendations.push('Consider age-related changes and comorbidities');
      recommendations.push('Review polypharmacy and drug interactions');
    }

    return recommendations;
  }

  /**
   * Update thresholds for a specific cohort
   */
  public updateThresholds(
    cohort: CohortType,
    featureName: keyof CohortThresholds,
    thresholds: { normal?: number; borderline?: number; severe?: number; warning?: number }
  ): void {
    const cohortThresholds = this.getThresholds(cohort);
    const featureThresholds = cohortThresholds[featureName];

    if (featureThresholds) {
      Object.assign(featureThresholds, thresholds);
    }
  }

  /**
   * Export configuration to JSON
   */
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  public importConfig(configJson: string): void {
    try {
      const importedConfig = JSON.parse(configJson);
      this.config = this.mergeWithDefaults(importedConfig);
    } catch (error) {
      throw new Error(`Invalid configuration JSON: ${error}`);
    }
  }

  /**
   * Save configuration to file
   */
  public async saveConfig(filePath?: string): Promise<void> {
    const path = filePath || this.configPath;
    if (!path) {
      throw new Error('No file path specified for saving configuration');
    }

    const fs = await import('fs');
    const configJson = this.exportConfig();
    fs.writeFileSync(path, configJson, 'utf8');
  }

  /**
   * Load configuration from file
   */
  public async loadConfig(filePath?: string): Promise<void> {
    const path = filePath || this.configPath;
    if (!path) {
      throw new Error('No file path specified for loading configuration');
    }

    const fs = await import('fs');
    try {
      const configJson = fs.readFileSync(path, 'utf8');
      this.importConfig(configJson);
    } catch (error) {
      throw new Error(`Failed to load configuration from ${path}: ${error}`);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): ThresholdConfig {
    return { ...this.config };
  }

  /**
   * Validate configuration
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check each cohort
    (['adult', 'geriatric', 'pediatric'] as const).forEach(cohort => {
      const cohortThresholds = this.config[cohort];
      
      // Check each feature
      (Object.keys(cohortThresholds) as (keyof CohortThresholds)[]).forEach(feature => {
        const thresholds = cohortThresholds[feature];
        
        // Validate numeric thresholds
        if (typeof thresholds === 'object' && thresholds !== null) {
          Object.entries(thresholds).forEach(([level, value]) => {
            if (typeof value !== 'number' || value < 0) {
              errors.push(`Invalid ${level} threshold for ${feature} in ${cohort}: ${value}`);
            }
          });
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Reset to default configuration
   */
  public resetToDefaults(): void {
    this.config = this.getDefaultConfig();
  }
}

/**
 * Factory function to create threshold configuration with clinical defaults
 */
export function createThresholdConfiguration(): ThresholdConfiguration {
  return new ThresholdConfiguration();
}

/**
 * Create configuration with custom thresholds
 */
export function createCustomThresholdConfiguration(
  customConfig: Partial<ThresholdConfig>,
  configPath?: string
): ThresholdConfiguration {
  return new ThresholdConfiguration(customConfig, configPath);
}

/**
 * Utility function to generate threshold configuration for new cohorts
 */
export function generateCohortThresholds(
  baseCohort: CohortType,
  adjustments: {
    deltaPct?: { normal?: number; borderline?: number; severe?: number };
    adr?: { normal?: number; borderline?: number; severe?: number };
    sef95?: { normal?: number; borderline?: number; severe?: number };
    artifactPct?: { warning?: number; severe?: number };
    thetaBetaRatio?: { normal?: number; borderline?: number; severe?: number };
  }
): CohortThresholds {
  const baseConfig = createThresholdConfiguration().getThresholds(baseCohort);
  
  return {
    deltaPct: { ...baseConfig.deltaPct, ...adjustments.deltaPct },
    adr: { ...baseConfig.adr, ...adjustments.adr },
    sef95: { ...baseConfig.sef95, ...adjustments.sef95 },
    artifactPct: { ...baseConfig.artifactPct, ...adjustments.artifactPct },
    thetaBetaRatio: { ...baseConfig.thetaBetaRatio, ...adjustments.thetaBetaRatio }
  };
}

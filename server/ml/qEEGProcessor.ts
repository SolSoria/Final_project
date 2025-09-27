import { type CohortType } from "../../shared/schema";

// EEG Channel configuration
export interface EEGChannel {
  name: string;
  type: 'EEG' | 'ECG' | 'EMG' | 'EOG';
  position: { x: number; y: number };
  samplingRate: number;
}

// EEG Data structure
export interface EEGData {
  channels: EEGChannel[];
  samples: number[][]; // [channel][sample]
  timestamps: number[];
  samplingRate: number;
  duration: number; // in seconds
}

// Preprocessing parameters
export interface PreprocessingConfig {
  bandpass: {
    lowCut: number; // 0.5 Hz
    highCut: number; // 45 Hz
    order: number; // 4th order
    filterType: 'butterworth';
  };
  notch: {
    frequency: number; // 50 Hz or 60 Hz
    quality: number; // Q = 30
    order: number; // 2nd order
  };
  rereferencing: {
    method: 'CAR' | 'average' | 'linked';
  };
}

// Artifact detection results
export interface ArtifactDetection {
  blinkPct: number;
  motionEMGPct: number;
  flatlinePct: number;
  totalArtifactPct: number;
  qualityLevel: 'good' | 'warning' | 'severe';
  alertMessage?: string;
}

// Spectral band definitions
export interface SpectralBands {
  delta: { low: number; high: number }; // 0.5-4 Hz
  theta: { low: number; high: number }; // 4-8 Hz
  alpha: { low: number; high: number }; // 8-13 Hz
  beta: { low: number; high: number }; // 13-30 Hz
  gamma: { low: number; high: number }; // 30-45 Hz
}

// Power spectral density results
export interface PSDResult {
  frequencies: number[];
  power: number[][];
  bandPowers: {
    delta: number[];
    theta: number[];
    alpha: number[];
    beta: number[];
    gamma: number[];
  };
  totalPower: number[];
}

// Continuity classification
export type ContinuityType = 'continuous' | 'discontinuous' | 'burst_suppression' | 'suppressed';

export interface ContinuityAnalysis {
  type: ContinuityType;
  confidence: number;
  variance: number;
  zeroCrossingRate: number;
  burstDuration?: number;
  suppressionDuration?: number;
}

// Reactivity detection
export interface ReactivityResult {
  present: boolean;
  confidence: number;
  powerChange: number; // percentage change
  stimulusType?: 'light' | 'sound' | 'tactile';
  responseLatency: number; // in seconds
}

// Asymmetry analysis
export interface AsymmetryAnalysis {
  index: number; // |log(P_left / P_right)|
  lateralization: 'left' | 'right' | 'none';
  deltaAsymmetry: number;
  thetaAsymmetry: number;
  alphaAsymmetry: number;
}

// Seizure detection
export interface SeizureDetection {
  burdenMinutesPerHour: number;
  eventCount: number;
  averageDuration: number;
  patterns: {
    spikes: number;
    sharpWaves: number;
    spikeAndWave: number;
  };
}

// ACNS pattern detection
export interface ACNSPattern {
  type: 'LPD' | 'GPD' | 'LRDA' | 'GRDA';
  rate: number; // events per hour
  side: 'L' | 'R' | 'bilateral';
  confidence: number;
}

// Posterior Dominant Rhythm
export interface PDRResult {
  frequency: number; // in Hz
  confidence: number;
  channel: string;
  amplitude: number; // in μV
}

// Comprehensive qEEG features
export interface qEEGFeatures {
  // Basic spectral features
  deltaPct: number; // Slow-wave burden
  thetaPct: number;
  alphaPct: number;
  betaPct: number;
  gammaPct: number;
  
  // Ratios and indices
  adr: number; // Alpha/Delta Ratio
  sef95: number; // Spectral Edge Frequency 95%
  thetaBetaRatio: number;
  alphaThetaRatio: number;
  
  // Continuity and reactivity
  continuity: ContinuityAnalysis;
  reactivity: ReactivityResult;
  
  // Asymmetry
  asymmetry: AsymmetryAnalysis;
  
  // Seizure and patterns
  seizure: SeizureDetection;
  acnsPatterns: ACNSPattern[];
  
  // Posterior Dominant Rhythm
  pdr: PDRResult;
  
  // Artifact quality
  artifacts: ArtifactDetection;
  
  // Composite scores
  encephalopathyScore: number;
  brainHealthIndicator: 'green' | 'yellow' | 'red';
  
  // Metadata
  processingTime: number;
  windowStart: number;
  windowEnd: number;
  quality: 'good' | 'warning' | 'severe';
}

// Cohort-specific thresholds
export interface CohortThresholds {
  deltaPct: { normal: number; borderline: number; severe: number };
  adr: { normal: number; borderline: number; severe: number };
  sef95: { normal: number; borderline: number; severe: number };
  artifactPct: { warning: number; severe: number };
  thetaBetaRatio: { normal: number; borderline: number; severe: number };
}

// Complete threshold configuration
export interface ThresholdConfig {
  adult: CohortThresholds;
  geriatric: CohortThresholds;
  pediatric: CohortThresholds;
}

// Sliding window configuration
export interface WindowConfig {
  duration: number; // 20 seconds
  overlap: number; // 10 seconds
  step: number; // 10 seconds (duration - overlap)
}

// Processing pipeline configuration
export interface qEEGConfig {
  preprocessing: PreprocessingConfig;
  spectralBands: SpectralBands;
  window: WindowConfig;
  thresholds: ThresholdConfig;
  artifact: {
    blink: { varianceThreshold: number; epochDuration: number };
    motion: { varianceThreshold: number };
    flatline: { varianceThreshold: number; duration: number };
  };
}

// Real-time processing state
export interface RealTimeState {
  isProcessing: boolean;
  currentWindow: number;
  buffer: EEGData;
  lastUpdate: number;
  features: qEEGFeatures[];
}

// Stimulus event for reactivity testing
export interface StimulusEvent {
  type: 'light' | 'sound' | 'tactile';
  timestamp: number;
  duration: number;
  intensity: number;
}

// Processing result with metadata
export interface ProcessingResult {
  features: qEEGFeatures;
  windowInfo: {
    start: number;
    end: number;
    duration: number;
  };
  processingStats: {
    duration: number;
    artifactLevel: number;
    quality: 'good' | 'warning' | 'severe';
  };
  alerts: string[];
}

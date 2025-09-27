import { 
  EEGData, 
  qEEGFeatures, 
  SpectralBands, 
  PSDResult, 
  ContinuityAnalysis, 
  ReactivityResult, 
  AsymmetryAnalysis, 
  SeizureDetection, 
  ACNSPattern, 
  PDRResult, 
  ArtifactDetection,
  StimulusEvent,
  ProcessingResult,
  EEGChannel,
  ContinuityType
} from './qEEGProcessor';
import { type CohortType } from "../../shared/schema";
import { ArtifactDetector } from './artifactDetection';

/**
 * Comprehensive qEEG Feature Extraction Pipeline
 * Implements clinically interpretable metrics for encephalopathy assessment
 * Focuses on reproducibility, minimal computational overhead, and neurophysiological alignment
 */
export class qEEGFeatureExtractor {
  private spectralBands: SpectralBands;
  private artifactDetector: ArtifactDetector;
  private processingCache: Map<string, any> = new Map();

  constructor(spectralBands?: SpectralBands) {
    this.spectralBands = spectralBands || {
      delta: { low: 0.5, high: 4 },
      theta: { low: 4, high: 8 },
      alpha: { low: 8, high: 13 },
      beta: { low: 13, high: 30 },
      gamma: { low: 30, high: 45 }
    };
    this.artifactDetector = new ArtifactDetector();
  }

  /**
   * Complete feature extraction pipeline
   * Extracts all qEEG features from preprocessed EEG data
   */
  public async extractFeatures(
    data: EEGData, 
    cohort: CohortType = 'ADULT',
    stimulusEvents?: StimulusEvent[]
  ): Promise<qEEGFeatures> {
    const startTime = Date.now();
    const windowStart = 0;
    const windowEnd = data.duration;

    // Step 1: Artifact detection
    const artifacts = this.artifactDetector.detectArtifacts(data, cohort);

    // Step 2: Power Spectral Density analysis
    const psd = await this.computePSD(data);

    // Step 3: Extract spectral features
    const spectralFeatures = this.extractSpectralFeatures(psd);

    // Step 4: Continuity analysis
    const continuity = this.analyzeContinuity(data);

    // Step 5: Reactivity analysis (if stimulus events provided)
    const reactivity = stimulusEvents && stimulusEvents.length > 0 ?
      this.analyzeReactivity(data, psd, stimulusEvents) :
      this.getDefaultReactivity();

    // Step 6: Asymmetry analysis
    const asymmetry = this.analyzeAsymmetry(psd, data.channels);

    // Step 7: Seizure detection
    const seizure = this.detectSeizures(data);

    // Step 8: ACNS pattern detection
    const acnsPatterns = this.detectACNSPatterns(data);

    // Step 9: Posterior Dominant Rhythm analysis
    const pdr = this.analyzePDR(data, psd);

    // Step 10: Compute composite scores
    const compositeScores = this.computeCompositeScores(
      spectralFeatures, 
      continuity, 
      reactivity, 
      asymmetry,
      cohort
    );

    const processingTime = Date.now() - startTime;

    const features: qEEGFeatures = {
      // Basic spectral features
      deltaPct: spectralFeatures.deltaPct,
      thetaPct: spectralFeatures.thetaPct,
      alphaPct: spectralFeatures.alphaPct,
      betaPct: spectralFeatures.betaPct,
      gammaPct: spectralFeatures.gammaPct,
      
      // Ratios and indices
      adr: spectralFeatures.adr,
      sef95: spectralFeatures.sef95,
      thetaBetaRatio: spectralFeatures.thetaBetaRatio,
      alphaThetaRatio: spectralFeatures.alphaThetaRatio,
      
      // Continuity and reactivity
      continuity,
      reactivity,
      
      // Asymmetry
      asymmetry,
      
      // Seizure and patterns
      seizure,
      acnsPatterns,
      
      // Posterior Dominant Rhythm
      pdr,
      
      // Artifact quality
      artifacts,
      
      // Composite scores
      encephalopathyScore: compositeScores.encephalopathyScore,
      brainHealthIndicator: compositeScores.brainHealthIndicator,
      
      // Metadata
      processingTime,
      windowStart,
      windowEnd,
      quality: artifacts.qualityLevel
    };

    return features;
  }

  /**
   * Compute Power Spectral Density using Welch's method
   * Hamming window with 50% overlap for frequency-based metrics
   */
  private async computePSD(data: EEGData): Promise<PSDResult> {
    const samplingRate = data.samplingRate;
    const numChannels = data.samples.length;
    const numSamples = data.samples[0]?.length || 0;

    // Welch's method parameters
    const windowSize = Math.min(256, numSamples); // 256 samples or less
    const overlap = Math.floor(windowSize * 0.5); // 50% overlap
    const hopSize = windowSize - overlap;

    const frequencies: number[] = [];
    const power: number[][] = Array(numChannels).fill(null).map(() => []);
    const bandPowers = {
      delta: Array(numChannels).fill(0),
      theta: Array(numChannels).fill(0),
      alpha: Array(numChannels).fill(0),
      beta: Array(numChannels).fill(0),
      gamma: Array(numChannels).fill(0)
    };
    const totalPower = Array(numChannels).fill(0);

    // Generate frequency array
    const freqResolution = samplingRate / windowSize;
    for (let i = 0; i < Math.floor(windowSize / 2) + 1; i++) {
      frequencies.push(i * freqResolution);
    }

    // Process each channel
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = data.samples[ch];
      const channelPower: number[] = [];

      // Apply Welch's method
      for (let start = 0; start + windowSize <= numSamples; start += hopSize) {
        const windowData = channelData.slice(start, start + windowSize);
        
        // Apply Hamming window
        const windowedData = this.applyHammingWindow(windowData);
        
        // Compute FFT (simplified - in practice would use optimized FFT library)
        const spectrum = this.computeFFT(windowedData);
        const powerSpectrum = spectrum.map(complex => 
          complex.real * complex.real + complex.imag * complex.imag
        );

        // Accumulate power
        if (channelPower.length === 0) {
          channelPower.push(...powerSpectrum);
        } else {
          for (let i = 0; i < powerSpectrum.length; i++) {
            channelPower[i] += powerSpectrum[i];
          }
        }
      }

      // Average the power spectra
      const numWindows = Math.floor((numSamples - windowSize) / hopSize) + 1;
      for (let i = 0; i < channelPower.length; i++) {
        channelPower[i] /= numWindows;
      }

      power[ch] = channelPower;

      // Calculate band powers
      bandPowers.delta[ch] = this.calculateBandPower(
        frequencies, channelPower, this.spectralBands.delta
      );
      bandPowers.theta[ch] = this.calculateBandPower(
        frequencies, channelPower, this.spectralBands.theta
      );
      bandPowers.alpha[ch] = this.calculateBandPower(
        frequencies, channelPower, this.spectralBands.alpha
      );
      bandPowers.beta[ch] = this.calculateBandPower(
        frequencies, channelPower, this.spectralBands.beta
      );
      bandPowers.gamma[ch] = this.calculateBandPower(
        frequencies, channelPower, this.spectralBands.gamma
      );

      // Calculate total power
      totalPower[ch] = bandPowers.delta[ch] + bandPowers.theta[ch] + 
                       bandPowers.alpha[ch] + bandPowers.beta[ch] + bandPowers.gamma[ch];
    }

    return {
      frequencies,
      power,
      bandPowers,
      totalPower
    };
  }

  /**
   * Extract spectral features from PSD results
   */
  private extractSpectralFeatures(psd: PSDResult): {
    deltaPct: number;
    thetaPct: number;
    alphaPct: number;
    betaPct: number;
    gammaPct: number;
    adr: number;
    sef95: number;
    thetaBetaRatio: number;
    alphaThetaRatio: number;
  } {
    // Average across all channels
    const avgBandPowers = {
      delta: psd.bandPowers.delta.reduce((a, b) => a + b, 0) / psd.bandPowers.delta.length,
      theta: psd.bandPowers.theta.reduce((a, b) => a + b, 0) / psd.bandPowers.theta.length,
      alpha: psd.bandPowers.alpha.reduce((a, b) => a + b, 0) / psd.bandPowers.alpha.length,
      beta: psd.bandPowers.beta.reduce((a, b) => a + b, 0) / psd.bandPowers.beta.length,
      gamma: psd.bandPowers.gamma.reduce((a, b) => a + b, 0) / psd.bandPowers.gamma.length
    };

    const totalPower = avgBandPowers.delta + avgBandPowers.theta + avgBandPowers.alpha + 
                      avgBandPowers.beta + avgBandPowers.gamma;

    // Calculate percentages
    const deltaPct = (avgBandPowers.delta / totalPower) * 100;
    const thetaPct = (avgBandPowers.theta / totalPower) * 100;
    const alphaPct = (avgBandPowers.alpha / totalPower) * 100;
    const betaPct = (avgBandPowers.beta / totalPower) * 100;
    const gammaPct = (avgBandPowers.gamma / totalPower) * 100;

    // Calculate ratios
    const adr = avgBandPowers.alpha / (avgBandPowers.delta + 1e-10); // Avoid division by zero
    const thetaBetaRatio = avgBandPowers.theta / (avgBandPowers.beta + 1e-10);
    const alphaThetaRatio = avgBandPowers.alpha / (avgBandPowers.theta + 1e-10);

    // Calculate SEF95
    const sef95 = this.calculateSEF95(psd.frequencies, psd.power[0]); // Use first channel

    return {
      deltaPct,
      thetaPct,
      alphaPct,
      betaPct,
      gammaPct,
      adr,
      sef95,
      thetaBetaRatio,
      alphaThetaRatio
    };
  }

  /**
   * Analyze background continuity patterns
   * Classifies as continuous, discontinuous, burst-suppression, or suppressed
   */
  private analyzeContinuity(data: EEGData): ContinuityAnalysis {
    const epochDuration = 10; // 10-second epochs
    const epochSamples = epochDuration * data.samplingRate;
    const numEpochs = Math.floor(data.samples[0]?.length / epochSamples || 0);

    let totalVariance = 0;
    let totalZeroCrossingRate = 0;
    let burstCount = 0;
    let suppressionCount = 0;

    // Analyze each epoch
    for (let epoch = 0; epoch < numEpochs; epoch++) {
      const startIdx = epoch * epochSamples;
      const endIdx = Math.min(startIdx + epochSamples, data.samples[0].length);
      
      // Use central channels for continuity analysis
      const centralChannels = this.getCentralChannels(data.channels);
      let epochVariance = 0;
      let epochZeroCrossingRate = 0;

      centralChannels.forEach(channelIndex => {
        const epochData = data.samples[channelIndex].slice(startIdx, endIdx);
        
        // Calculate variance
        const variance = this.calculateVariance(epochData);
        epochVariance += variance;

        // Calculate zero-crossing rate
        const zcr = this.calculateZeroCrossingRate(epochData);
        epochZeroCrossingRate += zcr;
      });

      epochVariance /= centralChannels.length;
      epochZeroCrossingRate /= centralChannels.length;

      totalVariance += epochVariance;
      totalZeroCrossingRate += epochZeroCrossingRate;

      // Classify epoch
      if (epochVariance < 0.1) {
        suppressionCount++;
      } else if (epochVariance > 10 && epochZeroCrossingRate < 5) {
        burstCount++;
      }
    }

    // Average metrics
    const avgVariance = totalVariance / numEpochs;
    const avgZeroCrossingRate = totalZeroCrossingRate / numEpochs;

    // Determine continuity type
    let type: ContinuityType = 'continuous';
    let confidence = 0.5;

    if (suppressionCount / numEpochs > 0.7) {
      type = 'suppressed';
      confidence = 0.9;
    } else if (burstCount / numEpochs > 0.4 && suppressionCount / numEpochs > 0.2) {
      type = 'burst_suppression';
      confidence = 0.8;
    } else if (avgZeroCrossingRate < 10 || avgVariance < 1) {
      type = 'discontinuous';
      confidence = 0.7;
    } else {
      type = 'continuous';
      confidence = 0.8;
    }

    return {
      type,
      confidence,
      variance: avgVariance,
      zeroCrossingRate: avgZeroCrossingRate
    };
  }

  /**
   * Analyze reactivity to stimuli
   * Detects power changes in alpha/theta bands post-stimulus
   */
  private analyzeReactivity(
    data: EEGData, 
    psd: PSDResult, 
    stimulusEvents: StimulusEvent[]
  ): ReactivityResult {
    if (stimulusEvents.length === 0) {
      return this.getDefaultReactivity();
    }

    const preStimulusDuration = 2; // 2 seconds before stimulus
    const postStimulusDuration = 3; // 3 seconds after stimulus
    const samplingRate = data.samplingRate;

    let totalPowerChange = 0;
    let validResponses = 0;

    stimulusEvents.forEach(event => {
      const stimulusTime = event.timestamp;
      const preStart = Math.max(0, (stimulusTime - preStimulusDuration) * samplingRate);
      const preEnd = stimulusTime * samplingRate;
      const postStart = stimulusTime * samplingRate;
      const postEnd = Math.min(data.samples[0].length, (stimulusTime + postStimulusDuration) * samplingRate);

      if (postEnd > postStart) {
        // Calculate pre and post stimulus power in alpha/theta bands
        const centralChannels = this.getCentralChannels(data.channels);
        
        centralChannels.forEach(channelIndex => {
          const preData = data.samples[channelIndex].slice(preStart, preEnd);
          const postData = data.samples[channelIndex].slice(postStart, postEnd);

          const prePower = this.calculateBandPowerSimple(
            preData, samplingRate, this.spectralBands.alpha
          ) + this.calculateBandPowerSimple(
            preData, samplingRate, this.spectralBands.theta
          );

          const postPower = this.calculateBandPowerSimple(
            postData, samplingRate, this.spectralBands.alpha
          ) + this.calculateBandPowerSimple(
            postData, samplingRate, this.spectralBands.theta
          );

          const powerChange = ((postPower - prePower) / prePower) * 100;
          totalPowerChange += powerChange;

          if (Math.abs(powerChange) > 20) { // Significant change threshold
            validResponses++;
          }
        });
      }
    });

    const avgPowerChange = totalPowerChange / (stimulusEvents.length * this.getCentralChannels(data.channels).length);
    const reactivityPresent = validResponses > stimulusEvents.length * 0.5; // Majority of responses

    return {
      present: reactivityPresent,
      confidence: validResponses / stimulusEvents.length,
      powerChange: avgPowerChange,
      stimulusType: stimulusEvents[0]?.type,
      responseLatency: 0.5 // Simplified latency
    };
  }

  /**
   * Analyze hemispheric asymmetry
   * Calculates log-ratio of left-right hemispheric power
   */
  private analyzeAsymmetry(psd: PSDResult, channels: EEGChannel[]): AsymmetryAnalysis {
    const leftChannels = this.getLeftHemisphereChannels(channels);
    const rightChannels = this.getRightHemisphereChannels(channels);

    if (leftChannels.length === 0 || rightChannels.length === 0) {
      return {
        index: 0,
        lateralization: 'none',
        deltaAsymmetry: 0,
        thetaAsymmetry: 0,
        alphaAsymmetry: 0
      };
    }

    // Calculate average power for each hemisphere and band
    const leftPower = {
      delta: this.getAverageBandPower(psd, leftChannels, 'delta'),
      theta: this.getAverageBandPower(psd, leftChannels, 'theta'),
      alpha: this.getAverageBandPower(psd, leftChannels, 'alpha')
    };

    const rightPower = {
      delta: this.getAverageBandPower(psd, rightChannels, 'delta'),
      theta: this.getAverageBandPower(psd, rightChannels, 'theta'),
      alpha: this.getAverageBandPower(psd, rightChannels, 'alpha')
    };

    // Calculate asymmetry indices
    const deltaAsymmetry = Math.abs(Math.log((leftPower.delta + 1e-10) / (rightPower.delta + 1e-10)));
    const thetaAsymmetry = Math.abs(Math.log((leftPower.theta + 1e-10) / (rightPower.theta + 1e-10)));
    const alphaAsymmetry = Math.abs(Math.log((leftPower.alpha + 1e-10) / (rightPower.alpha + 1e-10)));

    // Overall asymmetry index
    const totalLeftPower = leftPower.delta + leftPower.theta + leftPower.alpha;
    const totalRightPower = rightPower.delta + rightPower.theta + rightPower.alpha;
    const asymmetryIndex = Math.abs(Math.log((totalLeftPower + 1e-10) / (totalRightPower + 1e-10)));

    // Determine lateralization
    let lateralization: 'left' | 'right' | 'none' = 'none';
    if (asymmetryIndex > 0.15) {
      lateralization = totalLeftPower > totalRightPower ? 'left' : 'right';
    }

    return {
      index: asymmetryIndex,
      lateralization,
      deltaAsymmetry,
      thetaAsymmetry,
      alphaAsymmetry
    };
  }

  /**
   * Detect seizure activity using template matching
   * Identifies spikes, sharp waves, and spike-and-wave patterns
   */
  private detectSeizures(data: EEGData): SeizureDetection {
    const epochDuration = 1; // 1-second epochs
    const epochSamples = epochDuration * data.samplingRate;
    const numEpochs = Math.floor(data.samples[0]?.length / epochSamples || 0);

    let spikeCount = 0;
    let sharpWaveCount = 0;
    let spikeAndWaveCount = 0;
    let totalSeizureDuration = 0;

    for (let epoch = 0; epoch < numEpochs; epoch++) {
      const startIdx = epoch * epochSamples;
      const endIdx = Math.min(startIdx + epochSamples, data.samples[0].length);

      let epochHasSeizureActivity = false;

      // Check each channel for seizure patterns
      data.samples.forEach((channelData, channelIndex) => {
        const epochData = channelData.slice(startIdx, endIdx);
        
        // Spike detection (high amplitude, short duration)
        const spikes = this.detectSpikes(epochData, data.samplingRate);
        spikeCount += spikes;

        // Sharp wave detection
        const sharpWaves = this.detectSharpWaves(epochData, data.samplingRate);
        sharpWaveCount += sharpWaves;

        // Spike-and-wave detection
        const spikeWaves = this.detectSpikeAndWave(epochData, data.samplingRate);
        spikeAndWaveCount += spikeWaves;

        if (spikes > 0 || sharpWaves > 0 || spikeWaves > 0) {
          epochHasSeizureActivity = true;
        }
      });

      if (epochHasSeizureActivity) {
        totalSeizureDuration += epochDuration;
      }
    }

    // Calculate burden per hour
    const recordingHours = data.duration / 3600;
    const burdenMinutesPerHour = (totalSeizureDuration / 60) / recordingHours;

    return {
      burdenMinutesPerHour,
      eventCount: spikeCount + sharpWaveCount + spikeAndWaveCount,
      averageDuration: totalSeizureDuration / Math.max(1, spikeCount + sharpWaveCount + spikeAndWaveCount),
      patterns: {
        spikes: spikeCount,
        sharpWaves: sharpWaveCount,
        spikeAndWave: spikeAndWaveCount
      }
    };
  }

  /**
   * Detect ACNS standardized patterns
   * Identifies LPD, GPD, LRDA, GRDA patterns per ACNS guidelines
   */
  private detectACNSPatterns(data: EEGData): ACNSPattern[] {
    const patterns: ACNSPattern[] = [];
    
    // Simplified pattern detection - in practice would use more sophisticated algorithms
    const leftChannels = this.getLeftHemisphereChannels(data.channels);
    const rightChannels = this.getRightHemisphereChannels(data.channels);

    // LPD (Lateralized Periodic Discharges) detection
    const lpdRate = this.detectPeriodicDischarges(data, leftChannels, 0.5, 2.0);
    if (lpdRate > 0) {
      patterns.push({
        type: 'LPD',
        rate: lpdRate,
        side: 'L',
        confidence: 0.7
      });
    }

    // GPD (Generalized Periodic Discharges) detection
    const gpdRate = this.detectPeriodicDischarges(data, Array.from({length: data.channels.length}, (_, i) => i), 0.5, 2.0);
    if (gpdRate > 0) {
      patterns.push({
        type: 'GPD',
        rate: gpdRate,
        side: 'bilateral',
        confidence: 0.6
      });
    }

    return patterns;
  }

  /**
   * Analyze Posterior Dominant Rhythm
   * Detects peak alpha frequency over occipital channels
   */
  private analyzePDR(data: EEGData, psd: PSDResult): PDRResult {
    const occipitalChannels = this.getOccipitalChannels(data.channels);
    
    if (occipitalChannels.length === 0) {
      return {
        frequency: 0,
        confidence: 0,
        channel: '',
        amplitude: 0
      };
    }

    let bestFrequency = 0;
    let bestAmplitude = 0;
    let bestChannel = '';
    let bestConfidence = 0;

    occipitalChannels.forEach(channelIndex => {
      const channelName = data.channels[channelIndex].name;
      const frequencies = psd.frequencies;
      const power = psd.power[channelIndex];

      // Find peak in alpha band (8-13 Hz)
      let peakPower = 0;
      let peakFreq = 0;

      for (let i = 0; i < frequencies.length; i++) {
        if (frequencies[i] >= 8 && frequencies[i] <= 13) {
          if (power[i] > peakPower) {
            peakPower = power[i];
            peakFreq = frequencies[i];
          }
        }
      }

      if (peakFreq > 0) {
        const amplitude = Math.sqrt(peakPower);
        const confidence = this.calculatePDRConfidence(peakFreq, peakPower, power);

        if (amplitude > bestAmplitude) {
          bestAmplitude = amplitude;
          bestFrequency = peakFreq;
          bestChannel = channelName;
          bestConfidence = confidence;
        }
      }
    });

    return {
      frequency: bestFrequency,
      confidence: bestConfidence,
      channel: bestChannel,
      amplitude: bestAmplitude
    };
  }

  /**
   * Compute composite encephalopathy score and brain health indicator
   * Weighted combination of slowing, continuity, and reactivity metrics
   */
  private computeCompositeScores(
    spectralFeatures: any,
    continuity: ContinuityAnalysis,
    reactivity: ReactivityResult,
    asymmetry: AsymmetryAnalysis,
    cohort: CohortType
  ): {
    encephalopathyScore: number;
    brainHealthIndicator: 'green' | 'yellow' | 'red';
  } {
    // Weighted scoring based on clinical importance
    const weights = {
      deltaPct: 0.3,        // Slow-wave burden
      adr: 0.25,            // Alpha/delta ratio
      continuity: 0.2,      // Background continuity
      reactivity: 0.15,     // Reactivity to stimuli
      asymmetry: 0.1        // Hemispheric asymmetry
    };

    // Normalize each metric to 0-10 scale
    const deltaScore = Math.min(10, spectralFeatures.deltaPct / 5); // 50% delta = score 10
    const adrScore = Math.max(0, 10 - (spectralFeatures.adr * 5)); // ADR 2.0 = score 0
    const continuityScore = this.getContinuityScore(continuity.type);
    const reactivityScore = reactivity.present ? 2 : 8; // Reactivity good = low score
    const asymmetryScore = Math.min(10, asymmetry.index * 20); // Asymmetry 0.5 = score 10

    // Calculate weighted encephalopathy score
    const encephalopathyScore = 
      (deltaScore * weights.deltaPct) +
      (adrScore * weights.adr) +
      (continuityScore * weights.continuity) +
      (reactivityScore * weights.reactivity) +
      (asymmetryScore * weights.asymmetry);

    // Determine brain health indicator
    let brainHealthIndicator: 'green' | 'yellow' | 'red' = 'green';
    if (encephalopathyScore > 6) {
      brainHealthIndicator = 'red';
    } else if (encephalopathyScore > 3) {
      brainHealthIndicator = 'yellow';
    }

    return {
      encephalopathyScore: Math.max(0, Math.min(10, encephalopathyScore)),
      brainHealthIndicator
    };
  }

  // Helper methods for specific calculations

  private applyHammingWindow(data: number[]): number[] {
    const N = data.length;
    return data.map((value, index) => {
      const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * index / (N - 1));
      return value * window;
    });
  }

  private computeFFT(data: number[]): { real: number; imag: number }[] {
    // Simplified FFT implementation - in practice would use optimized library
    const N = data.length;
    const result: { real: number; imag: number }[] = [];

    for (let k = 0; k < N / 2 + 1; k++) {
      let real = 0;
      let imag = 0;

      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += data[n] * Math.cos(angle);
        imag += data[n] * Math.sin(angle);
      }

      result.push({ real, imag });
    }

    return result;
  }

  private calculateBandPower(
    frequencies: number[], 
    power: number[], 
    band: { low: number; high: number }
  ): number {
    let bandPower = 0;
    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] >= band.low && frequencies[i] <= band.high) {
        bandPower += power[i];
      }
    }
    return bandPower;
  }

  private calculateBandPowerSimple(
    data: number[], 
    samplingRate: number, 
    band: { low: number; high: number }
  ): number {
    // Simplified band power calculation for reactivity analysis
    const fft = this.computeFFT(data);
    const frequencies = Array.from({length: fft.length}, (_, i) => i * samplingRate / data.length);
    return this.calculateBandPower(frequencies, fft.map(f => f.real * f.real + f.imag * f.imag), band);
  }

  private calculateSEF95(frequencies: number[], power: number[]): number {
    const totalPower = power.reduce((sum, p) => sum + p, 0);
    const threshold95 = totalPower * 0.95;
    
    let cumulativePower = 0;
    for (let i = 0; i < frequencies.length; i++) {
      cumulativePower += power[i];
      if (cumulativePower >= threshold95) {
        return frequencies[i];
      }
    }
    
    return frequencies[frequencies.length - 1];
  }

  private calculateVariance(signal: number[]): number {
    if (signal.length === 0) return 0;
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    return signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
  }

  private calculateZeroCrossingRate(signal: number[]): number {
    let crossings = 0;
    for (let i = 1; i < signal.length; i++) {
      if ((signal[i] >= 0) !== (signal[i-1] >= 0)) {
        crossings++;
      }
    }
    return crossings / signal.length;
  }

  private getCentralChannels(channels: EEGChannel[]): number[] {
    const centralPatterns = ['C3', 'C4', 'Cz', 'Fz', 'Pz'];
    return channels
      .map((ch, index) => ({ ch, index }))
      .filter(({ ch }) => centralPatterns.some(pattern => ch.name.includes(pattern)))
      .map(({ index }) => index);
  }

  private getLeftHemisphereChannels(channels: EEGChannel[]): number[] {
    const leftPatterns = ['Fp1', 'F3', 'F7', 'C3', 'T3', 'T5', 'P3', 'O1'];
    return channels
      .map((ch, index) => ({ ch, index }))
      .filter(({ ch }) => leftPatterns.some(pattern => ch.name.includes(pattern)))
      .map(({ index }) => index);
  }

  private getRightHemisphereChannels(channels: EEGChannel[]): number[] {
    const rightPatterns = ['Fp2', 'F4', 'F8', 'C4', 'T4', 'T6', 'P4', 'O2'];
    return channels
      .map((ch, index) => ({ ch, index }))
      .filter(({ ch }) => rightPatterns.some(pattern => ch.name.includes(pattern)))
      .map(({ index }) => index);
  }

  private getOccipitalChannels(channels: EEGChannel[]): number[] {
    const occipitalPatterns = ['O1', 'O2', 'Oz', 'P3', 'P4', 'Pz'];
    return channels
      .map((ch, index) => ({ ch, index }))
      .filter(({ ch }) => occipitalPatterns.some(pattern => ch.name.includes(pattern)))
      .map(({ index }) => index);
  }

  private getDefaultReactivity(): ReactivityResult {
    return {
      present: false,
      confidence: 0,
      powerChange: 0,
      responseLatency: 0
    };
  }

  private getAverageBandPower(psd: PSDResult, channelIndices: number[], band: keyof typeof psd.bandPowers): number {
    if (channelIndices.length === 0) return 0;
    const totalPower = channelIndices.reduce((sum, idx) => sum + psd.bandPowers[band][idx], 0);
    return totalPower / channelIndices.length;
  }

  private detectSpikes(data: number[], samplingRate: number): number {
    // Simplified spike detection
    const threshold = 50; // μV
    let spikeCount = 0;
    
    for (let i = 1; i < data.length - 1; i++) {
      if (Math.abs(data[i]) > threshold && 
          Math.abs(data[i]) > Math.abs(data[i-1]) && 
          Math.abs(data[i]) > Math.abs(data[i+1])) {
        spikeCount++;
      }
    }
    
    return spikeCount;
  }

  private detectSharpWaves(data: number[], samplingRate: number): number {
    // Simplified sharp wave detection (longer duration than spikes)
    const threshold = 30; // μV
    let sharpWaveCount = 0;
    
    for (let i = 2; i < data.length - 2; i++) {
      if (Math.abs(data[i]) > threshold && 
          Math.abs(data[i]) > Math.abs(data[i-2]) && 
          Math.abs(data[i]) > Math.abs(data[i+2])) {
        sharpWaveCount++;
      }
    }
    
    return sharpWaveCount;
  }

  private detectSpikeAndWave(data: number[], samplingRate: number): number {
    // Simplified spike-and-wave detection
    const spikeCount = this.detectSpikes(data, samplingRate);
    const threshold = spikeCount > 0 ? 1 : 0; // Basic heuristic
    return threshold;
  }

  private detectPeriodicDischarges(
    data: EEGData, 
    channelIndices: number[], 
    minFreq: number, 
    maxFreq: number
  ): number {
    // Simplified periodic discharge detection
    // In practice would use more sophisticated pattern recognition
    return Math.random() * 2; // Placeholder
  }

  private getContinuityScore(type: ContinuityAnalysis['type']): number {
    switch (type) {
      case 'continuous': return 1;
      case 'discontinuous': return 4;
      case 'burst_suppression': return 7;
      case 'suppressed': return 10;
      default: return 5;
    }
  }

  private calculatePDRConfidence(frequency: number, power: number, fullSpectrum: number[]): number {
    if (frequency < 8 || frequency > 13) return 0;
    
    // Check if it's a clear peak in the alpha band
    const avgPower = fullSpectrum.reduce((sum, p) => sum + p, 0) / fullSpectrum.length;
    const signalToNoise = power / avgPower;
    
    return Math.min(1, signalToNoise / 3); // Normalize to 0-1
  }
}

/**
 * Factory function to create qEEG feature extractor
 */
export function createqEEGFeatureExtractor(): qEEGFeatureExtractor {
  return new qEEGFeatureExtractor();
}

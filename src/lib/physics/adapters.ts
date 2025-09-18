import { getRegistryEntry } from './registry';
import { validateParams } from './validators';

export interface EngineSuggestions {
  readonly noise: number | null;
  readonly damping: number | null;
  readonly threshold: number | null;
  readonly kernelPreset: string | null;
  readonly gain: number | null;
  readonly resolution: number | null;
  readonly modulation: number | null;
}

export interface EngineAdapterResult {
  readonly entryId: string;
  readonly params: Record<string, number>;
  readonly warnings: string[];
  readonly suggestions: EngineSuggestions;
}

const BASE_SUGGESTIONS: EngineSuggestions = {
  noise: null,
  damping: null,
  threshold: null,
  kernelPreset: null,
  gain: null,
  resolution: null,
  modulation: null,
};

const hasFiniteValue = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const cloneBaseSuggestions = (): EngineSuggestions => ({ ...BASE_SUGGESTIONS });

export const toEngine = (
  entryId: string,
  params: Record<string, unknown> = {},
): EngineAdapterResult => {
  const validation = validateParams(entryId, params);
  const suggestions = cloneBaseSuggestions();
  const resolvedEntry = getRegistryEntry(entryId);

  switch (validation.entryId) {
    case 'vacuum': {
      const fluctuation = validation.params.fluctuationAmplitude;
      const energyDensity = validation.params.energyDensity;
      const correlationLength = validation.params.correlationLength;

      if (hasFiniteValue(fluctuation)) {
        suggestions.noise = fluctuation;
        suggestions.modulation = Number((fluctuation * 0.25).toFixed(6));
        suggestions.damping = Number((1 / (1 + fluctuation)).toPrecision(6));
      }

      if (hasFiniteValue(energyDensity)) {
        suggestions.threshold = Number((energyDensity * 0.5).toPrecision(6));
        suggestions.gain = Number((energyDensity * 1e12).toPrecision(6));
      }

      if (hasFiniteValue(correlationLength)) {
        suggestions.kernelPreset = 'gaussian';
        suggestions.resolution = Number(correlationLength.toPrecision(6));
        suggestions.damping = Number((1 / (1 + correlationLength)).toPrecision(6));
      } else if (resolvedEntry) {
        suggestions.kernelPreset = 'gaussian';
      }
      break;
    }
    case 'tunneling': {
      const barrierHeight = validation.params.barrierHeight;
      const barrierWidth = validation.params.barrierWidth;
      const temperature = validation.params.temperature;

      if (hasFiniteValue(barrierHeight)) {
        suggestions.threshold = Number(barrierHeight.toPrecision(6));
        suggestions.gain = Number(Math.exp(-barrierHeight / 5).toPrecision(6));
      }

      if (hasFiniteValue(barrierWidth)) {
        suggestions.resolution = Number(barrierWidth.toPrecision(6));
        suggestions.damping = Number((Math.min(1, barrierWidth / 10 + 0.1)).toPrecision(6));
      }

      if (hasFiniteValue(temperature)) {
        suggestions.noise = Number((1 / (temperature + 1)).toPrecision(6));
        suggestions.modulation = Number((temperature * 0.1).toPrecision(6));
      }

      suggestions.kernelPreset = 'exponential';
      break;
    }
    case 'nuclear': {
      const fusionRate = validation.params.fusionRate;
      const confinementTime = validation.params.confinementTime;
      const plasmaDensity = validation.params.plasmaDensity;

      if (hasFiniteValue(fusionRate)) {
        suggestions.noise = Number((1 / Math.sqrt(fusionRate + 1e-9)).toPrecision(6));
        suggestions.gain = Number((fusionRate * 1e-6).toPrecision(6));
      }

      if (hasFiniteValue(confinementTime)) {
        suggestions.resolution = Number((1 / (confinementTime + 1e-6)).toPrecision(6));
        if (hasFiniteValue(fusionRate)) {
          suggestions.modulation = Number(
            (fusionRate * confinementTime * 1e-3).toPrecision(6),
          );
        }
        suggestions.damping = Number((1 - Math.exp(-Math.max(confinementTime, 0) / 10)).toPrecision(6));
      }

      if (hasFiniteValue(plasmaDensity)) {
        suggestions.threshold = Number(plasmaDensity.toPrecision(6));
      }

      suggestions.kernelPreset = 'lorentzian';
      break;
    }
    case 'neutrino': {
      const oscillationLength = validation.params.oscillationLength;
      const massSplitting = validation.params.massSplitting;
      const mixingAngle = validation.params.mixingAngle;

      if (hasFiniteValue(oscillationLength)) {
        suggestions.resolution = Number(oscillationLength.toPrecision(6));
      }

      if (hasFiniteValue(massSplitting)) {
        suggestions.noise = Number(massSplitting.toPrecision(6));
      }

      if (hasFiniteValue(mixingAngle)) {
        const radians = (mixingAngle * Math.PI) / 180;
        suggestions.threshold = Number(mixingAngle.toPrecision(6));
        suggestions.gain = Number(Math.sin(radians).toPrecision(6));
        if (hasFiniteValue(oscillationLength)) {
          suggestions.modulation = Number((massSplitting * oscillationLength).toPrecision(6));
        }
        suggestions.damping = Number((Math.min(0.95, mixingAngle / 120)).toPrecision(6));
      }

      suggestions.kernelPreset = 'wave';
      break;
    }
    case 'star-formation': {
      const gasDensity = validation.params.gasDensity;
      const turbulence = validation.params.turbulence;
      const metallicity = validation.params.metallicity;

      if (hasFiniteValue(gasDensity)) {
        suggestions.threshold = Number(gasDensity.toPrecision(6));
      }

      if (hasFiniteValue(turbulence)) {
        suggestions.noise = Number(turbulence.toPrecision(6));
        if (hasFiniteValue(gasDensity) && turbulence !== 0) {
          suggestions.resolution = Number((gasDensity / turbulence).toPrecision(6));
        }
        suggestions.damping = Number((Math.min(0.9, turbulence / 100)).toPrecision(6));
      }

      if (hasFiniteValue(metallicity)) {
        suggestions.gain = Number(metallicity.toPrecision(6));
        if (hasFiniteValue(turbulence)) {
          suggestions.modulation = Number((metallicity * turbulence).toPrecision(6));
        }
        if (!hasFiniteValue(turbulence)) {
          suggestions.damping = Number((Math.min(0.9, metallicity)).toPrecision(6));
        }
      }

      suggestions.kernelPreset = 'adaptive';
      break;
    }
    case 'social-dynamics': {
      const cooperationBias = validation.params.cooperationBias;
      const networkDensity = validation.params.networkDensity;
      const cognitiveLoad = validation.params.cognitiveLoad;

      if (hasFiniteValue(cognitiveLoad)) {
        suggestions.noise = Number((cognitiveLoad * 0.8).toPrecision(6));
      }

      if (hasFiniteValue(cooperationBias)) {
        suggestions.damping = Number((1 - cooperationBias * 0.7).toPrecision(6));
        suggestions.gain = Number((cooperationBias * 0.5).toPrecision(6));
      }

      if (hasFiniteValue(networkDensity)) {
        const normalized = Math.min(1, Math.max(0, networkDensity * 0.8 + 0.1));
        suggestions.threshold = Number(normalized.toPrecision(6));
      }

      if (hasFiniteValue(cooperationBias) && hasFiniteValue(networkDensity)) {
        suggestions.modulation = Number(
          ((cooperationBias - 0.5) * networkDensity).toPrecision(6),
        );
      }

      suggestions.kernelPreset = 'adaptive';
      break;
    }
    case 'affective-bonds': {
      const oxytocinLevel = validation.params.oxytocinLevel;
      const trustIndex = validation.params.trustIndex;
      const privacyRisk = validation.params.privacyRisk;

      if (hasFiniteValue(oxytocinLevel)) {
        suggestions.noise = Number((1 / (1 + oxytocinLevel / 120)).toPrecision(6));
      }

      if (hasFiniteValue(trustIndex)) {
        suggestions.threshold = Number((trustIndex * 0.8).toPrecision(6));
        suggestions.gain = Number((trustIndex * 0.9).toPrecision(6));
      }

      if (hasFiniteValue(privacyRisk)) {
        suggestions.damping = Number((1 - privacyRisk * 0.6).toPrecision(6));
      }

      if (hasFiniteValue(trustIndex) && hasFiniteValue(privacyRisk)) {
        suggestions.modulation = Number(
          ((trustIndex - privacyRisk) * 0.5).toPrecision(6),
        );
      }

      suggestions.kernelPreset = 'gaussian';
      break;
    }
    case 'neuromarketing': {
      const stimulusFrequency = validation.params.stimulusFrequency;
      const sessionDuration = validation.params.sessionDuration;
      const ethicalCompliance = validation.params.ethicalCompliance;

      if (hasFiniteValue(stimulusFrequency)) {
        suggestions.noise = Number((Math.min(1, stimulusFrequency / 10)).toPrecision(6));
        suggestions.modulation = Number(
          (stimulusFrequency * 0.15).toPrecision(6),
        );
      }

      if (hasFiniteValue(sessionDuration)) {
        suggestions.resolution = Number((sessionDuration / 60).toPrecision(6));
      }

      if (hasFiniteValue(ethicalCompliance)) {
        suggestions.damping = Number((1 - ethicalCompliance * 0.4).toPrecision(6));
        suggestions.gain = Number((ethicalCompliance * 0.8).toPrecision(6));
        suggestions.threshold = Number((Math.max(0.1, ethicalCompliance)).toPrecision(6));
      }

      suggestions.kernelPreset = 'exponential';
      break;
    }
    case 'reactionless-propulsion': {
      // Negative control scenario — keep the engine untouched.
      suggestions.noise = 0;
      suggestions.damping = 1;
      suggestions.threshold = 1;
      suggestions.kernelPreset = 'gaussian';
      suggestions.gain = 0;
      suggestions.modulation = 0;
      suggestions.resolution = null;
      break;
    }
    case 'external-propulsion': {
      const beamPower = validation.params.beamPower;
      const sailArea = validation.params.sailArea;
      const momentumFlux = validation.params.momentumFlux;

      if (hasFiniteValue(momentumFlux)) {
        suggestions.threshold = Number((Math.min(1, momentumFlux / 5)).toPrecision(6));
        suggestions.modulation = Number((momentumFlux * 0.3).toPrecision(6));
      }

      if (hasFiniteValue(beamPower)) {
        suggestions.gain = Number((beamPower * 0.02).toPrecision(6));
        suggestions.noise = Number((1 / (1 + beamPower)).toPrecision(6));
      }

      if (hasFiniteValue(sailArea)) {
        suggestions.resolution = Number((Math.sqrt(sailArea) / 100).toPrecision(6));
      }

      suggestions.damping = Number(
        (1 - Math.min(0.9, (momentumFlux ?? 0) * 0.1)).toPrecision(6),
      );
      suggestions.kernelPreset = 'wave';
      break;
    }
    case 'sports-prediction': {
      const priorVariance = validation.params.priorVariance;
      const sampleSize = validation.params.sampleSize;
      const injuryUncertainty = validation.params.injuryUncertainty;

      if (hasFiniteValue(injuryUncertainty)) {
        suggestions.noise = Number(injuryUncertainty.toPrecision(6));
        suggestions.modulation = Number((injuryUncertainty * 0.5).toPrecision(6));
      }

      if (hasFiniteValue(priorVariance)) {
        suggestions.threshold = Number((1 - Math.min(0.95, priorVariance)).toPrecision(6));
        suggestions.gain = Number((1 / (1 + priorVariance)).toPrecision(6));
      }

      if (hasFiniteValue(sampleSize)) {
        suggestions.damping = Number((Math.min(0.95, Math.sqrt(sampleSize) / 40)).toPrecision(6));
      }

      suggestions.kernelPreset = 'gaussian';
      break;
    }
    case 'sports-climate': {
      const ambientTemperature = validation.params.ambientTemperature;
      const humidity = validation.params.humidity;
      const acclimatization = validation.params.acclimatization;

      if (hasFiniteValue(humidity)) {
        suggestions.noise = Number((Math.min(1, humidity / 100)).toPrecision(6));
        suggestions.damping = Number((1 - Math.min(0.8, humidity / 150)).toPrecision(6));
      }

      if (hasFiniteValue(acclimatization)) {
        suggestions.threshold = Number((Math.max(0.05, acclimatization)).toPrecision(6));
      }

      if (hasFiniteValue(ambientTemperature)) {
        suggestions.modulation = Number(((ambientTemperature - 20) * 0.02).toPrecision(6));
      }

      suggestions.kernelPreset = 'adaptive';
      break;
    }
    case 'climate-error-learning': {
      const observationResolution = validation.params.observationResolution;
      const modelOrder = validation.params.modelOrder;
      const errorMemory = validation.params.errorMemory;

      if (hasFiniteValue(errorMemory)) {
        suggestions.threshold = Number(errorMemory.toPrecision(6));
        suggestions.damping = Number((1 - errorMemory * 0.4).toPrecision(6));
      }

      if (hasFiniteValue(observationResolution)) {
        suggestions.noise = Number((1 / (1 + observationResolution / 20)).toPrecision(6));
        suggestions.resolution = Number((observationResolution / 100).toPrecision(6));
      }

      if (hasFiniteValue(modelOrder)) {
        suggestions.modulation = Number((modelOrder * 0.15).toPrecision(6));
      }

      suggestions.kernelPreset = 'exponential';
      break;
    }
    case 'meta-learning': {
      const controlGain = validation.params.controlGain;
      const regularization = validation.params.regularization;
      const identifiability = validation.params.identifiability;

      if (hasFiniteValue(controlGain)) {
        suggestions.damping = Number((1 - Math.min(0.9, controlGain * 0.15)).toPrecision(6));
        suggestions.modulation = Number((controlGain * 0.2).toPrecision(6));
      }

      if (hasFiniteValue(regularization)) {
        suggestions.noise = Number(regularization.toPrecision(6));
      }

      if (hasFiniteValue(identifiability)) {
        suggestions.threshold = Number(identifiability.toPrecision(6));
        suggestions.gain = Number((identifiability * 0.9).toPrecision(6));
      }

      suggestions.kernelPreset = 'adaptive';
      break;
    }
    case 'multidomain-integration': {
      const domainsCount = validation.params.domainsCount;
      const scaleVariance = validation.params.scaleVariance;
      const privacyBudget = validation.params.privacyBudget;

      if (hasFiniteValue(scaleVariance)) {
        suggestions.noise = Number((Math.min(1, scaleVariance / 200)).toPrecision(6));
        suggestions.modulation = Number((scaleVariance * 0.01).toPrecision(6));
      }

      if (hasFiniteValue(domainsCount)) {
        suggestions.threshold = Number((1 / Math.max(1, domainsCount)).toPrecision(6));
        suggestions.resolution = Number((domainsCount / 10).toPrecision(6));
      }

      if (hasFiniteValue(privacyBudget)) {
        suggestions.damping = Number((1 - Math.min(0.9, privacyBudget)).toPrecision(6));
        suggestions.gain = Number((1 / (1 + privacyBudget)).toPrecision(6));
      }

      suggestions.kernelPreset = 'gaussian';
      break;
    }
    default: {
      if (!resolvedEntry) {
        suggestions.kernelPreset = null;
      }
      break;
    }
  }

  return {
    entryId: validation.entryId,
    params: validation.params,
    warnings: validation.warnings,
    suggestions,
  };
};

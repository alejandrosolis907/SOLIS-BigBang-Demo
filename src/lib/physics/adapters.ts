import { getRegistryEntry } from './registry';
import { validateParams } from './validators';

export interface EngineSuggestions {
  readonly noise: number | null;
  readonly damping: number | null;
  readonly threshold: number | null;
  readonly kernel: string | null;
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
  kernel: null,
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
        suggestions.kernel = 'gaussian';
        suggestions.resolution = Number(correlationLength.toPrecision(6));
        suggestions.damping = Number((1 / (1 + correlationLength)).toPrecision(6));
      } else if (resolvedEntry) {
        suggestions.kernel = 'gaussian';
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

      suggestions.kernel = 'exponential';
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

      suggestions.kernel = 'lorentzian';
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

      suggestions.kernel = 'wave';
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

      suggestions.kernel = 'adaptive';
      break;
    }
    default: {
      if (!resolvedEntry) {
        suggestions.kernel = null;
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

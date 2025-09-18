import {
  getRegistryEntry,
  normalizeEntryId,
  PHYSICS_REGISTRY,
  PhysicsParameterDefinition,
  PhysicsRegistryEntry,
} from './registry';

export interface ValidationResult {
  readonly entryId: string;
  readonly params: Record<string, number>;
  readonly warnings: string[];
}

const clamp = (value: number, min?: number, max?: number): number => {
  let result = value;
  if (typeof min === 'number' && result < min) {
    result = min;
  }
  if (typeof max === 'number' && result > max) {
    result = max;
  }
  return result;
};

const enforceStep = (value: number, step?: number): number => {
  if (!step || step <= 0) {
    return value;
  }
  const stepped = Math.round(value / step) * step;
  return Number(stepped.toPrecision(12));
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const formatNumber = (value: number, precision = 6): string => {
  if (!Number.isFinite(value)) {
    return 'NaN';
  }
  return Number.isInteger(value) ? value.toString() : value.toPrecision(precision);
};

const toPrecisionNumber = (value: number, precision = 6): number => {
  if (!Number.isFinite(value)) {
    return value;
  }
  return Number(value.toPrecision(precision));
};

const HBAR = 1.054_571_817e-34;
const HBAR_HALF = HBAR / 2;
const ELECTRON_MASS = 9.109_383_56e-31;
const ELEMENTARY_CHARGE = 1.602_176_634e-19;
const ENERGY_PER_FUSION_EVENT = 2.82e-12;
const ENERGY_BUDGET_SCALING = 5e8;
const METERS_PER_PARSEC = 3.085_677_581_491_367_3e16;
const MIN_JEANS_LENGTH_PC = 0.05;
const MIN_JEANS_LENGTH_METERS = MIN_JEANS_LENGTH_PC * METERS_PER_PARSEC;
const GRAVITATIONAL_CONSTANT = 6.674_3e-11;

const sanitizeValue = (
  key: string,
  incoming: unknown,
  definition: PhysicsParameterDefinition,
  warnings: string[],
): number => {
  const { default: fallback, constraints } = definition;
  if (!isFiniteNumber(incoming)) {
    warnings.push(`Parameter "${key}" is invalid; defaulting to ${fallback}.`);
    return fallback;
  }

  let value = incoming;

  if (constraints.integer) {
    const rounded = Math.round(value);
    if (rounded !== value) {
      warnings.push(`Parameter "${key}" rounded to nearest integer (${rounded}).`);
    }
    value = rounded;
  }

  const stepped = enforceStep(value, constraints.step);
  if (stepped !== value) {
    warnings.push(`Parameter "${key}" adjusted to respect step of ${constraints.step}.`);
    value = stepped;
  }

  const clamped = clamp(value, constraints.min, constraints.max);
  if (clamped !== value) {
    const range = `${
      typeof constraints.min === 'number' ? constraints.min : '-∞'
    } to ${typeof constraints.max === 'number' ? constraints.max : '∞'}`;
    warnings.push(`Parameter "${key}" clamped to range ${range}.`);
    value = clamped;
  }

  if (!Number.isFinite(value)) {
    warnings.push(`Parameter "${key}" resolved to a non-finite value; resetting to default.`);
    return fallback;
  }

  return value;
};

const applyEntrySpecificConstraints = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  switch (entry.id) {
    case 'tunneling':
      enforceUncertaintyConstraint(entry, sanitized, warnings);
      break;
    case 'nuclear':
      enforceEnergyBudget(entry, sanitized, warnings);
      break;
    case 'star-formation':
      enforceJeansLimit(entry, sanitized, warnings);
      break;
    default:
      break;
  }
};

const enforceUncertaintyConstraint = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  const widthDefinition = entry.inputs.barrierWidth;
  const heightDefinition = entry.inputs.barrierHeight;

  if (!widthDefinition || !heightDefinition) {
    return;
  }

  let widthNm = sanitized.barrierWidth;
  if (!isFiniteNumber(widthNm)) {
    widthNm = widthDefinition.default;
    sanitized.barrierWidth = widthNm;
    warnings.push(
      `Parameter "barrierWidth" reset to default ${formatNumber(
        widthNm,
      )} nm for stability.`,
    );
  }

  let heightEv = sanitized.barrierHeight;
  if (!isFiniteNumber(heightEv)) {
    heightEv = heightDefinition.default;
    sanitized.barrierHeight = heightEv;
    warnings.push(
      `Parameter "barrierHeight" reset to default ${formatNumber(
        heightEv,
      )} eV for stability.`,
    );
  }

  if (widthNm <= 0) {
    const fallbackWidth = Math.max(
      widthDefinition.default,
      widthDefinition.constraints.min ?? 0,
    );
    sanitized.barrierWidth = fallbackWidth;
    widthNm = fallbackWidth;
    warnings.push(
      `Parameter "barrierWidth" adjusted to ${formatNumber(
        fallbackWidth,
      )} nm to avoid null spatial spread.`,
    );
  }

  const widthMeters = widthNm * 1e-9;
  const momentum = Math.sqrt(
    Math.max(0, 2 * ELECTRON_MASS * Math.max(heightEv, 0) * ELEMENTARY_CHARGE),
  );

  if (momentum <= 0) {
    if (widthMeters <= 0) {
      return;
    }
    const requiredMomentum = HBAR_HALF / widthMeters;
    const requiredHeightEv =
      (requiredMomentum * requiredMomentum) /
      (2 * ELECTRON_MASS * ELEMENTARY_CHARGE);

    if (Number.isFinite(requiredHeightEv) && requiredHeightEv > heightEv) {
      sanitized.barrierHeight = toPrecisionNumber(requiredHeightEv);
      warnings.push(
        `Parameter "barrierHeight" increased to ${formatNumber(
          sanitized.barrierHeight,
        )} eV to satisfy Δx·Δp ≥ ħ/2.`,
      );
    }
    return;
  }

  const product = widthMeters * momentum;
  if (product >= HBAR_HALF) {
    return;
  }

  const requiredDeltaX = HBAR_HALF / momentum;
  const requiredWidthNm = requiredDeltaX * 1e9;
  const maxWidth = widthDefinition.constraints.max ?? Number.POSITIVE_INFINITY;

  if (requiredWidthNm <= maxWidth) {
    if (requiredWidthNm > widthNm) {
      sanitized.barrierWidth = toPrecisionNumber(requiredWidthNm);
      warnings.push(
        `Parameter "barrierWidth" increased to ${formatNumber(
          sanitized.barrierWidth,
        )} nm to satisfy Δx·Δp ≥ ħ/2.`,
      );
    }
    return;
  }

  const requiredMomentum = HBAR_HALF / Math.max(widthMeters, 1e-30);
  const requiredHeightEv =
    (requiredMomentum * requiredMomentum) /
    (2 * ELECTRON_MASS * ELEMENTARY_CHARGE);

  if (Number.isFinite(requiredHeightEv) && requiredHeightEv > heightEv) {
    sanitized.barrierHeight = toPrecisionNumber(requiredHeightEv);
    warnings.push(
      `Parameter "barrierHeight" increased to ${formatNumber(
        sanitized.barrierHeight,
      )} eV to satisfy Δx·Δp ≥ ħ/2 within width constraints.`,
    );
  } else {
    warnings.push(
      'Unable to enforce Δx·Δp ≥ ħ/2 with provided tunneling parameters.',
    );
  }
};

const enforceEnergyBudget = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  const fusionRate = sanitized.fusionRate;
  const confinementTime = sanitized.confinementTime;
  const plasmaDensity = sanitized.plasmaDensity;

  if (!isFiniteNumber(fusionRate) || !isFiniteNumber(confinementTime)) {
    return;
  }

  if (!isFiniteNumber(plasmaDensity) || plasmaDensity <= 0) {
    if (fusionRate !== 0) {
      sanitized.fusionRate = 0;
      warnings.push(
        'Parameter "fusionRate" set to 0 due to null plasma density to conserve energy.',
      );
    }
    return;
  }

  const requestedEnergy =
    Math.max(fusionRate, 0) * Math.max(confinementTime, 0) * ENERGY_PER_FUSION_EVENT;
  const availableEnergy = plasmaDensity * ENERGY_BUDGET_SCALING;

  if (availableEnergy <= 0) {
    if (fusionRate !== 0) {
      sanitized.fusionRate = 0;
      warnings.push(
        'Parameter "fusionRate" set to 0 due to insufficient energy budget.',
      );
    }
    return;
  }

  if (requestedEnergy <= availableEnergy) {
    return;
  }

  const safeFusionRate =
    availableEnergy /
    (ENERGY_PER_FUSION_EVENT * Math.max(confinementTime, 1e-9));

  if (Number.isFinite(safeFusionRate) && safeFusionRate < fusionRate) {
    sanitized.fusionRate = toPrecisionNumber(safeFusionRate);
    warnings.push(
      `Parameter "fusionRate" reduced to ${formatNumber(
        sanitized.fusionRate,
      )} 1/s to conserve energy.`,
    );
  }
};

const enforceJeansLimit = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  const gasDensity = sanitized.gasDensity;
  let turbulence = sanitized.turbulence;

  if (!isFiniteNumber(gasDensity) || gasDensity <= 0) {
    return;
  }

  if (!isFiniteNumber(turbulence)) {
    turbulence = entry.inputs.turbulence?.default ?? 0;
    sanitized.turbulence = turbulence;
    warnings.push(
      `Parameter "turbulence" reset to default ${formatNumber(
        turbulence,
      )} km/s for stability.`,
    );
  }

  const soundSpeed = Math.max(turbulence, 0) * 1_000;
  const jeansLength = Math.sqrt(
    (15 * soundSpeed * soundSpeed) /
      (4 * Math.PI * GRAVITATIONAL_CONSTANT * gasDensity),
  );

  if (!Number.isFinite(jeansLength) || jeansLength >= MIN_JEANS_LENGTH_METERS) {
    return;
  }

  const requiredSoundSpeed = Math.sqrt(
    (MIN_JEANS_LENGTH_METERS * MIN_JEANS_LENGTH_METERS *
      4 * Math.PI * GRAVITATIONAL_CONSTANT *
      gasDensity) /
      15,
  );

  if (!Number.isFinite(requiredSoundSpeed) || requiredSoundSpeed <= soundSpeed) {
    return;
  }

  const requiredTurbulence = requiredSoundSpeed / 1_000;
  sanitized.turbulence = toPrecisionNumber(requiredTurbulence);
  warnings.push(
    `Parameter "turbulence" increased to ${formatNumber(
      sanitized.turbulence,
    )} km/s to satisfy Jeans length ≥ ${MIN_JEANS_LENGTH_PC} pc.`,
  );
};

export const validateParams = (
  entryId: string,
  params: Record<string, unknown> = {},
): ValidationResult => {
  const normalizedId = normalizeEntryId(entryId);
  const entry = getRegistryEntry(entryId);

  if (!entry) {
    return {
      entryId: normalizedId,
      params: {},
      warnings: [`Unknown physics registry entry: ${entryId}.`],
    };
  }

  const sanitized: Record<string, number> = {};
  const warnings: string[] = [];

  Object.entries(entry.inputs).forEach(([key, definition]) => {
    const value = sanitizeValue(key, params?.[key], definition, warnings);
    sanitized[key] = value;
  });

  Object.keys(params ?? {}).forEach((key) => {
    if (!(key in entry.inputs)) {
      warnings.push(`Parameter "${key}" is not defined for entry ${entry.id}.`);
    }
  });

  applyEntrySpecificConstraints(entry, sanitized, warnings);

  return {
    entryId: entry.id,
    params: sanitized,
    warnings,
  };
};

export type RegistryParameterId = keyof typeof PHYSICS_REGISTRY;

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
    case 'social-dynamics':
      enforceSocialDynamicsConstraints(entry, sanitized, warnings);
      break;
    case 'affective-bonds':
      enforceAffectiveBondConstraints(entry, sanitized, warnings);
      break;
    case 'neuromarketing':
      enforceNeuromarketingLimits(entry, sanitized, warnings);
      break;
    case 'reactionless-propulsion':
      enforceReactionlessProhibition(entry, sanitized, warnings);
      break;
    case 'external-propulsion':
      enforceExternalPropulsionBudgets(entry, sanitized, warnings);
      break;
    case 'sports-prediction':
      enforceSportsPredictionBounds(entry, sanitized, warnings);
      break;
    case 'sports-climate':
      enforceSportsClimateLimits(entry, sanitized, warnings);
      break;
    case 'climate-error-learning':
      enforceClimateErrorLearning(entry, sanitized, warnings);
      break;
    case 'meta-learning':
      enforceMetaLearningBounds(entry, sanitized, warnings);
      break;
    case 'multidomain-integration':
      enforceMultidomainIntegration(entry, sanitized, warnings);
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

const enforceSocialDynamicsConstraints = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  const biasDefinition = entry.inputs.cooperationBias;
  const networkDefinition = entry.inputs.networkDensity;
  const loadDefinition = entry.inputs.cognitiveLoad;

  const cooperationBias = sanitized.cooperationBias;
  let networkDensity = sanitized.networkDensity;
  let cognitiveLoad = sanitized.cognitiveLoad;

  if (!isFiniteNumber(networkDensity) && networkDefinition) {
    networkDensity = networkDefinition.default;
    sanitized.networkDensity = networkDensity;
    warnings.push(
      `Parameter "networkDensity" reset to default ${formatNumber(
        networkDensity,
      )} to maintain topology constraints.`,
    );
  }

  if (!isFiniteNumber(cognitiveLoad) && loadDefinition) {
    cognitiveLoad = loadDefinition.default;
    sanitized.cognitiveLoad = cognitiveLoad;
    warnings.push(
      `Parameter "cognitiveLoad" reset to default ${formatNumber(
        cognitiveLoad,
      )} under limited attention assumptions.`,
    );
  }

  if (isFiniteNumber(networkDensity) && isFiniteNumber(cognitiveLoad)) {
    const maxLoad = Math.min(0.85, Math.max(0.05, 0.75 - networkDensity * 0.3));
    if (cognitiveLoad > maxLoad) {
      sanitized.cognitiveLoad = toPrecisionNumber(maxLoad);
      warnings.push(
        `Parameter "cognitiveLoad" reduced to ${formatNumber(
          sanitized.cognitiveLoad,
        )} to respect attention limits at network density ${formatNumber(
          networkDensity,
        )}.`,
      );
      cognitiveLoad = sanitized.cognitiveLoad;
    }
  }

  if (isFiniteNumber(cooperationBias) && biasDefinition) {
    const density = isFiniteNumber(networkDensity)
      ? Math.max(0, Math.min(1, networkDensity))
      : networkDefinition?.default ?? 0.3;
    const load = isFiniteNumber(cognitiveLoad)
      ? Math.max(0, Math.min(1, cognitiveLoad))
      : loadDefinition?.default ?? 0.4;
    const attentionBudget = Math.max(0.2, 1 - load * 0.8);
    const topologyPenalty = 1 - density * 0.4;
    const maxBias = Math.max(
      0.1,
      Math.min(0.95, toPrecisionNumber(attentionBudget * topologyPenalty)),
    );
    if (cooperationBias > maxBias) {
      sanitized.cooperationBias = toPrecisionNumber(maxBias);
      warnings.push(
        `Parameter "cooperationBias" limited to ${formatNumber(
          sanitized.cooperationBias,
        )} due to attention and topology constraints.`,
      );
    }
  }
};

const enforceAffectiveBondConstraints = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  let privacyRisk = sanitized.privacyRisk;
  const trustIndex = sanitized.trustIndex;
  let oxytocinLevel = sanitized.oxytocinLevel;

  if (!isFiniteNumber(privacyRisk)) {
    privacyRisk = entry.inputs.privacyRisk?.default ?? 0.2;
    sanitized.privacyRisk = privacyRisk;
    warnings.push(
      `Parameter "privacyRisk" reset to default ${formatNumber(
        privacyRisk,
      )} to enforce consent safeguards.`,
    );
  }

  if (isFiniteNumber(trustIndex)) {
    const maxTrust = Math.min(0.95, toPrecisionNumber(1 - privacyRisk * 0.45));
    if (trustIndex > maxTrust) {
      sanitized.trustIndex = maxTrust;
      warnings.push(
        `Parameter "trustIndex" reduced to ${formatNumber(
          sanitized.trustIndex,
        )} to honour privacy/consent boundaries.`,
      );
    }
  }

  if (isFiniteNumber(privacyRisk) && privacyRisk < 0.05) {
    sanitized.privacyRisk = toPrecisionNumber(0.05);
    warnings.push(
      'Parameter "privacyRisk" elevated to 0.05 to avoid zero-consent modelling.',
    );
    privacyRisk = sanitized.privacyRisk;
  }

  if (!isFiniteNumber(oxytocinLevel)) {
    oxytocinLevel = entry.inputs.oxytocinLevel?.default ?? 80;
    sanitized.oxytocinLevel = oxytocinLevel;
    warnings.push(
      `Parameter "oxytocinLevel" reset to default ${formatNumber(
        oxytocinLevel,
      )} pmol/L for stability.`,
    );
  }

  if (isFiniteNumber(oxytocinLevel) && oxytocinLevel > 160 && privacyRisk < 0.2) {
    sanitized.oxytocinLevel = toPrecisionNumber(160);
    sanitized.privacyRisk = toPrecisionNumber(0.2);
    warnings.push(
      'Parameters "oxytocinLevel" and "privacyRisk" adjusted to keep neurobiological excitation compatible with consent.',
    );
  }
};

const enforceNeuromarketingLimits = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  let frequency = sanitized.stimulusFrequency;
  let duration = sanitized.sessionDuration;
  let compliance = sanitized.ethicalCompliance;

  if (!isFiniteNumber(frequency)) {
    frequency = entry.inputs.stimulusFrequency?.default ?? 2;
    sanitized.stimulusFrequency = frequency;
    warnings.push(
      `Parameter "stimulusFrequency" reset to default ${formatNumber(
        frequency,
      )} Hz to avoid undefined cadence.`,
    );
  }

  if (!isFiniteNumber(duration)) {
    duration = entry.inputs.sessionDuration?.default ?? 30;
    sanitized.sessionDuration = duration;
    warnings.push(
      `Parameter "sessionDuration" reset to default ${formatNumber(
        duration,
      )} minutes for stability.`,
    );
  }

  if (!isFiniteNumber(compliance)) {
    compliance = entry.inputs.ethicalCompliance?.default ?? 0.6;
    sanitized.ethicalCompliance = compliance;
    warnings.push(
      `Parameter "ethicalCompliance" reset to default ${formatNumber(
        compliance,
      )} to enforce legal constraints.`,
    );
  }

  const maxExposure = 450;
  const intensity = frequency * duration;
  if (Number.isFinite(intensity) && intensity > maxExposure) {
    const adjustedFrequency = Math.max(0, maxExposure / Math.max(duration, 1));
    sanitized.stimulusFrequency = toPrecisionNumber(adjustedFrequency);
    warnings.push(
      `Parameter "stimulusFrequency" lowered to ${formatNumber(
        sanitized.stimulusFrequency,
      )} Hz to avoid attentional fatigue beyond ${maxExposure}.`,
    );
  }

  if (compliance < 0.4) {
    sanitized.ethicalCompliance = toPrecisionNumber(0.4);
    warnings.push(
      'Parameter "ethicalCompliance" raised to 0.4 as minimum regulatory threshold.',
    );
  }

  if (sanitized.ethicalCompliance < 0.7) {
    const adjustedLimit = 320;
    const safeIntensity = sanitized.sessionDuration * sanitized.stimulusFrequency;
    if (Number.isFinite(safeIntensity) && safeIntensity > adjustedLimit) {
      const cappedFrequency = Math.max(0, adjustedLimit / Math.max(duration, 1));
      sanitized.stimulusFrequency = toPrecisionNumber(cappedFrequency);
      warnings.push(
        `Parameter "stimulusFrequency" capped to ${formatNumber(
          sanitized.stimulusFrequency,
        )} Hz under reduced ethical compliance.`,
      );
    }
  }
};

const enforceReactionlessProhibition = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  const { momentumDemand, energyInput, systemClosure } = sanitized;

  if (momentumDemand > 0) {
    sanitized.momentumDemand = 0;
    warnings.push(
      'Parameter "momentumDemand" set to 0 — reactionless propulsion is not permitted in closed systems.',
    );
  }

  if (energyInput > 0) {
    sanitized.energyInput = 0;
    warnings.push(
      'Parameter "energyInput" set to 0 to reflect conservation of momentum.',
    );
  }

  if (!isFiniteNumber(systemClosure) || systemClosure < 1) {
    sanitized.systemClosure = 1;
    warnings.push(
      'Parameter "systemClosure" forced to 1 (sistema cerrado) for the negative control case.',
    );
  }

  warnings.push(
    'Scenario enforces conservation laws: propulsión sin eyección de masa permanece deshabilitada.',
  );
};

const enforceExternalPropulsionBudgets = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  let beamPower = sanitized.beamPower;
  let sailArea = sanitized.sailArea;
  let momentumFlux = sanitized.momentumFlux;

  if (!isFiniteNumber(beamPower)) {
    beamPower = entry.inputs.beamPower?.default ?? 1;
    sanitized.beamPower = beamPower;
    warnings.push(
      `Parameter "beamPower" reset to default ${formatNumber(
        beamPower,
      )} MW due to invalid input.`,
    );
  }

  if (!isFiniteNumber(sailArea)) {
    sailArea = entry.inputs.sailArea?.default ?? 100;
    sanitized.sailArea = sailArea;
    warnings.push(
      `Parameter "sailArea" reset to default ${formatNumber(
        sailArea,
      )} m^2 due to invalid input.`,
    );
  }

  if (!isFiniteNumber(momentumFlux)) {
    momentumFlux = entry.inputs.momentumFlux?.default ?? 0.1;
    sanitized.momentumFlux = momentumFlux;
    warnings.push(
      `Parameter "momentumFlux" reset to default ${formatNumber(
        momentumFlux,
      )} N/m^2 due to invalid input.`,
    );
  }

  const areaFactor = Math.max(1, Math.sqrt(Math.max(sailArea, 1) / 400));
  const maxFlux = Math.max(0.01, toPrecisionNumber((beamPower * 0.08) / areaFactor));
  if (momentumFlux > maxFlux) {
    sanitized.momentumFlux = maxFlux;
    warnings.push(
      `Parameter "momentumFlux" limited to ${formatNumber(
        maxFlux,
      )} N/m^2 to remain within external momentum budgets.`,
    );
  }

  const minPower = toPrecisionNumber((sanitized.momentumFlux * areaFactor) / 0.12);
  if (beamPower < minPower) {
    sanitized.beamPower = Math.min(
      entry.inputs.beamPower?.constraints.max ?? Number.POSITIVE_INFINITY,
      Math.max(minPower, beamPower),
    );
    warnings.push(
      `Parameter "beamPower" increased to ${formatNumber(
        sanitized.beamPower,
      )} MW to support requested momentum flux.`,
    );
  }
};

const enforceSportsPredictionBounds = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  let variance = sanitized.priorVariance;
  let sampleSize = sanitized.sampleSize;
  let injuryUncertainty = sanitized.injuryUncertainty;

  if (!isFiniteNumber(variance)) {
    variance = entry.inputs.priorVariance?.default ?? 0.2;
    sanitized.priorVariance = variance;
    warnings.push(
      `Parameter "priorVariance" reset to default ${formatNumber(
        variance,
      )} due to invalid input.`,
    );
  }

  if (!isFiniteNumber(sampleSize)) {
    sampleSize = entry.inputs.sampleSize?.default ?? 10;
    sanitized.sampleSize = sampleSize;
    warnings.push(
      `Parameter "sampleSize" reset to default ${formatNumber(
        sampleSize,
      )} to maintain statistical grounding.`,
    );
  }

  if (!isFiniteNumber(injuryUncertainty)) {
    injuryUncertainty = entry.inputs.injuryUncertainty?.default ?? 0.2;
    sanitized.injuryUncertainty = injuryUncertainty;
    warnings.push(
      `Parameter "injuryUncertainty" reset to default ${formatNumber(
        injuryUncertainty,
      )} to reflect residual variance.`,
    );
  }

  const minSample = Math.min(
    entry.inputs.sampleSize?.constraints.max ?? 500,
    Math.max(5, Math.ceil(12 / Math.max(variance, 0.05))),
  );
  if (sampleSize < minSample) {
    sanitized.sampleSize = minSample;
    warnings.push(
      `Parameter "sampleSize" raised to ${formatNumber(
        sanitized.sampleSize,
      )} to prevent overfitting with variance ${formatNumber(variance)}.`,
    );
  }

  const maxVariance = Math.min(0.6, 1 / Math.sqrt(sanitized.sampleSize + 1));
  if (variance > maxVariance) {
    sanitized.priorVariance = toPrecisionNumber(maxVariance);
    warnings.push(
      `Parameter "priorVariance" reduced to ${formatNumber(
        sanitized.priorVariance,
      )} to respect sample-driven variance limits.`,
    );
  }

  if (injuryUncertainty < 0.1 && sanitized.sampleSize < 40) {
    sanitized.injuryUncertainty = toPrecisionNumber(0.1);
    warnings.push(
      'Parameter "injuryUncertainty" elevated to 0.1 to capture residual stochasticity.',
    );
  }
};

const enforceSportsClimateLimits = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  let temperature = sanitized.ambientTemperature;
  let humidity = sanitized.humidity;
  let acclimatization = sanitized.acclimatization;

  if (!isFiniteNumber(temperature)) {
    temperature = entry.inputs.ambientTemperature?.default ?? 20;
    sanitized.ambientTemperature = temperature;
    warnings.push(
      `Parameter "ambientTemperature" reset to default ${formatNumber(
        temperature,
      )} °C due to invalid input.`,
    );
  }

  if (!isFiniteNumber(humidity)) {
    humidity = entry.inputs.humidity?.default ?? 50;
    sanitized.humidity = humidity;
    warnings.push(
      `Parameter "humidity" reset to default ${formatNumber(
        humidity,
      )}% due to invalid input.`,
    );
  }

  if (!isFiniteNumber(acclimatization)) {
    acclimatization = entry.inputs.acclimatization?.default ?? 0.5;
    sanitized.acclimatization = acclimatization;
    warnings.push(
      `Parameter "acclimatization" reset to default ${formatNumber(
        acclimatization,
      )} to maintain physiological realism.`,
    );
  }

  const heatIndex = temperature + humidity * 0.1;
  if (heatIndex > 60) {
    const targetHumidity = Math.max(0, (60 - temperature) / 0.1);
    sanitized.humidity = toPrecisionNumber(Math.min(targetHumidity, 100));
    warnings.push(
      `Parameter "humidity" reduced to ${formatNumber(
        sanitized.humidity,
      )}% to keep heat index within safe limits.`,
    );
  }

  if (heatIndex > 50 && acclimatization < 0.2) {
    sanitized.acclimatization = toPrecisionNumber(0.2);
    warnings.push(
      'Parameter "acclimatization" raised to 0.2 to avoid heat-exertion violations.',
    );
  }

  if (temperature < -10 && acclimatization < 0.3) {
    sanitized.acclimatization = toPrecisionNumber(0.3);
    warnings.push(
      'Parameter "acclimatization" raised to 0.3 to satisfy cold-weather constraints.',
    );
  }
};

const enforceClimateErrorLearning = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  let resolution = sanitized.observationResolution;
  let modelOrder = sanitized.modelOrder;
  let errorMemory = sanitized.errorMemory;

  if (!isFiniteNumber(resolution)) {
    resolution = entry.inputs.observationResolution?.default ?? 50;
    sanitized.observationResolution = resolution;
    warnings.push(
      `Parameter "observationResolution" reset to default ${formatNumber(
        resolution,
      )} km due to invalid input.`,
    );
  }

  if (!isFiniteNumber(modelOrder)) {
    modelOrder = entry.inputs.modelOrder?.default ?? 3;
    sanitized.modelOrder = modelOrder;
    warnings.push(
      `Parameter "modelOrder" reset to default ${formatNumber(
        modelOrder,
      )} to maintain model stability.`,
    );
  }

  if (!isFiniteNumber(errorMemory)) {
    errorMemory = entry.inputs.errorMemory?.default ?? 0.4;
    sanitized.errorMemory = errorMemory;
    warnings.push(
      `Parameter "errorMemory" reset to default ${formatNumber(
        errorMemory,
      )} due to invalid input.`,
    );
  }

  const minResolution = Math.max(5, modelOrder * 4);
  if (resolution < minResolution) {
    sanitized.observationResolution = toPrecisionNumber(minResolution);
    warnings.push(
      `Parameter "observationResolution" increased to ${formatNumber(
        sanitized.observationResolution,
      )} km to avoid undersampling relative to model order ${formatNumber(
        modelOrder,
      )}.`,
    );
  }

  if (errorMemory > 0.85) {
    sanitized.errorMemory = toPrecisionNumber(0.85);
    warnings.push(
      'Parameter "errorMemory" limited to 0.85 to prevent instability in feedback loops.',
    );
  }

  if (sanitized.observationResolution < 15 && errorMemory > 0.5) {
    sanitized.errorMemory = toPrecisionNumber(0.5);
    warnings.push(
      'Parameter "errorMemory" reduced to 0.5 for high-resolution assimilation.',
    );
  }
};

const enforceMetaLearningBounds = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  let controlGain = sanitized.controlGain;
  let regularization = sanitized.regularization;
  let identifiability = sanitized.identifiability;

  if (!isFiniteNumber(controlGain)) {
    controlGain = entry.inputs.controlGain?.default ?? 0.8;
    sanitized.controlGain = controlGain;
    warnings.push(
      `Parameter "controlGain" reset to default ${formatNumber(
        controlGain,
      )} for stability.`,
    );
  }

  if (!isFiniteNumber(regularization)) {
    regularization = entry.inputs.regularization?.default ?? 0.3;
    sanitized.regularization = regularization;
    warnings.push(
      `Parameter "regularization" reset to default ${formatNumber(
        regularization,
      )} to avoid instability.`,
    );
  }

  if (!isFiniteNumber(identifiability)) {
    identifiability = entry.inputs.identifiability?.default ?? 0.6;
    sanitized.identifiability = identifiability;
    warnings.push(
      `Parameter "identifiability" reset to default ${formatNumber(
        identifiability,
      )} to preserve model coherence.`,
    );
  }

  const maxGain = Math.max(0.1, toPrecisionNumber((1 - regularization) * 2.5));
  if (controlGain > maxGain) {
    sanitized.controlGain = toPrecisionNumber(maxGain);
    warnings.push(
      `Parameter "controlGain" limited to ${formatNumber(
        sanitized.controlGain,
      )} to maintain closed-loop stability.`,
    );
  }

  if (regularization < 0.1) {
    sanitized.regularization = toPrecisionNumber(0.1);
    warnings.push('Parameter "regularization" raised to 0.1 to damp chaos amplification.');
    regularization = sanitized.regularization;
  }

  const minIdentifiability = Math.min(0.95, toPrecisionNumber(regularization * 0.5 + 0.3));
  if (identifiability < minIdentifiability) {
    sanitized.identifiability = minIdentifiability;
    warnings.push(
      `Parameter "identifiability" increased to ${formatNumber(
        sanitized.identifiability,
      )} to ensure the system remains observable.`,
    );
  }
};

const enforceMultidomainIntegration = (
  entry: PhysicsRegistryEntry,
  sanitized: Record<string, number>,
  warnings: string[],
): void => {
  let domains = sanitized.domainsCount;
  let scaleVariance = sanitized.scaleVariance;
  let privacyBudget = sanitized.privacyBudget;

  if (!isFiniteNumber(domains)) {
    domains = entry.inputs.domainsCount?.default ?? 2;
    sanitized.domainsCount = domains;
    warnings.push(
      `Parameter "domainsCount" reset to default ${formatNumber(
        domains,
      )} to maintain integration scope.`,
    );
  }

  if (!isFiniteNumber(scaleVariance)) {
    scaleVariance = entry.inputs.scaleVariance?.default ?? 10;
    sanitized.scaleVariance = scaleVariance;
    warnings.push(
      `Parameter "scaleVariance" reset to default ${formatNumber(
        scaleVariance,
      )}% due to invalid input.`,
    );
  }

  if (!isFiniteNumber(privacyBudget)) {
    privacyBudget = entry.inputs.privacyBudget?.default ?? 0.3;
    sanitized.privacyBudget = privacyBudget;
    warnings.push(
      `Parameter "privacyBudget" reset to default ${formatNumber(
        privacyBudget,
      )} to maintain ethical compliance.`,
    );
  }

  const maxVariance = Math.max(5, domains * 20);
  if (scaleVariance > maxVariance) {
    sanitized.scaleVariance = toPrecisionNumber(maxVariance);
    warnings.push(
      `Parameter "scaleVariance" limited to ${formatNumber(
        sanitized.scaleVariance,
      )}% to preserve cross-domain compatibility.`,
    );
  }

  const maxPrivacy = Math.min(0.9, toPrecisionNumber(0.6 / Math.max(domains, 1) + 0.2));
  if (privacyBudget > maxPrivacy) {
    sanitized.privacyBudget = maxPrivacy;
    warnings.push(
      `Parameter "privacyBudget" capped at ${formatNumber(
        sanitized.privacyBudget,
      )} to satisfy privacy/ethics aggregation.`,
    );
  }

  if (privacyBudget < 0.05) {
    sanitized.privacyBudget = toPrecisionNumber(0.05);
    warnings.push(
      'Parameter "privacyBudget" raised to 0.05 to avoid degenerate privacy budgets.',
    );
  }
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

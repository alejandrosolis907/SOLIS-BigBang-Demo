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
  const label = definition.label ?? key;
  if (!isFiniteNumber(incoming)) {
    warnings.push(
      `El parámetro "${label}" es inválido; se restablece al valor predeterminado ${fallback}.`,
    );
    return fallback;
  }

  let value = incoming;

  if (constraints.integer) {
    const rounded = Math.round(value);
    if (rounded !== value) {
      warnings.push(
        `El parámetro "${label}" se redondeó al entero más cercano (${rounded}).`,
      );
    }
    value = rounded;
  }

  const stepped = enforceStep(value, constraints.step);
  if (stepped !== value) {
    warnings.push(
      `El parámetro "${label}" se ajustó para respetar un paso de ${constraints.step}.`,
    );
    value = stepped;
  }

  const clamped = clamp(value, constraints.min, constraints.max);
  if (clamped !== value) {
    const minValue = typeof constraints.min === 'number' ? constraints.min : '-∞';
    const maxValue = typeof constraints.max === 'number' ? constraints.max : '∞';
    const range = `${minValue} a ${maxValue}`;
    warnings.push(`El parámetro "${label}" se limitó al rango ${range}.`);
    value = clamped;
  }

  if (!Number.isFinite(value)) {
    warnings.push(
      `El parámetro "${label}" resultó en un valor no finito; se restaura al predeterminado.`,
    );
    return fallback;
  }

  return value;
};

const resolveLabel = (entry: PhysicsRegistryEntry, key: string): string =>
  entry.inputs[key]?.label ?? key;

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
    case 'human-behavior-mechanisms':
      enforceSocialDynamicsConstraints(entry, sanitized, warnings);
      enforceAffectiveBondConstraints(entry, sanitized, warnings);
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

  const widthLabel = resolveLabel(entry, 'barrierWidth');
  const heightLabel = resolveLabel(entry, 'barrierHeight');

  let widthNm = sanitized.barrierWidth;
  if (!isFiniteNumber(widthNm)) {
    widthNm = widthDefinition.default;
    sanitized.barrierWidth = widthNm;
    warnings.push(
      `El parámetro "${widthLabel}" se restableció al valor predeterminado ${formatNumber(
        widthNm,
      )} nm para mantener la estabilidad.`,
    );
  }

  let heightEv = sanitized.barrierHeight;
  if (!isFiniteNumber(heightEv)) {
    heightEv = heightDefinition.default;
    sanitized.barrierHeight = heightEv;
    warnings.push(
      `El parámetro "${heightLabel}" se restableció al valor predeterminado ${formatNumber(
        heightEv,
      )} eV para mantener la estabilidad.`,
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
      `El parámetro "${widthLabel}" se ajustó a ${formatNumber(
        fallbackWidth,
      )} nm para evitar una extensión espacial nula.`,
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
        `El parámetro "${heightLabel}" se incrementó a ${formatNumber(
          sanitized.barrierHeight,
        )} eV para satisfacer Δx·Δp ≥ ħ/2.`,
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
        `El parámetro "${widthLabel}" se incrementó a ${formatNumber(
          sanitized.barrierWidth,
        )} nm para satisfacer Δx·Δp ≥ ħ/2.`,
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
      `El parámetro "${heightLabel}" se incrementó a ${formatNumber(
        sanitized.barrierHeight,
      )} eV para satisfacer Δx·Δp ≥ ħ/2 dentro de las restricciones de ancho.`,
    );
  } else {
    warnings.push(
      'No fue posible imponer Δx·Δp ≥ ħ/2 con los parámetros de túnel proporcionados.',
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

  const fusionLabel = resolveLabel(entry, 'fusionRate');
  const densityLabel = resolveLabel(entry, 'plasmaDensity');

  if (!isFiniteNumber(fusionRate) || !isFiniteNumber(confinementTime)) {
    return;
  }

  if (!isFiniteNumber(plasmaDensity) || plasmaDensity <= 0) {
    if (fusionRate !== 0) {
      sanitized.fusionRate = 0;
      warnings.push(
        `El parámetro "${fusionLabel}" se fijó en 0 porque "${densityLabel}" es nulo, conservando la energía.`,
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
        `El parámetro "${fusionLabel}" se fijó en 0 por un presupuesto de energía insuficiente.`,
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
      `El parámetro "${fusionLabel}" se redujo a ${formatNumber(
        sanitized.fusionRate,
      )} 1/s para conservar energía.`,
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

  const turbulenceLabel = resolveLabel(entry, 'turbulence');

  if (!isFiniteNumber(gasDensity) || gasDensity <= 0) {
    return;
  }

  if (!isFiniteNumber(turbulence)) {
    turbulence = entry.inputs.turbulence?.default ?? 0;
    sanitized.turbulence = turbulence;
    warnings.push(
      `El parámetro "${turbulenceLabel}" se restableció al valor predeterminado ${formatNumber(
        turbulence,
      )} km/s para mantener la estabilidad.`,
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
    `El parámetro "${turbulenceLabel}" se incrementó a ${formatNumber(
      sanitized.turbulence,
    )} km/s para satisfacer que la longitud de Jeans sea ≥ ${MIN_JEANS_LENGTH_PC} pc.`,
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

  const networkLabel = resolveLabel(entry, 'networkDensity');
  const loadLabel = resolveLabel(entry, 'cognitiveLoad');
  const cooperationLabel = resolveLabel(entry, 'cooperationBias');

  if (!isFiniteNumber(networkDensity) && networkDefinition) {
    networkDensity = networkDefinition.default;
    sanitized.networkDensity = networkDensity;
    warnings.push(
      `El parámetro "${networkLabel}" se restableció al valor predeterminado ${formatNumber(
        networkDensity,
      )} para mantener las restricciones de topología.`,
    );
  }

  if (!isFiniteNumber(cognitiveLoad) && loadDefinition) {
    cognitiveLoad = loadDefinition.default;
    sanitized.cognitiveLoad = cognitiveLoad;
    warnings.push(
      `El parámetro "${loadLabel}" se restableció al valor predeterminado ${formatNumber(
        cognitiveLoad,
      )} bajo supuestos de atención limitada.`,
    );
  }

  if (isFiniteNumber(networkDensity) && isFiniteNumber(cognitiveLoad)) {
    const maxLoad = Math.min(0.85, Math.max(0.05, 0.75 - networkDensity * 0.3));
    if (cognitiveLoad > maxLoad) {
      sanitized.cognitiveLoad = toPrecisionNumber(maxLoad);
      warnings.push(
        `El parámetro "${loadLabel}" se redujo a ${formatNumber(
          sanitized.cognitiveLoad,
        )} para respetar los límites de atención con una densidad de red de ${formatNumber(
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
        `El parámetro "${cooperationLabel}" se limitó a ${formatNumber(
          sanitized.cooperationBias,
        )} debido a restricciones de atención y topología.`,
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

  const privacyLabel = resolveLabel(entry, 'privacyRisk');
  const trustLabel = resolveLabel(entry, 'trustIndex');
  const oxytocinLabel = resolveLabel(entry, 'oxytocinLevel');

  if (!isFiniteNumber(privacyRisk)) {
    privacyRisk = entry.inputs.privacyRisk?.default ?? 0.2;
    sanitized.privacyRisk = privacyRisk;
    warnings.push(
      `El parámetro "${privacyLabel}" se restableció al valor predeterminado ${formatNumber(
        privacyRisk,
      )} para reforzar las salvaguardas de consentimiento.`,
    );
  }

  if (isFiniteNumber(trustIndex)) {
    const maxTrust = Math.min(0.95, toPrecisionNumber(1 - privacyRisk * 0.45));
    if (trustIndex > maxTrust) {
      sanitized.trustIndex = maxTrust;
      warnings.push(
        `El parámetro "${trustLabel}" se redujo a ${formatNumber(
          sanitized.trustIndex,
        )} para respetar los límites de privacidad y consentimiento.`,
      );
    }
  }

  if (isFiniteNumber(privacyRisk) && privacyRisk < 0.05) {
    sanitized.privacyRisk = toPrecisionNumber(0.05);
    warnings.push(
      `El parámetro "${privacyLabel}" se elevó a 0.05 para evitar modelos sin consentimiento.`,
    );
    privacyRisk = sanitized.privacyRisk;
  }

  if (!isFiniteNumber(oxytocinLevel)) {
    oxytocinLevel = entry.inputs.oxytocinLevel?.default ?? 80;
    sanitized.oxytocinLevel = oxytocinLevel;
    warnings.push(
      `El parámetro "${oxytocinLabel}" se restableció al valor predeterminado ${formatNumber(
        oxytocinLevel,
      )} pmol/L para mantener la estabilidad.`,
    );
  }

  if (isFiniteNumber(oxytocinLevel) && oxytocinLevel > 160 && privacyRisk < 0.2) {
    sanitized.oxytocinLevel = toPrecisionNumber(160);
    sanitized.privacyRisk = toPrecisionNumber(0.2);
    warnings.push(
      `Los parámetros "${oxytocinLabel}" y "${privacyLabel}" se ajustaron para mantener la excitación neurobiológica compatible con el consentimiento.`,
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

  const frequencyLabel = resolveLabel(entry, 'stimulusFrequency');
  const durationLabel = resolveLabel(entry, 'sessionDuration');
  const complianceLabel = resolveLabel(entry, 'ethicalCompliance');

  if (!isFiniteNumber(frequency)) {
    frequency = entry.inputs.stimulusFrequency?.default ?? 2;
    sanitized.stimulusFrequency = frequency;
    warnings.push(
      `El parámetro "${frequencyLabel}" se restableció al valor predeterminado ${formatNumber(
        frequency,
      )} Hz para evitar una cadencia indefinida.`,
    );
  }

  if (!isFiniteNumber(duration)) {
    duration = entry.inputs.sessionDuration?.default ?? 30;
    sanitized.sessionDuration = duration;
    warnings.push(
      `El parámetro "${durationLabel}" se restableció al valor predeterminado ${formatNumber(
        duration,
      )} minutos para mantener la estabilidad.`,
    );
  }

  if (!isFiniteNumber(compliance)) {
    compliance = entry.inputs.ethicalCompliance?.default ?? 0.6;
    sanitized.ethicalCompliance = compliance;
    warnings.push(
      `El parámetro "${complianceLabel}" se restableció al valor predeterminado ${formatNumber(
        compliance,
      )} para cumplir con las restricciones legales.`,
    );
  }

  const maxExposure = 450;
  const intensity = frequency * duration;
  if (Number.isFinite(intensity) && intensity > maxExposure) {
    const adjustedFrequency = Math.max(0, maxExposure / Math.max(duration, 1));
    sanitized.stimulusFrequency = toPrecisionNumber(adjustedFrequency);
    warnings.push(
      `El parámetro "${frequencyLabel}" se redujo a ${formatNumber(
        sanitized.stimulusFrequency,
      )} Hz para evitar fatiga atencional por encima de ${maxExposure}.`,
    );
  }

  if (compliance < 0.4) {
    sanitized.ethicalCompliance = toPrecisionNumber(0.4);
    warnings.push(
      `El parámetro "${complianceLabel}" se elevó a 0.4 como umbral regulatorio mínimo.`,
    );
  }

  if (sanitized.ethicalCompliance < 0.7) {
    const adjustedLimit = 320;
    const safeIntensity = sanitized.sessionDuration * sanitized.stimulusFrequency;
    if (Number.isFinite(safeIntensity) && safeIntensity > adjustedLimit) {
      const cappedFrequency = Math.max(0, adjustedLimit / Math.max(duration, 1));
      sanitized.stimulusFrequency = toPrecisionNumber(cappedFrequency);
      warnings.push(
        `El parámetro "${frequencyLabel}" se limitó a ${formatNumber(
          sanitized.stimulusFrequency,
        )} Hz debido a una menor conformidad ética.`,
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

  const momentumLabel = resolveLabel(entry, 'momentumDemand');
  const energyLabel = resolveLabel(entry, 'energyInput');
  const closureLabel = resolveLabel(entry, 'systemClosure');

  if (momentumDemand > 0) {
    sanitized.momentumDemand = 0;
    warnings.push(
      `El parámetro "${momentumLabel}" se fijó en 0: la propulsión sin eyección de masa no está permitida en sistemas cerrados.`,
    );
  }

  if (energyInput > 0) {
    sanitized.energyInput = 0;
    warnings.push(
      `El parámetro "${energyLabel}" se fijó en 0 para respetar la conservación del momento.`,
    );
  }

  if (!isFiniteNumber(systemClosure) || systemClosure < 1) {
    sanitized.systemClosure = 1;
    warnings.push(
      `El parámetro "${closureLabel}" se forzó a 1 (sistema cerrado) como caso de control negativo.`,
    );
  }

  warnings.push(
    'El escenario refuerza las leyes de conservación: la propulsión sin eyección de masa permanece deshabilitada.',
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

  const beamLabel = resolveLabel(entry, 'beamPower');
  const areaLabel = resolveLabel(entry, 'sailArea');
  const fluxLabel = resolveLabel(entry, 'momentumFlux');

  if (!isFiniteNumber(beamPower)) {
    beamPower = entry.inputs.beamPower?.default ?? 1;
    sanitized.beamPower = beamPower;
    warnings.push(
      `El parámetro "${beamLabel}" se restableció al valor predeterminado ${formatNumber(
        beamPower,
      )} MW por un valor inválido.`,
    );
  }

  if (!isFiniteNumber(sailArea)) {
    sailArea = entry.inputs.sailArea?.default ?? 100;
    sanitized.sailArea = sailArea;
    warnings.push(
      `El parámetro "${areaLabel}" se restableció al valor predeterminado ${formatNumber(
        sailArea,
      )} m^2 por un valor inválido.`,
    );
  }

  if (!isFiniteNumber(momentumFlux)) {
    momentumFlux = entry.inputs.momentumFlux?.default ?? 0.1;
    sanitized.momentumFlux = momentumFlux;
    warnings.push(
      `El parámetro "${fluxLabel}" se restableció al valor predeterminado ${formatNumber(
        momentumFlux,
      )} N/m^2 por un valor inválido.`,
    );
  }

  const areaFactor = Math.max(1, Math.sqrt(Math.max(sailArea, 1) / 400));
  const maxFlux = Math.max(0.01, toPrecisionNumber((beamPower * 0.08) / areaFactor));
  if (momentumFlux > maxFlux) {
    sanitized.momentumFlux = maxFlux;
    warnings.push(
      `El parámetro "${fluxLabel}" se limitó a ${formatNumber(
        maxFlux,
      )} N/m^2 para permanecer dentro del presupuesto de momento externo.`,
    );
  }

  const minPower = toPrecisionNumber((sanitized.momentumFlux * areaFactor) / 0.12);
  if (beamPower < minPower) {
    sanitized.beamPower = Math.min(
      entry.inputs.beamPower?.constraints.max ?? Number.POSITIVE_INFINITY,
      Math.max(minPower, beamPower),
    );
    warnings.push(
      `El parámetro "${beamLabel}" se incrementó a ${formatNumber(
        sanitized.beamPower,
      )} MW para sostener el flujo de momento solicitado.`,
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

  const varianceLabel = resolveLabel(entry, 'priorVariance');
  const sampleLabel = resolveLabel(entry, 'sampleSize');
  const injuryLabel = resolveLabel(entry, 'injuryUncertainty');

  if (!isFiniteNumber(variance)) {
    variance = entry.inputs.priorVariance?.default ?? 0.2;
    sanitized.priorVariance = variance;
    warnings.push(
      `El parámetro "${varianceLabel}" se restableció al valor predeterminado ${formatNumber(
        variance,
      )} por un valor inválido.`,
    );
  }

  if (!isFiniteNumber(sampleSize)) {
    sampleSize = entry.inputs.sampleSize?.default ?? 10;
    sanitized.sampleSize = sampleSize;
    warnings.push(
      `El parámetro "${sampleLabel}" se restableció al valor predeterminado ${formatNumber(
        sampleSize,
      )} para mantener sustento estadístico.`,
    );
  }

  if (!isFiniteNumber(injuryUncertainty)) {
    injuryUncertainty = entry.inputs.injuryUncertainty?.default ?? 0.2;
    sanitized.injuryUncertainty = injuryUncertainty;
    warnings.push(
      `El parámetro "${injuryLabel}" se restableció al valor predeterminado ${formatNumber(
        injuryUncertainty,
      )} para reflejar la varianza residual.`,
    );
  }

  const minSample = Math.min(
    entry.inputs.sampleSize?.constraints.max ?? 500,
    Math.max(5, Math.ceil(12 / Math.max(variance, 0.05))),
  );
  if (sampleSize < minSample) {
    sanitized.sampleSize = minSample;
    warnings.push(
      `El parámetro "${sampleLabel}" se elevó a ${formatNumber(
        sanitized.sampleSize,
      )} para evitar sobreajuste con una varianza de ${formatNumber(variance)}.`,
    );
  }

  const maxVariance = Math.min(0.6, 1 / Math.sqrt(sanitized.sampleSize + 1));
  if (variance > maxVariance) {
    sanitized.priorVariance = toPrecisionNumber(maxVariance);
    warnings.push(
      `El parámetro "${varianceLabel}" se redujo a ${formatNumber(
        sanitized.priorVariance,
      )} para respetar los límites de varianza derivados de la muestra.`,
    );
  }

  if (injuryUncertainty < 0.1 && sanitized.sampleSize < 40) {
    sanitized.injuryUncertainty = toPrecisionNumber(0.1);
    warnings.push(
      `El parámetro "${injuryLabel}" se elevó a 0.1 para capturar la estocasticidad residual.`,
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

  const temperatureLabel = resolveLabel(entry, 'ambientTemperature');
  const humidityLabel = resolveLabel(entry, 'humidity');
  const acclimatizationLabel = resolveLabel(entry, 'acclimatization');

  if (!isFiniteNumber(temperature)) {
    temperature = entry.inputs.ambientTemperature?.default ?? 20;
    sanitized.ambientTemperature = temperature;
    warnings.push(
      `El parámetro "${temperatureLabel}" se restableció al valor predeterminado ${formatNumber(
        temperature,
      )} °C por un valor inválido.`,
    );
  }

  if (!isFiniteNumber(humidity)) {
    humidity = entry.inputs.humidity?.default ?? 50;
    sanitized.humidity = humidity;
    warnings.push(
      `El parámetro "${humidityLabel}" se restableció al valor predeterminado ${formatNumber(
        humidity,
      )}% por un valor inválido.`,
    );
  }

  if (!isFiniteNumber(acclimatization)) {
    acclimatization = entry.inputs.acclimatization?.default ?? 0.5;
    sanitized.acclimatization = acclimatization;
    warnings.push(
      `El parámetro "${acclimatizationLabel}" se restableció al valor predeterminado ${formatNumber(
        acclimatization,
      )} para mantener el realismo fisiológico.`,
    );
  }

  const heatIndex = temperature + humidity * 0.1;
  if (heatIndex > 60) {
    const targetHumidity = Math.max(0, (60 - temperature) / 0.1);
    sanitized.humidity = toPrecisionNumber(Math.min(targetHumidity, 100));
    warnings.push(
      `El parámetro "${humidityLabel}" se redujo a ${formatNumber(
        sanitized.humidity,
      )}% para mantener el índice de calor dentro de límites seguros.`,
    );
  }

  if (heatIndex > 50 && acclimatization < 0.2) {
    sanitized.acclimatization = toPrecisionNumber(0.2);
    warnings.push(
      `El parámetro "${acclimatizationLabel}" se elevó a 0.2 para evitar violaciones por esfuerzo térmico.`,
    );
  }

  if (temperature < -10 && acclimatization < 0.3) {
    sanitized.acclimatization = toPrecisionNumber(0.3);
    warnings.push(
      `El parámetro "${acclimatizationLabel}" se elevó a 0.3 para cumplir con las restricciones de clima frío.`,
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

  const resolutionLabel = resolveLabel(entry, 'observationResolution');
  const orderLabel = resolveLabel(entry, 'modelOrder');
  const memoryLabel = resolveLabel(entry, 'errorMemory');

  if (!isFiniteNumber(resolution)) {
    resolution = entry.inputs.observationResolution?.default ?? 50;
    sanitized.observationResolution = resolution;
    warnings.push(
      `El parámetro "${resolutionLabel}" se restableció al valor predeterminado ${formatNumber(
        resolution,
      )} km por un valor inválido.`,
    );
  }

  if (!isFiniteNumber(modelOrder)) {
    modelOrder = entry.inputs.modelOrder?.default ?? 3;
    sanitized.modelOrder = modelOrder;
    warnings.push(
      `El parámetro "${orderLabel}" se restableció al valor predeterminado ${formatNumber(
        modelOrder,
      )} para mantener la estabilidad del modelo.`,
    );
  }

  if (!isFiniteNumber(errorMemory)) {
    errorMemory = entry.inputs.errorMemory?.default ?? 0.4;
    sanitized.errorMemory = errorMemory;
    warnings.push(
      `El parámetro "${memoryLabel}" se restableció al valor predeterminado ${formatNumber(
        errorMemory,
      )} por un valor inválido.`,
    );
  }

  const minResolution = Math.max(5, modelOrder * 4);
  if (resolution < minResolution) {
    sanitized.observationResolution = toPrecisionNumber(minResolution);
    warnings.push(
      `El parámetro "${resolutionLabel}" se incrementó a ${formatNumber(
        sanitized.observationResolution,
      )} km para evitar submuestreo respecto al orden del modelo ${formatNumber(
        modelOrder,
      )}.`,
    );
  }

  if (errorMemory > 0.85) {
    sanitized.errorMemory = toPrecisionNumber(0.85);
    warnings.push(
      `El parámetro "${memoryLabel}" se limitó a 0.85 para evitar inestabilidad en los bucles de retroalimentación.`,
    );
  }

  if (sanitized.observationResolution < 15 && errorMemory > 0.5) {
    sanitized.errorMemory = toPrecisionNumber(0.5);
    warnings.push(
      `El parámetro "${memoryLabel}" se redujo a 0.5 para asimilaciones de alta resolución.`,
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

  const gainLabel = resolveLabel(entry, 'controlGain');
  const regularizationLabel = resolveLabel(entry, 'regularization');
  const identifiabilityLabel = resolveLabel(entry, 'identifiability');

  if (!isFiniteNumber(controlGain)) {
    controlGain = entry.inputs.controlGain?.default ?? 0.8;
    sanitized.controlGain = controlGain;
    warnings.push(
      `El parámetro "${gainLabel}" se restableció al valor predeterminado ${formatNumber(
        controlGain,
      )} para mantener la estabilidad.`,
    );
  }

  if (!isFiniteNumber(regularization)) {
    regularization = entry.inputs.regularization?.default ?? 0.3;
    sanitized.regularization = regularization;
    warnings.push(
      `El parámetro "${regularizationLabel}" se restableció al valor predeterminado ${formatNumber(
        regularization,
      )} para evitar inestabilidad.`,
    );
  }

  if (!isFiniteNumber(identifiability)) {
    identifiability = entry.inputs.identifiability?.default ?? 0.6;
    sanitized.identifiability = identifiability;
    warnings.push(
      `El parámetro "${identifiabilityLabel}" se restableció al valor predeterminado ${formatNumber(
        identifiability,
      )} para preservar la coherencia del modelo.`,
    );
  }

  const maxGain = Math.max(0.1, toPrecisionNumber((1 - regularization) * 2.5));
  if (controlGain > maxGain) {
    sanitized.controlGain = toPrecisionNumber(maxGain);
    warnings.push(
      `El parámetro "${gainLabel}" se limitó a ${formatNumber(
        sanitized.controlGain,
      )} para mantener la estabilidad del lazo cerrado.`,
    );
  }

  if (regularization < 0.1) {
    sanitized.regularization = toPrecisionNumber(0.1);
    warnings.push(
      `El parámetro "${regularizationLabel}" se elevó a 0.1 para amortiguar la amplificación del caos.`,
    );
    regularization = sanitized.regularization;
  }

  const minIdentifiability = Math.min(0.95, toPrecisionNumber(regularization * 0.5 + 0.3));
  if (identifiability < minIdentifiability) {
    sanitized.identifiability = minIdentifiability;
    warnings.push(
      `El parámetro "${identifiabilityLabel}" se incrementó a ${formatNumber(
        sanitized.identifiability,
      )} para asegurar que el sistema siga siendo observable.`,
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

  const domainsLabel = resolveLabel(entry, 'domainsCount');
  const varianceLabel = resolveLabel(entry, 'scaleVariance');
  const privacyLabel = resolveLabel(entry, 'privacyBudget');

  if (!isFiniteNumber(domains)) {
    domains = entry.inputs.domainsCount?.default ?? 2;
    sanitized.domainsCount = domains;
    warnings.push(
      `El parámetro "${domainsLabel}" se restableció al valor predeterminado ${formatNumber(
        domains,
      )} para mantener el alcance de integración.`,
    );
  }

  if (!isFiniteNumber(scaleVariance)) {
    scaleVariance = entry.inputs.scaleVariance?.default ?? 10;
    sanitized.scaleVariance = scaleVariance;
    warnings.push(
      `El parámetro "${varianceLabel}" se restableció al valor predeterminado ${formatNumber(
        scaleVariance,
      )}% por un valor inválido.`,
    );
  }

  if (!isFiniteNumber(privacyBudget)) {
    privacyBudget = entry.inputs.privacyBudget?.default ?? 0.3;
    sanitized.privacyBudget = privacyBudget;
    warnings.push(
      `El parámetro "${privacyLabel}" se restableció al valor predeterminado ${formatNumber(
        privacyBudget,
      )} para mantener el cumplimiento ético.`,
    );
  }

  const maxVariance = Math.max(5, domains * 20);
  if (scaleVariance > maxVariance) {
    sanitized.scaleVariance = toPrecisionNumber(maxVariance);
    warnings.push(
      `El parámetro "${varianceLabel}" se limitó a ${formatNumber(
        sanitized.scaleVariance,
      )}% para preservar la compatibilidad entre dominios.`,
    );
  }

  const maxPrivacy = Math.min(0.9, toPrecisionNumber(0.6 / Math.max(domains, 1) + 0.2));
  if (privacyBudget > maxPrivacy) {
    sanitized.privacyBudget = maxPrivacy;
    warnings.push(
      `El parámetro "${privacyLabel}" se limitó a ${formatNumber(
        sanitized.privacyBudget,
      )} para satisfacer la agregación de privacidad y ética.`,
    );
  }

  if (privacyBudget < 0.05) {
    sanitized.privacyBudget = toPrecisionNumber(0.05);
    warnings.push(
      `El parámetro "${privacyLabel}" se elevó a 0.05 para evitar presupuestos de privacidad degenerados.`,
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
      warnings: [`Entrada de registro de física desconocida: ${entryId}.`],
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
      warnings.push(`El parámetro "${key}" no está definido para la entrada ${entry.id}.`);
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

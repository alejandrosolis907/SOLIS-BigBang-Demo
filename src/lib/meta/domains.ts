import type { MetaLearnerAdapter, MetaLearnerDomainId, DomainEnforcementResult } from "./types";

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

const createRangeAdapter = (config: {
  readonly id: MetaLearnerDomainId;
  readonly label: string;
  readonly entryIds: readonly string[];
  readonly range: { readonly min: number; readonly max: number };
  readonly horizon: number;
  readonly alpha: number;
  readonly step: number;
  readonly maxCorrection: number;
  readonly minDenominator: number;
  readonly allow?: boolean;
  readonly complianceLabel: string;
  readonly enforce?: (
    values: Float32Array,
    clampValue: (value: number) => number,
  ) => DomainEnforcementResult;
}): MetaLearnerAdapter => {
  const span = Math.max(config.range.max - config.range.min, 1e-6);
  const normalize = (value: number): number => {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return (value - config.range.min) / span;
  };
  const denormalize = (value: number): number => config.range.min + value * span;
  const clampValue = (value: number): number => clamp(value, config.range.min, config.range.max);
  const enforce = (
    values: Float32Array,
    clampFn: (value: number) => number,
  ): DomainEnforcementResult => {
    if (config.enforce) {
      return config.enforce(values, clampFn);
    }
    let violations = 0;
    for (let i = 0; i < values.length; i += 1) {
      const clamped = clampFn(values[i]);
      if (clamped !== values[i]) {
        violations += 1;
        values[i] = clamped;
      }
    }
    return { values, violations };
  };
  return {
    id: config.id,
    label: config.label,
    entryIds: config.entryIds,
    horizon: config.horizon,
    alpha: config.alpha,
    step: config.step,
    maxCorrection: config.maxCorrection,
    minDenominator: config.minDenominator,
    allow: config.allow !== false,
    complianceLabel: config.complianceLabel,
    normalize,
    denormalize,
    enforce: (values: Float32Array): DomainEnforcementResult => enforce(values, clampValue),
  };
};

const enforceProbability = (
  values: Float32Array,
  clampValue: (value: number) => number,
): DomainEnforcementResult => {
  let violations = 0;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    const clamped = clampValue(values[i]);
    if (clamped !== values[i]) {
      violations += 1;
      values[i] = clamped;
    }
    sum += values[i];
  }
  if (sum <= 1) {
    return { values, violations };
  }
  const scale = sum === 0 ? 1 : 1 / sum;
  for (let i = 0; i < values.length; i += 1) {
    values[i] *= scale;
  }
  return { values, violations: violations + 1 };
};

const enforceEnergyBudget = (
  values: Float32Array,
  clampValue: (value: number) => number,
  budget: number,
): DomainEnforcementResult => {
  let violations = 0;
  let total = 0;
  for (let i = 0; i < values.length; i += 1) {
    const clamped = clampValue(values[i]);
    if (clamped !== values[i]) {
      violations += 1;
      values[i] = clamped;
    }
    total += values[i];
  }
  if (total <= budget) {
    return { values, violations };
  }
  const scale = budget / (total || 1);
  for (let i = 0; i < values.length; i += 1) {
    values[i] *= scale;
  }
  return { values, violations: violations + 1 };
};

const enforceCentered = (
  values: Float32Array,
  clampValue: (value: number) => number,
  targetMean: number,
  tolerance: number,
): DomainEnforcementResult => {
  let violations = 0;
  for (let i = 0; i < values.length; i += 1) {
    const clamped = clampValue(values[i]);
    if (clamped !== values[i]) {
      violations += 1;
      values[i] = clamped;
    }
  }
  if (values.length === 0) {
    return { values, violations };
  }
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
  }
  const mean = sum / values.length;
  const diff = mean - targetMean;
  if (Math.abs(diff) <= tolerance) {
    return { values, violations };
  }
  const adjustment = diff;
  for (let i = 0; i < values.length; i += 1) {
    values[i] = clampValue(values[i] - adjustment);
  }
  return { values, violations: violations + 1 };
};

export const META_DOMAIN_ADAPTERS: readonly MetaLearnerAdapter[] = [
  createRangeAdapter({
    id: "social",
    label: "Dinámicas sociales",
    entryIds: ["social-dynamics"],
    range: { min: 0, max: 1 },
    horizon: 32,
    alpha: 0.18,
    step: 0.65,
    maxCorrection: 0.18,
    minDenominator: 0.05,
    complianceLabel: "Límites atencionales y topología",
    enforce: enforceProbability,
  }),
  createRangeAdapter({
    id: "affective",
    label: "Vínculos afectivos",
    entryIds: ["affective-bonds"],
    range: { min: 0, max: 1 },
    horizon: 40,
    alpha: 0.12,
    step: 0.5,
    maxCorrection: 0.12,
    minDenominator: 0.05,
    complianceLabel: "Privacidad y consentimiento",
    enforce: enforceProbability,
  }),
  createRangeAdapter({
    id: "neuromarketing",
    label: "Neuromarketing interpersonal",
    entryIds: ["neuromarketing"],
    range: { min: 0, max: 1 },
    horizon: 28,
    alpha: 0.16,
    step: 0.55,
    maxCorrection: 0.15,
    minDenominator: 0.05,
    complianceLabel: "Límites éticos y fatiga",
    enforce: enforceProbability,
  }),
  createRangeAdapter({
    id: "reactionless",
    label: "Propulsión sin eyección",
    entryIds: ["reactionless-propulsion"],
    range: { min: 0, max: 1 },
    horizon: 16,
    alpha: 0.1,
    step: 0,
    maxCorrection: 0,
    minDenominator: 0.1,
    allow: false,
    complianceLabel: "Conservación de momento",
  }),
  createRangeAdapter({
    id: "external-propulsion",
    label: "Propulsión con intercambio externo",
    entryIds: ["external-propulsion"],
    range: { min: 0, max: 1.5 },
    horizon: 24,
    alpha: 0.2,
    step: 0.7,
    maxCorrection: 0.22,
    minDenominator: 0.1,
    complianceLabel: "Presupuesto de energía externo",
    enforce: (values, clampValue) => enforceEnergyBudget(values, clampValue, 1.2),
  }),
  createRangeAdapter({
    id: "sports",
    label: "Predicción deportiva",
    entryIds: ["sports-prediction"],
    range: { min: 0, max: 1 },
    horizon: 36,
    alpha: 0.14,
    step: 0.45,
    maxCorrection: 0.12,
    minDenominator: 0.02,
    complianceLabel: "Probabilidades normalizadas",
    enforce: enforceProbability,
  }),
  createRangeAdapter({
    id: "sports-climate",
    label: "Clima en rendimiento deportivo",
    entryIds: ["sports-climate"],
    range: { min: 0, max: 1.2 },
    horizon: 36,
    alpha: 0.18,
    step: 0.55,
    maxCorrection: 0.16,
    minDenominator: 0.05,
    complianceLabel: "Límites fisiológicos",
    enforce: (values, clampValue) => enforceCentered(values, clampValue, 0.6, 0.1),
  }),
  createRangeAdapter({
    id: "climate",
    label: "Aprendizaje de errores climáticos",
    entryIds: ["climate-error-learning"],
    range: { min: -1, max: 1 },
    horizon: 48,
    alpha: 0.22,
    step: 0.6,
    maxCorrection: 0.25,
    minDenominator: 0.05,
    complianceLabel: "Estabilidad y caos determinista",
  }),
  createRangeAdapter({
    id: "meta",
    label: "Meta-aprendizaje",
    entryIds: ["meta-learning"],
    range: { min: 0, max: 1 },
    horizon: 52,
    alpha: 0.25,
    step: 0.5,
    maxCorrection: 0.1,
    minDenominator: 0.05,
    complianceLabel: "Regularización del controlador",
  }),
  createRangeAdapter({
    id: "multidomain",
    label: "Integración multidominio",
    entryIds: ["multidomain-integration"],
    range: { min: 0, max: 1 },
    horizon: 60,
    alpha: 0.2,
    step: 0.45,
    maxCorrection: 0.1,
    minDenominator: 0.05,
    complianceLabel: "Compatibilidad de unidades",
    enforce: (values, clampValue) => enforceCentered(values, clampValue, 0.5, 0.12),
  }),
];

const ENTRY_TO_ADAPTER = new Map<string, MetaLearnerAdapter>();
for (const adapter of META_DOMAIN_ADAPTERS) {
  for (const entryId of adapter.entryIds) {
    ENTRY_TO_ADAPTER.set(entryId, adapter);
  }
}

export const getAdapterForEntry = (
  entryId: string | null | undefined,
): MetaLearnerAdapter | null => {
  if (!entryId) {
    return null;
  }
  return ENTRY_TO_ADAPTER.get(entryId) ?? null;
};

export const getAdapterById = (
  domainId: MetaLearnerDomainId,
): MetaLearnerAdapter | null => {
  return META_DOMAIN_ADAPTERS.find((adapter) => adapter.id === domainId) ?? null;
};


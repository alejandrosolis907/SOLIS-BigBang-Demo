import { getAdapterForEntry } from "./domains";
import type { MetaLearnerAdapter, MetaLearnerOutcome } from "./types";

const EPS = 1e-9;

const toFloat32Array = (values: ArrayLike<number>): Float32Array => {
  if (values instanceof Float32Array) {
    return values;
  }
  const output = new Float32Array(values.length);
  for (let i = 0; i < values.length; i += 1) {
    output[i] = Number(values[i]);
  }
  return output;
};

const computeMae = (target: ArrayLike<number>, approx: ArrayLike<number>): number => {
  const total = target.length;
  if (total === 0) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < total; i += 1) {
    sum += Math.abs(Number(target[i]) - Number(approx[i]));
  }
  return sum / total;
};

const computeMape = (
  target: ArrayLike<number>,
  approx: ArrayLike<number>,
  minDenominator: number,
): number => {
  const total = target.length;
  if (total === 0) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < total; i += 1) {
    const actual = Math.abs(Number(target[i]));
    const denom = Math.max(actual, minDenominator);
    if (denom <= EPS) {
      continue;
    }
    sum += Math.abs(Number(target[i]) - Number(approx[i])) / denom;
  }
  return sum / total;
};

type DomainState = {
  ema: number;
  history: number[];
};

const ensureState = (
  map: Map<string, DomainState>,
  adapter: MetaLearnerAdapter,
): DomainState => {
  const existing = map.get(adapter.id);
  if (existing) {
    return existing;
  }
  const created: DomainState = {
    ema: 0,
    history: [],
  };
  map.set(adapter.id, created);
  return created;
};

const clamp = (value: number, limit: number): number => {
  if (value > limit) {
    return limit;
  }
  if (value < -limit) {
    return -limit;
  }
  return value;
};

const buildResult = (
  overrides: Partial<MetaLearnerOutcome>,
): MetaLearnerOutcome => ({
  entryId: null,
  domainId: null,
  domainLabel: null,
  maeBefore: null,
  maeAfter: null,
  mapeBefore: null,
  mapeAfter: null,
  improvement: null,
  constraintsOk: null,
  clipped: false,
  violations: 0,
  notes: [],
  applied: false,
  corrected: null,
  original: null,
  ...overrides,
});

const combineResiduals = (
  state: DomainState,
  adapter: MetaLearnerAdapter,
  meanResidual: number,
): { correction: number; clipped: boolean } => {
  const alpha = Math.min(Math.max(adapter.alpha, 0.01), 1);
  state.ema += alpha * (meanResidual - state.ema);
  state.history.push(meanResidual);
  const maxHistory = Math.max(2, adapter.horizon);
  if (state.history.length > maxHistory) {
    state.history.splice(0, state.history.length - maxHistory);
  }
  let historyMean = 0;
  for (let i = 0; i < state.history.length; i += 1) {
    historyMean += state.history[i];
  }
  historyMean = historyMean / state.history.length;
  const historyWeight = Math.min(0.5, 2 / maxHistory);
  const blended = state.ema * (1 - historyWeight) + historyMean * historyWeight;
  const rawCorrection = blended * adapter.step;
  const correction = clamp(rawCorrection, adapter.maxCorrection);
  const clipped = Math.abs(rawCorrection) > adapter.maxCorrection - 1e-6;
  return { correction, clipped };
};

type ApplyOptions = {
  entryId: string | null;
  observed: ArrayLike<number> | null;
  predicted: ArrayLike<number> | null;
};

const states = new Map<string, DomainState>();

export const applyMetaLearner = ({
  entryId,
  observed,
  predicted,
}: ApplyOptions): MetaLearnerOutcome => {
  const baseOriginal = predicted ? toFloat32Array(predicted) : null;
  if (!observed || !predicted || observed.length !== predicted.length || observed.length === 0) {
    return buildResult({ entryId, original: baseOriginal });
  }
  const adapter = getAdapterForEntry(entryId);
  if (!adapter) {
    return buildResult({ entryId, original: baseOriginal });
  }
  const observedArray = toFloat32Array(observed);
  const predictedArray = toFloat32Array(predicted);
  if (!adapter.allow) {
    return buildResult({
      entryId,
      domainId: adapter.id,
      domainLabel: adapter.label,
      constraintsOk: false,
      notes: ["Escenario prohibido: se omite la corrección por conservación de momento"],
      original: predictedArray,
    });
  }
  const normalizedObserved = new Float32Array(observedArray.length);
  const normalizedPredicted = new Float32Array(predictedArray.length);
  let residualSum = 0;
  for (let i = 0; i < observedArray.length; i += 1) {
    const normObs = adapter.normalize(observedArray[i]);
    const normPred = adapter.normalize(predictedArray[i]);
    normalizedObserved[i] = normObs;
    normalizedPredicted[i] = normPred;
    residualSum += normObs - normPred;
  }
  const meanResidual = residualSum / normalizedObserved.length;
  const state = ensureState(states, adapter);
  const { correction, clipped } = combineResiduals(state, adapter, meanResidual);
  const corrected = new Float32Array(normalizedPredicted.length);
  for (let i = 0; i < normalizedPredicted.length; i += 1) {
    corrected[i] = normalizedPredicted[i] + correction;
  }
  const denormalized = new Float32Array(corrected.length);
  for (let i = 0; i < corrected.length; i += 1) {
    denormalized[i] = adapter.denormalize(corrected[i]);
  }
  const enforcement = adapter.enforce(denormalized);
  const correctedValues = Float32Array.from(enforcement.values);
  const maeBefore = computeMae(observedArray, predictedArray);
  const maeAfter = computeMae(observedArray, enforcement.values);
  const mapeBefore = computeMape(observedArray, predictedArray, adapter.minDenominator);
  const mapeAfter = computeMape(observedArray, enforcement.values, adapter.minDenominator);
  const improvement = maeBefore - maeAfter;
  return buildResult({
    entryId,
    domainId: adapter.id,
    domainLabel: adapter.label,
    maeBefore,
    maeAfter,
    mapeBefore,
    mapeAfter,
    improvement,
    constraintsOk: enforcement.violations === 0,
    clipped,
    violations: enforcement.violations,
    applied: true,
    corrected: correctedValues,
    original: predictedArray,
  });
};


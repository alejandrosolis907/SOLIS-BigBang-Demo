import { sampleBoundaryEntropy, type BoundaryEntropyArc } from "./metrics";

export type EntropyForceOptions = {
  arcLength?: number;
  delta?: number;
  iterations?: number;
  diffusionRate?: number;
};

export type EntropyForceVector = {
  x: number;
  y: number;
  magnitude: number;
  alignment: number;
};

export type EntropyForceResult = {
  arc: BoundaryEntropyArc;
  flow: EntropyForceVector;
  totalDelta: number;
};

const DEFAULT_DELTA = 0.12;
const DEFAULT_ITERATIONS = 6;
const DEFAULT_DIFFUSION = 0.35;

function clampFinite(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 1e6) return 1e6;
  if (value < -1e6) return -1e6;
  return value;
}

function buildBoundaryMask(grid: number): Uint8Array {
  const total = grid * grid;
  const mask = new Uint8Array(total);
  if (grid <= 1) {
    for (let i = 0; i < total; i++) mask[i] = 1;
    return mask;
  }
  const limit = grid - 1;
  for (let x = 0; x < grid; x++) {
    mask[x] = 1;
    mask[limit * grid + x] = 1;
  }
  for (let y = 0; y < grid; y++) {
    mask[y * grid] = 1;
    mask[y * grid + limit] = 1;
  }
  return mask;
}

function runDiffusion(
  initial: Float32Array,
  grid: number,
  boundaryMask: Uint8Array,
  iterations: number,
  rate: number,
): Float32Array {
  const total = grid * grid;
  let current = Float32Array.from(initial);
  let buffer = new Float32Array(total);
  const clampRate = Math.max(0.01, Math.min(1, rate));
  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const id = y * grid + x;
        if (boundaryMask[id]) {
          buffer[id] = current[id];
          continue;
        }
        let sum = 0;
        let count = 0;
        if (x > 0) {
          sum += current[id - 1];
          count++;
        }
        if (x + 1 < grid) {
          sum += current[id + 1];
          count++;
        }
        if (y > 0) {
          sum += current[id - grid];
          count++;
        }
        if (y + 1 < grid) {
          sum += current[id + grid];
          count++;
        }
        const avg = count > 0 ? sum / count : current[id];
        buffer[id] = current[id] + clampRate * (avg - current[id]);
      }
    }
    const next = buffer;
    buffer = current;
    current = next;
  }
  return current;
}

function applyArcPerturbation(
  base: Float32Array,
  arc: BoundaryEntropyArc,
  delta: number,
): Float32Array {
  const perturbed = Float32Array.from(base);
  const length = arc.indices.length || 1;
  for (let i = 0; i < length; i++) {
    const idx = arc.indices[i];
    const seed = Math.sin((idx + 1) * 12.9898 + (i + 1) * 78.233);
    const jitter = (seed - Math.floor(seed)) * 2 - 1;
    perturbed[idx] = clampFinite(perturbed[idx] + delta * jitter);
  }
  return perturbed;
}

function computeFlowVector(
  baseline: Float32Array,
  perturbed: Float32Array,
  grid: number,
  arc: BoundaryEntropyArc,
): { flow: EntropyForceVector; totalDelta: number } {
  const centerX = arc.centerX;
  const centerY = arc.centerY;
  const bulkCenter = (grid - 1) / 2;
  let sumAbs = 0;
  let vx = 0;
  let vy = 0;
  for (let y = 1; y < grid - 1; y++) {
    for (let x = 1; x < grid - 1; x++) {
      const id = y * grid + x;
      const diff = perturbed[id] - baseline[id];
      if (!Number.isFinite(diff) || Math.abs(diff) <= 1e-9) continue;
      const dx = centerX - x;
      const dy = centerY - y;
      vx += diff * dx;
      vy += diff * dy;
      sumAbs += Math.abs(diff);
    }
  }
  if (sumAbs > 0) {
    vx /= sumAbs;
    vy /= sumAbs;
  } else {
    vx = 0;
    vy = 0;
  }
  const magnitude = Math.hypot(vx, vy);
  const targetX = centerX - bulkCenter;
  const targetY = centerY - bulkCenter;
  const targetMag = Math.hypot(targetX, targetY) || 1;
  const alignment = magnitude > 0
    ? (vx * targetX + vy * targetY) / (magnitude * targetMag)
    : 0;
  return {
    flow: { x: vx, y: vy, magnitude, alignment },
    totalDelta: sumAbs,
  };
}

function normalizeField(field: ArrayLike<number>, grid: number): Float32Array {
  const total = grid * grid;
  const arr = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const value = field[i];
    arr[i] = clampFinite(Number.isFinite(value as number) ? (value as number) : 0);
  }
  return arr;
}

export function measureEntropyForces(
  field: ArrayLike<number>,
  grid: number,
  options: EntropyForceOptions = {},
): EntropyForceResult[] {
  if (!Number.isFinite(grid) || grid <= 1) {
    return [];
  }
  const base = normalizeField(field, grid);
  const boundaryMask = buildBoundaryMask(grid);
  const iterations = Math.max(1, Math.floor(options.iterations ?? DEFAULT_ITERATIONS));
  const rate = options.diffusionRate ?? DEFAULT_DIFFUSION;
  const baseline = runDiffusion(base, grid, boundaryMask, iterations, rate);
  const arcs = sampleBoundaryEntropy(base, grid, options.arcLength);
  const delta = options.delta ?? DEFAULT_DELTA;
  const results: EntropyForceResult[] = [];
  for (const arc of arcs) {
    const perturbedBoundary = applyArcPerturbation(base, arc, delta);
    const propagated = runDiffusion(perturbedBoundary, grid, boundaryMask, iterations, rate);
    const { flow, totalDelta } = computeFlowVector(baseline, propagated, grid, arc);
    results.push({ arc, flow, totalDelta });
  }
  return results;
}

export function dominantEntropyForce(
  field: ArrayLike<number>,
  grid: number,
  options?: EntropyForceOptions,
): EntropyForceResult | null {
  const results = measureEntropyForces(field, grid, options);
  if (!results.length) return null;
  results.sort((a, b) => b.arc.entropy - a.arc.entropy);
  return results[0];
}

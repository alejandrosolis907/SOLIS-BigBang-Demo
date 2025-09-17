import { useCallback, useMemo, useRef, useState } from "react";
import { computeAreaLaw, type AreaLawMetrics } from "../metrics";
import { Particle, computeMetrics } from "./resonance";

const SMOOTH_KERNEL = [
  0.07, 0.12, 0.07,
  0.12, 0.26, 0.12,
  0.07, 0.12, 0.07,
];

const RIGID_KERNEL = [
  0, -1, 0,
  -1, 4, -1,
  0, -1, 0,
];

const neighbourOffsets = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

function clamp01(v: number) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function blendKernel(mix: number) {
  const m = clamp01(mix);
  return SMOOTH_KERNEL.map((s, i) => s * (1 - m) + RIGID_KERNEL[i] * m);
}

function fract(x: number) {
  return x - Math.floor(x);
}

function deterministicNoise(x: number, y: number, base: number, dim: number) {
  const basis = base * 977.13 + (dim + 1) * 37.719 + (x + 1) * 12.9898 + (y + 1) * 78.233;
  return fract(Math.sin(basis) * 43758.5453);
}

function arraysClose(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > 1e-6) return false;
  }
  return true;
}

export const DEFAULT_DEPTH_DECAY = 0.85;
const HAMMING_ALPHA = 0.54;
const HAMMING_BETA = 0.46;
const HAMMING_WINDOW = 64;

export function buildDepthWeights(length: number, boundaryDepth: number, depthDecay: number) {
  if (length <= 0) return [];
  const limit = Math.max(0, Math.floor(boundaryDepth));
  const decay = clamp01(depthDecay);
  const weights: number[] = new Array(length);
  for (let i = 0; i < length; i++) {
    const depth = Math.min(limit, i);
    let value: number;
    if (depth === 0) {
      value = 1;
    } else if (decay === 0) {
      value = 0;
    } else {
      value = Math.pow(decay, depth);
    }
    weights[i] = Math.max(1e-3, value);
  }
  return weights;
}

function weightedCosine01(a: number[], b: number[], weights: number[]): number {
  const length = Math.max(a.length, b.length, weights.length);
  if (length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < length; i++) {
    const ai = a[i] ?? a[a.length - 1] ?? 0;
    const bi = b[i] ?? b[b.length - 1] ?? 0;
    const w = weights[i] ?? weights[weights.length - 1] ?? 1;
    if (w <= 0) continue;
    dot += w * ai * bi;
    na += w * ai * ai;
    nb += w * bi * bi;
  }
  if (na <= 1e-12 || nb <= 1e-12) return 0;
  const cos = dot / Math.sqrt(na * nb);
  const clamped = Math.max(-1, Math.min(1, cos));
  return (clamped + 1) / 2;
}

function computeTemporalMod(tick: number, timeField: number): number {
  const windowSize = Math.max(2, HAMMING_WINDOW);
  const phase = (tick % windowSize) / (windowSize - 1);
  const hamming = HAMMING_ALPHA - HAMMING_BETA * Math.cos(2 * Math.PI * phase);
  const normalized = HAMMING_ALPHA > 0 ? hamming / HAMMING_ALPHA : hamming;
  const timeMod = 1 + 0.1 * Math.tanh(timeField);
  const combined = normalized * timeMod;
  return Math.min(1.5, Math.max(0.5, combined));
}

type HolographicResult = {
  bulk: number[];
  field: Float32Array[];
  grid: number;
};

export function computeHolographicBulk(
  boundaryValues: number[],
  particleCount: number,
  depth: number,
  noise: number,
  kernelMix: number,
): HolographicResult {
  const dims = boundaryValues.length || 1;
  const sizeHint = Math.max(particleCount || 0, (depth + 2) * (depth + 2));
  const grid = Math.max(3, Math.ceil(Math.sqrt(sizeHint || 1)));
  const total = grid * grid;
  const kernel = blendKernel(kernelMix);

  const fields = Array.from({ length: dims }, () => new Float32Array(total));
  const visited = new Uint8Array(total);
  const queue: { x: number; y: number; depth: number }[] = [];
  const idx = (x: number, y: number) => y * grid + x;
  const isBoundary = (x: number, y: number) => x === 0 || y === 0 || x === grid - 1 || y === grid - 1;

  const boundarySums = new Array(dims).fill(0);
  const boundaryCounts = new Array(dims).fill(0);
  const effectiveDepth = Math.max(0, Math.floor(depth));

  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      if (!isBoundary(x, y)) continue;
      const id = idx(x, y);
      visited[id] = 1;
      queue.push({ x, y, depth: 0 });
      const edgeIndex = x === 0 ? 3 : x === grid - 1 ? 1 : y === 0 ? 0 : 2;
      for (let d = 0; d < dims; d++) {
        const base = boundaryValues[(edgeIndex + d) % dims] ?? 0;
        const jitter = noise ? noise * (deterministicNoise(x, y, base, d) - 0.5) : 0;
        const value = clamp01(base + jitter);
        fields[d][id] = value;
        boundarySums[d] += value;
        boundaryCounts[d] += 1;
      }
    }
  }

  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    const { x, y, depth: currentDepth } = current;
    if (currentDepth >= effectiveDepth) continue;
    for (const [dx, dy] of neighbourOffsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= grid || ny < 0 || ny >= grid) continue;
      const nid = idx(nx, ny);
      if (visited[nid]) continue;
      const nextValues = new Array(dims).fill(0);
      let hasContribution = false;
      for (let d = 0; d < dims; d++) {
        let acc = 0;
        let weight = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = nx + kx;
            const py = ny + ky;
            if (px < 0 || px >= grid || py < 0 || py >= grid) continue;
            const pid = idx(px, py);
            if (!visited[pid]) continue;
            const w = kernel[(ky + 1) * 3 + (kx + 1)];
            if (w === 0) continue;
            acc += fields[d][pid] * w;
            weight += Math.abs(w);
          }
        }
        const fallback = fields[d][idx(x, y)];
        nextValues[d] = weight > 0 ? clamp01(acc / weight) : fallback;
        if (weight > 0) hasContribution = true;
      }
      if (hasContribution || effectiveDepth === 0) {
        for (let d = 0; d < dims; d++) {
          fields[d][nid] = nextValues[d];
        }
        visited[nid] = 1;
        queue.push({ x: nx, y: ny, depth: currentDepth + 1 });
      }
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const id = idx(x, y);
        if (visited[id]) continue;
        const nextValues = new Array(dims).fill(0);
        let hasContribution = false;
        for (let d = 0; d < dims; d++) {
          let acc = 0;
          let weight = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const px = x + kx;
              const py = y + ky;
              if (px < 0 || px >= grid || py < 0 || py >= grid) continue;
              const pid = idx(px, py);
              if (!visited[pid]) continue;
              const w = kernel[(ky + 1) * 3 + (kx + 1)];
              if (w === 0) continue;
              acc += fields[d][pid] * w;
              weight += Math.abs(w);
            }
          }
          if (weight > 0) {
            nextValues[d] = clamp01(acc / weight);
            hasContribution = true;
          } else {
            nextValues[d] = 0;
          }
        }
        if (hasContribution) {
          for (let d = 0; d < dims; d++) {
            fields[d][id] = nextValues[d];
          }
          visited[id] = 1;
          changed = true;
        }
      }
    }
  }

  for (let i = 0; i < total; i++) {
    if (visited[i]) continue;
    for (let d = 0; d < dims; d++) {
      const avg = boundaryCounts[d] ? boundarySums[d] / boundaryCounts[d] : boundaryValues[d] ?? 0;
      fields[d][i] = clamp01(avg);
    }
  }

  const bulkSums = new Array(dims).fill(0);
  const bulkCounts = new Array(dims).fill(0);
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const id = idx(x, y);
      const boundaryCell = isBoundary(x, y);
      for (let d = 0; d < dims; d++) {
        const value = fields[d][id];
        if (!boundaryCell) {
          bulkSums[d] += value;
          bulkCounts[d] += 1;
        }
      }
    }
  }

  const bulk = bulkSums.map((sum, d) => {
    if (bulkCounts[d] > 0) return clamp01(sum / bulkCounts[d]);
    if (boundaryCounts[d] > 0) return clamp01(boundarySums[d] / boundaryCounts[d]);
    return clamp01(boundaryValues[d] ?? 0);
  });

  return { bulk, field: fields, grid };
}

export type EventEpsilon = {
  t: number;
  id: string;
  r: number;   // ℜ en el momento del evento
  L: number[]; // snapshot
};

export function useSolisModel(initialMu = 0) {
  // 𝓛(x): pesos/operador (3 dimensiones por defecto)
  const [L, setL] = useState<number[]>([0.6, 0.3, 0.1]);
  // μ₀: fricción ontológica base (Axioma IX)
  const [mu, setMu] = useState<number>(initialMu);
  // θ: umbral de evento
  const [theta, setTheta] = useState<number>(0.8);
  // resonancia actual promedio (para el medidor)
  const [resonanceNow, setResonanceNow] = useState<number>(0);
  // métricas delta (antes/después de mover 𝓛)
  const lastMetricsRef = useRef({ entropy: 0, density: 0, clusters: 0 });
  const [metricsDelta, setMetricsDelta] = useState({ dEntropy: 0, dDensity: 0, dClusters: 0 });
  // 𝓣: tasa de cambio de R respecto a 𝓛
  const [timeField, setTimeField] = useState<number>(0);
  // log de eventos ε
  const [eventsLog, setEventsLog] = useState<EventEpsilon[]>([]);
  // Axioma XIII: vector unificado que muestra que todo proviene del mismo fondo
  const [oneField, setOneField] = useState<number[]>([]);
  const [oneMetrics, setOneMetrics] = useState({ entropy: 0, density: 0, clusters: 0 });
  const [areaLawMetrics, setAreaLawMetrics] = useState<AreaLawMetrics | null>(null);
  // 𝓡ₐ: intensidad de retroalimentación de R sobre 𝓛
  const [raGain, setRaGain] = useState<number>(0);
  // modo holográfico
  const [holographicMode, setHolographicMode] = useState<boolean>(false);
  const [boundaryDepth, setBoundaryDepth] = useState<number>(4);
  const [boundaryNoise, setBoundaryNoise] = useState<number>(0);
  const [boundaryKernelMix, setBoundaryKernelMix] = useState<number>(0);
  const [holographicBulk, setHolographicBulk] = useState<number[]>(() => [0.6, 0.3, 0.1]);
  const holographicFieldRef = useRef<Float32Array[] | null>(null);
  const [holographicGrid, setHolographicGrid] = useState<number>(0);

  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef<number>(0);
  const lastLRef = useRef<number[] | null>(null);

  // congruencia 𝓛 ↔ μ: la estructura aumenta la fricción efectiva
  const structuralIntensity = useMemo(() => {
    if (!L.length) return 0;
    return L.reduce((sum, value) => sum + Math.abs(value), 0) / L.length;
  }, [L]);
  const structuralMu = structuralIntensity * 0.35;
  const muEffective = Math.min(0.95, mu + structuralMu);

  // permite empujar el último conjunto de partículas (tu simulación)
  const pushParticles = useCallback((particles: Particle[]) => {
    particlesRef.current = particles;
  }, []);

  // tick: avanza 𝓣, evalúa ℜ y dispara ε si ℜ ≥ θ
  const tick = useCallback(() => {
    timeRef.current += 1;
    let P = particlesRef.current;

    // Axioma IX: la fricción μ, modulada por la intensidad de 𝓛, atenúa Φ
    const muApplied = muEffective;
    if (muApplied > 0) {
      P = P.map(p => ({
        ...p,
        features: p.features.map(f => f * Math.max(0, 1 - muApplied)),
      }));
      particlesRef.current = P;
    }
    let LNow = L;
    if (holographicMode) {
      const holo = computeHolographicBulk(L, P.length, boundaryDepth, boundaryNoise, boundaryKernelMix);
      LNow = holo.bulk;
      setHolographicBulk(prev => (arraysClose(prev, holo.bulk) ? prev : [...holo.bulk]));
      holographicFieldRef.current = holo.field;
      setHolographicGrid(prev => (prev === holo.grid ? prev : holo.grid));
      if (holo.field?.length && holo.grid > 0) {
        const referenceField = holo.field[0];
        setAreaLawMetrics(computeAreaLaw(referenceField, holo.grid));
      } else {
        setAreaLawMetrics(null);
      }
    } else {
      setHolographicBulk(prev => (arraysClose(prev, L) ? prev : [...L]));
      if (holographicFieldRef.current !== null) {
        holographicFieldRef.current = null;
      }
      setHolographicGrid(prev => (prev === 0 ? prev : 0));
      setAreaLawMetrics(null);
    }

    const weights = LNow.length ? buildDepthWeights(LNow.length, boundaryDepth, DEFAULT_DEPTH_DECAY) : [];
    const rawRes = P.map(p => weightedCosine01(p.features, LNow, weights));
    const temporalMod = computeTemporalMod(timeRef.current, timeField);
    const resonances = rawRes.map(r => clamp01(r * temporalMod));
    const avg = resonances.length ? resonances.reduce((a, b) => a + b, 0) / resonances.length : 0;
    setResonanceNow(avg);

    // métricas y Δ (∂R/∂𝓛 estimado por diferencia)
    const m = computeMetrics(resonances, theta);
    const dEntropy = m.entropy - lastMetricsRef.current.entropy;
    const dDensity = m.density - lastMetricsRef.current.density;
    const dClusters = m.clusters - lastMetricsRef.current.clusters;
    setMetricsDelta({ dEntropy, dDensity, dClusters });

    const deltaR = Math.sqrt(dEntropy * dEntropy + dDensity * dDensity + dClusters * dClusters);
    let deltaL = 0;
    const prevL = lastLRef.current;
    if (prevL && prevL.length && LNow.length) {
      const dims = Math.max(prevL.length, LNow.length);
      let acc = 0;
      for (let i = 0; i < dims; i++) {
        const prevVal = prevL[i] ?? prevL[prevL.length - 1] ?? 0;
        const currentVal = LNow[i] ?? LNow[LNow.length - 1] ?? 0;
        acc += Math.abs(currentVal - prevVal);
      }
      deltaL = acc / dims;
    }
    const derivative = deltaL > 1e-6 ? deltaR / deltaL : 0;
    setTimeField(derivative);
    lastMetricsRef.current = m;
    lastLRef.current = [...LNow];

    const dims = LNow.length;
    let phiMeanVector: number[] = [];
    if (dims && P.length) {
      const sums = new Array(dims).fill(0);
      P.forEach(p => {
        for (let i = 0; i < dims; i++) {
          sums[i] += p.features[i] ?? 0;
        }
      });
      phiMeanVector = sums.map(sum => sum / P.length);
    } else if (dims) {
      phiMeanVector = new Array(dims).fill(0);
    }

    // eventos ε (dispara para las partículas que cruzan θ)
    const events: EventEpsilon[] = [];
    const effectiveTheta = theta * (1 + timeField);
    P.forEach((p, i) => {
      const r = resonances[i];
      if (r >= effectiveTheta) {
        events.push({ t: timeRef.current, id: p.id, r, L: [...LNow] });
      }
    });
    if (events.length) {
      setEventsLog(prev => [...events, ...prev].slice(0, 200));
    }

    // oneField: Φ promedio, 𝓛, ℜ promedio, ε normalizado y R resultante
    const phiMean = phiMeanVector.length
      ? phiMeanVector.reduce((a, b) => a + b, 0) / phiMeanVector.length
      : 0;
    const epsVal = events.length / (P.length || 1);
    const reality = avg * epsVal;
    const unified = [phiMean, ...LNow, avg, epsVal, reality];
    setOneField(unified);
    setOneMetrics(computeMetrics(unified, theta));

    if (raGain > 0 && phiMeanVector.length) {
      const feedbackDriver = Math.min(1, Math.max(0, reality + derivative));
      if (feedbackDriver > 0) {
        const phiVectorSnapshot = [...phiMeanVector];
        setL(prev => {
          if (!prev.length) return prev;
          let changed = false;
          const updated = prev.map((value, i) => {
            const target = phiVectorSnapshot[i] ?? value;
            const candidate = value + (target - value) * feedbackDriver * raGain;
            const next = Math.max(0, Math.min(1, candidate));
            if (Math.abs(next - value) > 1e-5) changed = true;
            return next;
          });
          return changed ? updated : prev;
        });
      }
    }
  }, [L, theta, mu, muEffective, raGain, holographicMode, boundaryDepth, boundaryNoise, boundaryKernelMix]);

  const resetMetrics = useCallback(() => {
    lastMetricsRef.current = { entropy: 0, density: 0, clusters: 0 };
    lastLRef.current = null;
    setMetricsDelta({ dEntropy: 0, dDensity: 0, dClusters: 0 });
    setTimeField(0);
  }, []);

  return {
    L, setL, theta, setTheta,
    mu, setMu,
    raGain, setRaGain,
    muStructural: structuralMu,
    muEffective,
    resonanceNow,
    metricsDelta, resetMetrics,
    timeField,
    eventsLog,
    oneField, oneMetrics,
    holographicMode, setHolographicMode,
    boundaryDepth, setBoundaryDepth,
    boundaryNoise, setBoundaryNoise,
    boundaryKernelMix, setBoundaryKernelMix,
    holographicBulk,
    holographicField: holographicFieldRef.current,
    holographicGrid,
    areaLawMetrics,
    pushParticles, tick
  };
}

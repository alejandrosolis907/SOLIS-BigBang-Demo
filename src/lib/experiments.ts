import { computeAreaLaw } from "../metrics";
import { measureEntropyForces } from "../perturb";
import {
  captureSample,
  evaluateReconstruction,
  trainDecoder,
  type MaskOptions,
} from "../reconstruction";
import { cosineSim01 } from "./resonance";
import { computeHolographicBulk } from "./solisModel";

export type ExperimentConfig = {
  depths?: number[];
  boundaryNoises?: number[];
  kernelMixes?: number[];
  seeds?: number[];
  particleCount?: number;
  dims?: number;
  coverage?: number;
  maskOffset?: number;
  maskMode?: MaskOptions["mode"];
};

export type ExperimentResult = {
  depth: number;
  boundaryNoise: number;
  kernelMix: number;
  seed: number;
  r2Perimeter: number;
  r2Area: number;
  resonanceMean: number;
  resonanceVariance: number;
  reconstructionMse: number;
  reconstructionMseInterior: number;
  reconstructionPsnr: number;
  flowMeanMagnitude: number;
  flowMeanAlignment: number;
  flowStdAlignment: number;
  flowDominantMagnitude: number;
  flowDominantAlignment: number;
  flowCount: number;
};

export type ExperimentSummary = {
  totalRuns: number;
  metrics: Record<string, { mean: number; stdev: number }>;
};

export const DEFAULT_BATCH_CONFIG: Required<Pick<ExperimentConfig,
  "depths" | "boundaryNoises" | "kernelMixes" | "seeds" | "particleCount" | "dims" | "coverage" | "maskOffset" | "maskMode">
> = {
  depths: [2, 4, 6],
  boundaryNoises: [0, 0.1, 0.2],
  kernelMixes: [0, 0.5, 1],
  seeds: [11, 23, 37, 53],
  particleCount: 96,
  dims: 3,
  coverage: 0.65,
  maskOffset: 0.2,
  maskMode: "contiguous",
};

const SUMMARY_KEYS: Array<{ key: keyof ExperimentResult; label: string }> = [
  { key: "r2Perimeter", label: "R²_perímetro" },
  { key: "r2Area", label: "R²_área" },
  { key: "reconstructionMse", label: "MSE reconstrucción" },
  { key: "resonanceVariance", label: "Var(ℜ)" },
  { key: "flowMeanMagnitude", label: "‖flujo‖ medio" },
  { key: "flowMeanAlignment", label: "Alineación media" },
];

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function buildLatticeFromSeed(seed: number, dims: number): number[] {
  const rand = seededRandom(seed);
  const values = Array.from({ length: dims }, () => rand());
  const sum = values.reduce((acc, v) => acc + v, 0) || 1;
  return values.map((v) => v / sum);
}

function generateParticles(seed: number, count: number, dims: number) {
  const rand = seededRandom(seed * 97 + 13);
  return Array.from({ length: count }, (_, idx) => ({
    id: `p-${seed}-${idx}`,
    features: Array.from({ length: dims }, () => rand()),
  }));
}

function computeResonances(
  particles: { features: number[] }[],
  lattice: number[],
) {
  const values = particles.map((p) => cosineSim01(p.features, lattice));
  const mean = values.length
    ? values.reduce((acc, v) => acc + v, 0) / values.length
    : 0;
  const variance = values.length
    ? values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length
    : 0;
  return { values, mean, variance };
}

function stats(values: number[]): { mean: number; stdev: number } {
  if (!values.length) {
    return { mean: 0, stdev: 0 };
  }
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  if (values.length === 1) {
    return { mean, stdev: 0 };
  }
  const variance = values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (values.length - 1);
  return { mean, stdev: Math.sqrt(Math.max(variance, 0)) };
}

function aggregateSummary(results: ExperimentResult[]): ExperimentSummary {
  const metrics: Record<string, { mean: number; stdev: number }> = {};
  for (const item of SUMMARY_KEYS) {
    const values = results.map((res) => res[item.key] as number);
    metrics[item.key] = stats(values);
  }
  return { totalRuns: results.length, metrics };
}

function clamp01(value: number) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function runBatchExperiments(config: ExperimentConfig = {}) {
  const {
    depths,
    boundaryNoises,
    kernelMixes,
    seeds,
    particleCount,
    dims,
    coverage,
    maskOffset,
    maskMode,
  } = {
    ...DEFAULT_BATCH_CONFIG,
    ...config,
  };

  const results: ExperimentResult[] = [];

  for (const depth of depths) {
    for (const boundaryNoise of boundaryNoises) {
      for (const kernelMix of kernelMixes) {
        for (const seed of seeds) {
          const lattice = buildLatticeFromSeed(seed, dims);
          const holo = computeHolographicBulk(
            lattice,
            particleCount,
            depth,
            boundaryNoise,
            kernelMix,
          );
          const grid = holo.grid || 1;
          const field = holo.field[0] ?? new Float32Array(grid * grid);
          const areaLaw = computeAreaLaw(field, grid);

          const sample = captureSample(field, grid);
          const model = trainDecoder([sample], { type: "linear", includeBias: true, ridge: 1e-3, l2: 1e-5 });
          const evaluation = evaluateReconstruction(sample, model, {
            coverage,
            mode: maskMode,
            offset: maskOffset,
          });

          const particles = generateParticles(seed, particleCount, dims);
          const { mean: resonanceMean, variance: resonanceVariance } = computeResonances(
            particles,
            lattice,
          );

          const flows = measureEntropyForces(field, grid, { arcLength: Math.max(6, Math.floor(grid / 8)) });
          const flowCount = flows.length;
          const flowMeanMagnitude = flowCount
            ? flows.reduce((acc, item) => acc + item.flow.magnitude, 0) / flowCount
            : 0;
          const flowMeanAlignment = flowCount
            ? flows.reduce((acc, item) => acc + item.flow.alignment, 0) / flowCount
            : 0;
          const flowStdAlignment = flowCount
            ? Math.sqrt(
                flows.reduce((acc, item) => acc + Math.pow(item.flow.alignment - flowMeanAlignment, 2), 0) /
                  flowCount,
              )
            : 0;
          const dominant = flows.reduce((best, current) => {
            if (!best) return current;
            return current.flow.magnitude > best.flow.magnitude ? current : best;
          }, flows[0] ?? null);

          results.push({
            depth,
            boundaryNoise,
            kernelMix,
            seed,
            r2Perimeter: areaLaw?.perimeterFit.r2 ?? 0,
            r2Area: areaLaw?.areaFit.r2 ?? 0,
            resonanceMean,
            resonanceVariance,
            reconstructionMse: evaluation.metrics.mse,
            reconstructionMseInterior: evaluation.metrics.mseInterior,
            reconstructionPsnr: evaluation.metrics.psnr,
            flowMeanMagnitude,
            flowMeanAlignment,
            flowStdAlignment,
            flowDominantMagnitude: dominant?.flow.magnitude ?? 0,
            flowDominantAlignment: dominant?.flow.alignment ?? 0,
            flowCount,
          });
        }
      }
    }
  }

  const summary = aggregateSummary(results);
  return { results, summary };
}

export function formatExperimentCsv(results: ExperimentResult[]): string {
  const header = [
    "depth",
    "boundaryNoise",
    "kernelMix",
    "seed",
    "r2_perimeter",
    "r2_area",
    "resonance_mean",
    "resonance_variance",
    "mse",
    "mse_interior",
    "psnr",
    "flow_mean_magnitude",
    "flow_mean_alignment",
    "flow_std_alignment",
    "flow_dominant_magnitude",
    "flow_dominant_alignment",
    "flow_count",
  ];
  const rows = results.map((res) => [
    res.depth,
    res.boundaryNoise,
    res.kernelMix,
    res.seed,
    res.r2Perimeter,
    res.r2Area,
    res.resonanceMean,
    res.resonanceVariance,
    res.reconstructionMse,
    res.reconstructionMseInterior,
    res.reconstructionPsnr,
    res.flowMeanMagnitude,
    res.flowMeanAlignment,
    res.flowStdAlignment,
    res.flowDominantMagnitude,
    res.flowDominantAlignment,
    res.flowCount,
  ].map((value) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value.toString() : "";
    }
    return value;
  }));
  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export const REPORT_SUMMARY_KEYS = SUMMARY_KEYS;

export type Vec = number[];

export function dot(a: Vec, b: Vec): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export function norm(a: Vec): number {
  return Math.sqrt(dot(a, a));
}

// similitud coseno en [0,1] (mapear -1..1 → 0..1)
export function cosineSim01(a: Vec, b: Vec): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  const raw = dot(a, b) / (na * nb); // -1..1
  return (raw + 1) / 2; // 0..1
}

export function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export type Particle = { id: string; features: Vec };

export type Metrics = {
  entropy: number;        // entropía aproximada de las ℜ
  density: number;        // fracción de partículas por encima de θ
  clusters: number;       // número de clusters 1D (heurístico)
};

export function approxEntropy(values: number[]): number {
  if (!values.length) return 0;
  // histograma simple 10 bins
  const bins = new Array(10).fill(0);
  for (const v of values) {
    const i = Math.max(0, Math.min(9, Math.floor(v * 10)));
    bins[i] += 1;
  }
  const N = values.length;
  let H = 0;
  for (const c of bins) {
    if (c > 0) {
      const p = c / N;
      H -= p * Math.log2(p);
    }
  }
  return H / Math.log2(10); // normalizado [0..1] aprox
}

// k-means 1D muy simple para contar clusters (k<=3)
export function countClusters1D(values: number[]): number {
  if (values.length < 2) return values.length;
  let centers = [0.2, 0.5, 0.8];
  for (let iter = 0; iter < 5; iter++) {
    const groups: number[][] = centers.map(() => []);
    for (const v of values) {
      let best = 0, bestd = Infinity;
      for (let i = 0; i < centers.length; i++) {
        const d = Math.abs(v - centers[i]);
        if (d < bestd) {
          bestd = d;
          best = i;
        }
      }
      groups[best].push(v);
    }
    centers = groups
      .filter((g) => g.length)
      .map((g) => g.reduce((a, b) => a + b, 0) / g.length);
  }
  // asignación final para contar grupos no vacíos
  const finalGroups: number[][] = centers.map(() => []);
  for (const v of values) {
    let best = 0, bestd = Infinity;
    for (let i = 0; i < centers.length; i++) {
      const d = Math.abs(v - centers[i]);
      if (d < bestd) {
        bestd = d;
        best = i;
      }
    }
    finalGroups[best].push(v);
  }
  return finalGroups.filter((g) => g.length > 0).length;
}

/*
Ejemplo rápido de uso:
countClusters1D([0.1, 0.15, 0.8]) → 2
countClusters1D([0.1, 0.15, 0.2]) → 1
*/

export function computeMetrics(resonances: number[], theta: number): Metrics {
  const entropy = approxEntropy(resonances);
  const density = resonances.length ? resonances.filter(r => r >= theta).length / resonances.length : 0;
  const clusters = countClusters1D(resonances);
  return { entropy, density, clusters };
}

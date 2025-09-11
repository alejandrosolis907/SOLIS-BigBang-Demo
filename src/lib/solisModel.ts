// src/lib/solisModel.ts
// Modelo minimal para mapear conceptos SOLIS (Φ, 𝓛, ℜ, ε, 𝓣)
export type Possibility = { id: string; features: number[]; energy: number };

export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededPossibilities(seed: number, n: number, d: number): Possibility[] {
  const rnd = mulberry32(seed);
  const arr: Possibility[] = [];
  for (let i = 0; i < n; i++) {
    const features = Array.from({ length: d }, () => rnd());
    const s = Math.hypot(...features) || 1;
    for (let k = 0; k < features.length; k++) features[k] /= s;
    arr.push({ id: `p${i}`, features, energy: 1 });
  }
  return arr;
}

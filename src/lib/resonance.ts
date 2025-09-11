// src/lib/resonance.ts
// Utilidades de resonancia (ℜ) y normalización
export function cosineSim01(a: number[], b: number[]) {
  const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const na = Math.hypot(...a) || 1;
  const nb = Math.hypot(...b) || 1;
  // Similitud coseno en [0,1]
  return (dot / (na * nb) + 1) / 2;
}
export function normalizeInPlace(v: number[]) {
  const s = Math.hypot(...v) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= s;
}

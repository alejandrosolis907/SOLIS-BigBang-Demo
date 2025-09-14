import { clamp01 } from "./resonance";

/**
 * Representation of Alef (י–ו–י) linking Ω, Φ∘𝓛 and R.
 * upperYud -> Ω (silent source)
 * vav      -> Φ structured by 𝓛
 * lowerYud -> R (manifest reality)
 */
export interface Alef {
  upperYud: number; // Ω
  vav: number;      // Φ ∘ 𝓛
  lowerYud: number; // R
}

/**
 * State needed to derive Alef components.
 */
export interface AlefState {
  timeField: number;    // 𝓣 derivative field approximating distance to Ω
  L: number[];          // lattice parameters 𝓛(x)
  resonance: number;    // ℜ or manifested intensity (R)
}

/**
 * Derive Alef symbolic components from engine state.
 */
export function computeAlef(state: AlefState): Alef {
  const upperYud = clamp01(1 - state.timeField); // Ω : more silence when 𝓣 small
  const vav = clamp01(state.L.reduce((a, b) => a + b, 0) / state.L.length); // Φ∘𝓛
  const lowerYud = clamp01(state.resonance * vav); // R as projection through 𝓛
  return { upperYud, vav, lowerYud };
}

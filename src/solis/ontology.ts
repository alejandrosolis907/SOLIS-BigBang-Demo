// SOLIS Ontology constants
// 𝓣 = ∂R/∂𝓛(x) ; R = ε(ℜ(Φ, 𝓛(x), 𝓣))
export const PHI = 'Φ'; // seed of potential states
export const LX = '𝓛(x)'; // structural lattice parameters
export const TAU = '𝓣'; // functional time derivative
export const RES = 'ℜ'; // resonance selector
export const EVT = 'ε'; // collapse event
export const R = 'R'; // collapsed reality snapshot

export interface SolisSnapshot {
  t: number;
  R: number;
  Lx: unknown;
  Phi: unknown;
  ResScore: number;
  EpsilonFlag: boolean;
  Tau: number;
}

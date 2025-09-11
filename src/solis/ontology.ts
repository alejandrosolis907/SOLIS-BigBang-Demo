export type Snapshot = {
  t: number;
  R: number[] | Float32Array;
  Lx: Record<string, number>;
  Phi: Record<string, number | string>;
  ResScore: number;
  EpsilonFlag: boolean;
  Tau: number;
};

export const SOLIS_ENABLED = process.env.UI_MODE_SOLIS_ENABLED === "1";

export const Phi = "Φ";
export const Lx  = "𝓛(x)";
export const Tau = "𝓣";
export const Res = "ℜ";
export const Evt = "ε";
export const Rho = "R";

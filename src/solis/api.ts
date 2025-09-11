import { SOLIS_ENABLED, Snapshot } from "./ontology";
import { publishSnap } from "./telemetry";

let uiMode: "SOLIS" | "BigBang" = "BigBang";
let running = false;
let timer: NodeJS.Timeout | null = null;

export function setUIMode(mode: "SOLIS" | "BigBang") {
  if (!SOLIS_ENABLED) return;
  uiMode = mode;
}

export const SimulationController = {
  async start() {
    if (running || !SOLIS_ENABLED) return;
    running = true;
    const t0 = Date.now();
    timer = setInterval(() => {
      const t = Date.now() - t0;
      const snap: Snapshot = {
        t,
        R: new Float32Array([Math.random()]),
        Lx: { alpha: 0.5 },
        Phi: { seed: 42 },
        ResScore: Math.random(),
        EpsilonFlag: Math.random() > 0.97,
        Tau: Math.random() * 0.01,
      };
      publishSnap(snap);
    }, 100);
  },
  async stop() {
    if (!running) return;
    running = false;
    if (timer) clearInterval(timer);
    timer = null;
  }
};

import { useCallback, useMemo, useRef, useState } from "react";
import { Particle, cosineSim01, computeMetrics, Vec } from "./resonance";

export type EventEpsilon = {
  t: number;
  id: string;
  r: number;   // ℜ en el momento del evento
  L: number[]; // snapshot
};

export function useSolisModel() {
  // 𝓛(x): pesos/operador (3 dimensiones por defecto)
  const [L, setL] = useState<number[]>([0.6, 0.3, 0.1]);
  // θ: umbral de evento
  const [theta, setTheta] = useState<number>(0.8);
  // resonancia actual promedio (para el medidor)
  const [resonanceNow, setResonanceNow] = useState<number>(0);
  // 𝓣≈∂R/∂𝓛 explícito como variación en métricas
  const lastMetricsRef = useRef({ entropy: 0, density: 0, clusters: 0 });
  const [timeField, setTimeField] = useState({ dEntropy: 0, dDensity: 0, dClusters: 0 });
  // log de eventos ε
  const [eventsLog, setEventsLog] = useState<EventEpsilon[]>([]);

  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef<number>(0);

  // permite empujar el último conjunto de partículas (tu simulación)
  const pushParticles = useCallback((particles: Particle[]) => {
    particlesRef.current = particles;
  }, []);

  // tick: avanza 𝓣, evalúa ℜ y dispara ε si ℜ ≥ θ
  const tick = useCallback(() => {
    timeRef.current += 1;
    const P = particlesRef.current;
    const res = P.map(p => cosineSim01(p.features, L));
    const avg = res.length ? res.reduce((a,b)=>a+b,0)/res.length : 0;
    setResonanceNow(avg);

    // métricas y 𝓣 (∂R/∂𝓛 estimado por diferencia)
    const m = computeMetrics(res, theta);
    const tFieldRaw = {
      dEntropy: m.entropy - lastMetricsRef.current.entropy,
      dDensity: m.density - lastMetricsRef.current.density,
      dClusters: m.clusters - lastMetricsRef.current.clusters,
    };
    setTimeField(prev => ({
      dEntropy: (prev.dEntropy ?? 0) * 0.8 + tFieldRaw.dEntropy * 0.2,
      dDensity: (prev.dDensity ?? 0) * 0.8 + tFieldRaw.dDensity * 0.2,
      dClusters: (prev.dClusters ?? 0) * 0.8 + tFieldRaw.dClusters * 0.2,
    }));
    lastMetricsRef.current = m;

    // eventos ε modulados por 𝓣
    const thetaEff = theta * (1 + tField.dEntropy);
    const events: EventEpsilon[] = [];
    P.forEach((p, i) => {
      const r = res[i];
      if (r >= thetaEff) {
        events.push({ t: timeRef.current, id: p.id, r, L: [...L] });
      }
    });
    if (events.length) {
      setEventsLog(prev => [...events, ...prev].slice(0, 200));
    }
  }, [L, theta]);

  const resetTimeField = useCallback(() => {
    lastMetricsRef.current = { entropy: 0, density: 0, clusters: 0 };
    setTimeField({ dEntropy: 0, dDensity: 0, dClusters: 0 });
  }, []);

  return {
    L, setL, theta, setTheta,
    resonanceNow,
    timeField, resetTimeField,
    eventsLog,
    pushParticles, tick
  };
}

import { useCallback, useMemo, useRef, useState } from "react";
import { Particle, cosineSim01, computeMetrics } from "./resonance";

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
  // 𝓡ₐ: intensidad de retroalimentación de R sobre 𝓛
  const [raGain, setRaGain] = useState<number>(0);

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
    const LNow = L;

    const res = P.map(p => cosineSim01(p.features, LNow));
    const avg = res.length ? res.reduce((a,b)=>a+b,0)/res.length : 0;
    setResonanceNow(avg);

    // métricas y Δ (∂R/∂𝓛 estimado por diferencia)
    const m = computeMetrics(res, theta);
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
      const r = res[i];
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
  }, [L, theta, mu, muEffective, raGain]);

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
    pushParticles, tick
  };
}

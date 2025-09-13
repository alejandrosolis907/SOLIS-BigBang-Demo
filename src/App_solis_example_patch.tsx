import React, { useEffect } from "react";
import { useSolisModel } from "./lib/solisModel";
import type { Particle } from "./lib/resonance";
import { SensitivityPanel } from "./components/SensitivityPanel";
import { ResonanceMeter } from "./components/ResonanceMeter";
import { EventLog } from "./components/EventLog";

// Demo generador de partículas para probar el HUD sin tocar tu simulación.
// Reemplaza este archivo por tu App.tsx si quieres una prueba rápida.
export default function AppSolisExample() {
  const { L, setL, theta, setTheta,
    resonanceNow, pushParticles, tick,
    timeField, eventsLog, resetTimeField } = useSolisModel();

  useEffect(() => {
    const timer = setInterval(() => {
      // ejemplo: 64 partículas con features aleatorias ligeramente sesgadas
      const particles: Particle[] = Array.from({length: 64}).map((_,i)=> ({
        id: "p"+i,
        features: [
          Math.random()*0.9 + 0.05,           // energy
          Math.abs(Math.sin((Date.now()/1000 + i)*0.3))*0.9, // symmetry
          Math.random()*0.5 + 0.25            // curvature
        ]
      }));
      pushParticles(particles);
      tick();
    }, 200);
    return () => clearInterval(timer);
  }, [pushParticles, tick]);

  return (
    <div style={{display:"grid", gap:12, padding:16, maxWidth:900, margin:"0 auto"}}>
      <h2>SOLIS HUD — ℜ / ε / 𝓣</h2>
      <ResonanceMeter value={resonanceNow} />
      <SensitivityPanel
        L={L}
        setL={setL}
        theta={theta}
        setTheta={setTheta}
        timeField={timeField}
        onResetTime={resetTimeField}
      />
      <EventLog events={eventsLog} />
      <div style={{opacity:0.7, fontSize:12}}>
        <p>
          Este HUD ilustra: ℜ (similitud coseno entre partículas y 𝓛), eventos ε cuando ℜ≥θ,
          y 𝓣≈∂R/∂𝓛 como variación en métricas (Δ entropía, Δ densidad, Δ clusters) tras cambios en 𝓛.
        </p>
      </div>
    </div>
  );
}

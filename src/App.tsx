// src/App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { exportGridPng } from "./utils/capture"; // ya existe en tu repo
import { exportExcel } from "./utils/exportExcel";
import { ResonanceMeter } from "./components/ResonanceMeter";
import { TimelineChart } from "./components/TimelineChart";
import { SensitivityPanel } from "./components/SensitivityPanel";
import { EventLog } from "./components/EventLog";
import { cosineSim01, normalizeInPlace } from "./lib/resonance";

/** === Mapeo Ontológico (ver Axiomas) ===
 * Φ: campo de posibilidades -> 'possibilities' sembradas por seed
 * 𝓛(x): vector de pesos (L) que estructura la selección
 * ℜ: resonancia (cosineSim01 entre features y L)
 * ε: evento cuando ℜ ≥ θ (umbral)
 * 𝓣: ticks de simulación (avance temporal)
 * 𝓡ₐ: ajuste suave de L por eventos (feedback estructural)
 * Fricción: término disipativo que reduce energía/variación en cada tick
 */

type Possibility = { id:string; features:number[]; energy:number };

const N = 64;          // cantidad de posibilidades (Φ)
const D = 3;           // dimensión de 𝓛(x) y features
const TICK_MS = 120;   // paso temporal 𝓣
// paleta más sobria para un aspecto científico
const PALETTE = ["#1e293b", "#334155", "#475569", "#64748b", "#94a3b8"];

export default function App() {
  const [L, setL] = useState<number[]>([0.6,0.3,0.1]); // 𝓛(x)
  const [theta, setTheta] = useState<number>(0.82);     // θ
  const [friccion, setFriccion] = useState<number>(0.06);
  const [feedback, setFeedback] = useState<number>(0.02);
  const [seed, setSeed] = useState<number>(1234);

  const possibilities = useMemo(() => seededPossibilities(seed, N, D), [seed]);

  const tRef = useRef(0);
  const [resonancia, setResonancia] = useState(0);
  const [eventos, setEventos] = useState<{t:number; id:string; r:number}[]>([]);
  const [timeline, setTimeline] = useState<{t:number; resonance:number; epsilon?:{id:string;r:number}}[]>([]);

  useEffect(() => {
    const h = setInterval(() => {
      tRef.current += 1;
      const resAll = possibilities.map(p => cosineSim01(p.features, L));
      const avg = resAll.length ? resAll.reduce((a,b)=>a+b,0)/resAll.length : 0;
      setResonancia(avg);

      let eps: {id:string;r:number}|undefined;
      for (let i=0;i<resAll.length;i++){
        if (resAll[i] >= theta) { eps = { id: possibilities[i].id, r: resAll[i] }; break; }
      }

      if (eps && feedback > 0) {
        const feat = possibilities.find(p=>p.id===eps!.id)!.features;
        const next = L.map((w,i) => w*(1-feedback) + feat[i]*feedback);
        normalizeInPlace(next);
        setL(next);
      }

      if (friccion > 0) {
        possibilities.forEach(p => {
          for (let i=0;i<p.features.length;i++){
            p.features[i] *= (1-friccion);
          }
          normalizeInPlace(p.features);
        });
      }

      if (eps) setEventos(prev => [...prev, { t:tRef.current, ...eps! }]);
      setTimeline(prev => [...prev, { t: tRef.current, resonance: avg, epsilon: eps }]);
    }, TICK_MS);
    return () => clearInterval(h);
  }, [possibilities, L, theta, feedback, friccion]);

  return (
    <div className="p-4 max-w-6xl mx-auto grid gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">SOLIS HUD — Φ ∘ 𝓛(x) → R</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded bg-slate-700" onClick={() => exportGridPng("grid", "captura_bigbang.png")}>Exportar PNG</button>
          <button className="px-3 py-1 rounded bg-slate-700" onClick={() => exportExcel({ L, theta, timeline })}>Exportar Excel</button>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 grid gap-3">
          <ResonanceMeter value={resonancia} />
          <TimelineChart points={timeline} />
          <div className="grid grid-cols-4 gap-2" id="grid">
            {possibilities.map((p, idx) => {
              const r = cosineSim01(p.features, L);
              const c = PALETTE[Math.floor(r * (PALETTE.length-1))];
              return (
                <canvas key={p.id} width={140} height={90}
                  ref={ref => ref && drawCell(ref, p, r, c)} />
              );
            })}
          </div>
        </div>
        <div className="grid gap-3">
          <SensitivityPanel
            L={L} setL={setL}
            theta={theta} setTheta={setTheta}
            friccion={friccion} setFriccion={setFriccion}
            feedback={feedback} setFeedback={setFeedback}
            seed={seed} setSeed={setSeed}
          />
          <EventLog events={eventos} />
        </div>
      </div>
    </div>
  );
}

function mulberry32(a: number){ return function(){ let t=(a+=0x6d2b79f5); t=Math.imul(t^(t>>>15), t|1); t^=t+Math.imul(t^(t>>>7), t|61); return ((t^(t>>>14))>>>0)/4294967296; } }
function seededPossibilities(seed:number, n:number, d:number):Possibility[]{
  const rnd = mulberry32(seed);
  const arr:Possibility[] = [];
  for (let i=0;i<n;i++){
    const features = Array.from({length:d}, ()=> rnd());
    normalizeInPlace(features);
    arr.push({ id:`p${i}`, features, energy: 1 });
  }
  return arr;
}
function drawCell(canvas:HTMLCanvasElement, p:Possibility, r:number, color:string){
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = color; (ctx as any).globalAlpha = 0.85;
  const w = Math.max(8, r*canvas.width);
  const h = Math.max(8, r*canvas.height);
  ctx.fillRect((canvas.width-w)/2,(canvas.height-h)/2, w,h);
  (ctx as any).globalAlpha = 1;
}

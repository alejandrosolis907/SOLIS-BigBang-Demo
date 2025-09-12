
import React, { useEffect, useRef, useState } from "react";
import { exportGridPng } from "./utils/capture";
import { LinePlot } from "./components/LinePlot";
import { PhiCanvas } from "./components/PhiCanvas";

// ==== Core types reproduced to remain compatible with BigBang2 motor ====
type Possibility = { id: string; energy: number; symmetry: number; curvature: number; };
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededPossibilities(seed: number, n = 32): Possibility[] {
  const rnd = mulberry32(seed);
  const arr: Possibility[] = [];
  for (let i = 0; i < n; i++) {
    // start near an Ω-like vacuum: almost no energy, neutral symmetry and flat curvature
    arr.push({ id: `p${i}`, energy: rnd() * 0.05, symmetry: 0.5, curvature: 0 });
  }
  return arr;
}

// ======= One universe cell with visual + plot =======
function UniverseCell({ seed, running, onToggle, onResetSoft, onResetHard, mode = "both", label, onHistory }:{
  seed: number;
  running: boolean;
  onToggle: () => void;
  onResetSoft: () => void;
  onResetHard: () => void;
  mode?: "visual" | "plot" | "both";
  label?: string;
  onHistory?: (hist: number[]) => void;
}){
  const [poss, setPoss] = useState(seededPossibilities(seed, 36));
  const [history, setHistory] = useState<number[]>([]);
  const [timeline, setTimeline] = useState<{t:number; score:number}[]>([]);
  const [t, setT] = useState(0);

  useEffect(() => {
    setPoss(seededPossibilities(seed, 36));
    setHistory([]);
    setTimeline([]);
    setT(0);
    onHistory?.([]);
  }, [seed, onHistory]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    // continue from existing timeline so pause/resume doesn't reset phases
    let tt = t;
    const loop = () => {
      tt++;

      // Metaontological "Big Bang": rapid expansion followed by cooling
      // expansion term models Φ emergiendo desde Ω; cooling reflects fricción ontológica
      const expansion = 1 - Math.exp(-tt * 0.02);
      const cooling = Math.exp(-tt * 0.0005);
      const base = expansion * cooling;

      let avg = 0;
      setPoss(prev => {
        const next = prev.map((p, i) => {
          const noise = 0.1 * (Math.random() - 0.5);
          const oscill = 0.15 * Math.sin(tt * 0.05 + i);
          const energy = Math.min(1, Math.max(0, base + oscill + noise));
          const symmetry = Math.min(
            1,
            Math.max(0, 0.5 + 0.5 * Math.cos(tt * 0.03 + i) * base + 0.1 * (Math.random() - 0.5))
          );
          const curvature = Math.max(
            -1,
            Math.min(1, p.curvature * 0.98 + 0.1 * Math.sin(tt * 0.04 + i) + 0.05 * (Math.random() - 0.5))
          );
          return { ...p, energy, symmetry, curvature };
        });
        avg = next.reduce((a, p) => a + p.energy, 0) / next.length;
        return next;
      });

      // capture the average energy for the analytic graph (R)
      setHistory(arr => {
        const next = [...arr.slice(-99), avg];
        onHistory?.(next);
        return next;
      });

      // ε events sampled from resonant energy peaks
      if (Math.random() < 0.06) {
        setTimeline(arr => [...arr.slice(-63), { t: tt, score: avg }]);
      }

      setT(tt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, onHistory]);

  return (
    <div className="bg-slate-900/70 rounded-2xl p-3 capture-frame relative">
      {label && <div className="text-sm font-semibold mb-2">{label}</div>}
      {mode !== "plot" && (
        <PhiCanvas
          possibilities={poss}
          timeline={timeline}
          t={t}
          className="h-48"
          paletteIndex={seed}
        />
      )}
      {mode !== "visual" && (
        <div className={mode === "both" ? "mt-3" : ""}>
          <LinePlot data={history} />
        </div>
      )}
      {mode !== "visual" && (
        <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
          <button
            className={"px-2 py-1 rounded-md "+(running?"bg-slate-800":"bg-indigo-700") }
            onClick={onToggle}
          >
            {running? "Pausar 𝓣":"Iniciar 𝓣"}
          </button>
          <button className="px-2 py-1 rounded-md bg-slate-800" onClick={onResetSoft}>Reset 𝓣/R</button>
          <button className="px-2 py-1 rounded-md bg-slate-800" onClick={onResetHard}>Big Bang ♻︎</button>
          <span className="ml-auto">seed: {seed}</span>
        </div>
      )}
    </div>
  );
}

// ======= Main App: Grid + global controls =======
export default function App(){
  const COUNT = 3;
  const [seeds, setSeeds] = useState<number[]>(() => Array.from({length: COUNT}, (_,i)=> 42 + i*7));
  const [running, setRunning] = useState<boolean[]>(() => Array.from({length: COUNT}, ()=> true));

  const startAll = () => setRunning(arr => arr.map(()=>true));
  const pauseAll = () => setRunning(arr => arr.map(()=>false));
  const resetAllSoft = () => setSeeds(prev => [...prev]); // triggers soft reset via key change in UniverseCell
  const resetAllHard = () => setSeeds(prev => prev.map((_,i)=> Math.floor(Math.random()*100000)));

  const historiesRef = useRef<number[][]>(Array.from({length: COUNT}, ()=>[]));

  const exportExcel = () => {
    const rows: string[] = [];
    historiesRef.current.forEach((hist, i) => {
      rows.push(`Gráfica ${i + 1}`);
      rows.push("t,value");
      hist.forEach((v, idx) => rows.push(`${idx + 1},${v}`));
      rows.push("");
    });
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graficas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 relative">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">BigBangSim — Φ ∘ 𝓛(x) → R</h1>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={startAll}>Iniciar todo</button>
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={pauseAll}>Pausar todo</button>
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={resetAllSoft}>Reset 𝓣/R</button>
          <button className="px-3 py-1 rounded-xl bg-indigo-700 hover:bg-indigo-600" onClick={resetAllHard}>Big Bang ♻︎</button>
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={exportExcel}>Exportar CSV</button>
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={()=>exportGridPng("grid")}>Exportar captura</button>
        </div>
      </header>

      <div id="grid">
        <div className="grid grid-cols-3 gap-4 mb-4">
          {seeds.map((s, i) => (
            <UniverseCell
              key={"v"+i+"-"+s}
              seed={s}
              running={running[i]}
              onToggle={()=> setRunning(prev => prev.map((v,idx)=> idx===i ? !v : v))}
              onResetSoft={()=> setSeeds(prev => prev.map((v,idx)=> idx===i ? v : v))}
              onResetHard={()=> setSeeds(prev => prev.map((v,idx)=> idx===i ? Math.floor(Math.random()*100000) : v))}
              mode="visual"
              label={`Cámara Φ-${i + 1}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {seeds.map((s, i) => (
            <UniverseCell
              key={"p"+i+"-"+s}
              seed={s}
              running={running[i]}
              onToggle={()=> setRunning(prev => prev.map((v,idx)=> idx===i ? !v : v))}
              onResetSoft={()=> setSeeds(prev => prev.map((v,idx)=> idx===i ? v : v))}
              onResetHard={()=> setSeeds(prev => prev.map((v,idx)=> idx===i ? Math.floor(Math.random()*100000) : v))}
              mode="plot"
              label={`Gráfica ${i + 1}`}
              onHistory={arr => { historiesRef.current[i] = arr; }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

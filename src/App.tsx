
import React, { useEffect, useState } from "react";
import { AXIOM_LABELS, MICRO_LEGENDS } from "./axioms";
import { exportGridPng } from "./utils/capture";
import { LinePlot } from "./components/LinePlot";

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
    arr.push({ id: `p${i}`, energy: rnd(), symmetry: rnd(), curvature: -1 + rnd() * 2 });
  }
  return arr;
}

// ======= One universe cell with line plot =======
function UniverseCell({ seed, running, onToggle, onResetSoft, onResetHard }:{
  seed: number; running: boolean; onToggle: () => void; onResetSoft: () => void; onResetHard: () => void;
}){
  const [poss, setPoss] = useState(seededPossibilities(seed, 36));
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => { setPoss(seededPossibilities(seed, 36)); setHistory([]); }, [seed]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = () => {
      const avg = poss.reduce((a,p)=>a+p.energy,0)/poss.length;
      setHistory(arr => [...arr.slice(-99), avg]);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, poss]);

  return (
    <div className="bg-slate-900/70 rounded-2xl p-3 capture-frame relative">
      <LinePlot data={history} />
      <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
        <button className={"px-2 py-1 rounded-md "+(running?"bg-slate-800":"bg-indigo-700") } onClick={onToggle}>{running? "Pausar 𝓣":"Iniciar 𝓣"}</button>
        <button className="px-2 py-1 rounded-md bg-slate-800" onClick={onResetSoft}>Reset 𝓣/R</button>
        <button className="px-2 py-1 rounded-md bg-slate-800" onClick={onResetHard}>Big Bang ♻︎</button>
        <span className="ml-auto">seed: {seed}</span>
      </div>
    </div>
  );
}

// ======= Overlay of axioms =======
function AxiomOverlay({ enabled }:{ enabled: boolean }){
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  if (!enabled) return null;
  return (
    <div className="axiom-overlay">
      {/* badges placed in meaningful positions */}
      {[
        {key:"Ω", x:"6%", y:"8%"},
        {key:"Φ", x:"18%", y:"20%"},
        {key:"𝓛(x)", x:"78%", y:"22%"},
        {key:"ℜ", x:"72%", y:"52%"},
        {key:"ε", x:"44%", y:"58%"},
        {key:"R", x:"50%", y:"82%"},
        {key:"𝓣", x:"8%", y:"90%"}
      ].map(({key,x,y}) => (
        <div
          key={key}
          className="axiom-badge"
          style={{ left: x, top: y, opacity: 0.3 }}
          onMouseEnter={() => setHoverKey(key)}
          onMouseLeave={() => setHoverKey(null)}
        >
          {key} — {MICRO_LEGENDS[key as keyof typeof MICRO_LEGENDS]}
          {hoverKey===key && (
            <div className="tooltip">
              <strong>{key}</strong>: {AXIOM_LABELS.find(a=>a.key===key)?.tip}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ======= Main App: Grid + global controls + overlay toggle =======
export default function App(){
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(3);
  const total = rows*cols;
  const [seeds, setSeeds] = useState<number[]>(() => Array.from({length: total}, (_,i)=> 42 + i*7));
  const [running, setRunning] = useState<boolean[]>(() => Array.from({length: total}, ()=> true));

  useEffect(()=>{
    // resize grid preserves first N seeds
    const n = rows*cols;
    setSeeds(prev => Array.from({length:n}, (_,i)=> prev[i] ?? (42 + i*7)));
    setRunning(prev => Array.from({length:n}, (_,i)=> prev[i] ?? true));
  }, [rows, cols]);

  const startAll = () => setRunning(arr => arr.map(()=>true));
  const pauseAll = () => setRunning(arr => arr.map(()=>false));
  const resetAllSoft = () => setSeeds(prev => [...prev]); // triggers soft reset via key change in UniverseCell
  const resetAllHard = () => setSeeds(prev => prev.map((_,i)=> Math.floor(Math.random()*100000)));

  const [showAxioms, setShowAxioms] = useState(false);

  // keyboard shortcut A
  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase()==="a") setShowAxioms(s => !s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 relative">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">BigBangSim — Φ ∘ 𝓛(x) → R</h1>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={startAll}>Iniciar todo</button>
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={pauseAll}>Pausar todo</button>
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={resetAllSoft}>Reset 𝓣/R</button>
          <button className="px-3 py-1 rounded-xl bg-indigo-700 hover:bg-indigo-600" onClick={resetAllHard}>Big Bang ♻︎</button>
          <button className={"px-3 py-1 rounded-xl "+(showAxioms?"bg-emerald-700":"bg-slate-800")} onClick={()=>setShowAxioms(s=>!s)} title="Atajo: A">ⓘ Axiomas (A)</button>
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={()=>exportGridPng("grid")}>Exportar captura</button>
        </div>
      </header>

      <div className="flex items-center gap-3 mb-3 text-sm">
        <label>Grid:</label>
        <select value={rows} onChange={e=>setRows(parseInt(e.target.value))} className="bg-slate-900 rounded-md px-2 py-1">
          {[1,2,3].map(n=><option key={n} value={n}>{n} filas</option>)}
        </select>
        <select value={cols} onChange={e=>setCols(parseInt(e.target.value))} className="bg-slate-900 rounded-md px-2 py-1">
          {[1,2,3,4].map(n=><option key={n} value={n}>{n} cols</option>)}
        </select>
        {/* Paleta eliminada para una interfaz más científica */}
      </div>

      <div id="grid" className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {seeds.map((s, i) => (
          <UniverseCell
            key={i+"-"+s}
            seed={s}
            running={running[i]}
            onToggle={()=> setRunning(prev => prev.map((v,idx)=> idx===i ? !v : v))}
            onResetSoft={()=> setSeeds(prev => prev.map((v,idx)=> idx===i ? v : v))}
            onResetHard={()=> setSeeds(prev => prev.map((v,idx)=> idx===i ? Math.floor(Math.random()*100000) : v))}
          />
        ))}
      </div>

      <AxiomOverlay enabled={showAxioms} />
    </div>
  );
}

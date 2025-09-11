
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AXIOM_LABELS, MICRO_LEGENDS } from "./axioms";
import { exportGridPng } from "./utils/capture";
import { exportExcel } from "./exports/xlsx";
import { ModeToggle } from "./ui/ModeToggle";
import { SolisPanel } from "./ui/solis/Panel";
import { telemetry } from "./solis/telemetry";

// ==== Core types reproduced to remain compatible with BigBang2 motor ====
type Possibility = { id: string; energy: number; symmetry: number; curvature: number; };
type EventEpsilon = { t: number; collapsedId: string; score: number; };

// ======= Color palettes (from BigBang1 feel + multiverso variants) =======
const PALETTES: string[][] = [
  ["#7dd3fc","#a78bfa","#f0abfc","#f472b6","#60a5fa"], // aurora cool
  ["#fef08a","#fca5a5","#fdba74","#f97316","#fde68a"], // warm sunrise
  ["#34d399","#22d3ee","#38bdf8","#a7f3d0","#f5d0fe"], // bio-neon
  ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6"], // bold spectrum
];

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

// ======= The visual canvas (keeps BigBang2 layout but enhances style) =======
function PhiCanvas({ possibilities, timeline, t, paletteIndex }:{ possibilities: Possibility[]; timeline: EventEpsilon[]; t: number; paletteIndex: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cvs = ref.current!;
    const ctx = cvs.getContext("2d")!;
    const W = (cvs.width = cvs.clientWidth);
    const H = (cvs.height = cvs.clientHeight);

    // background gradient (BigBang1 feel)
    const grad = ctx.createLinearGradient(0,0,W,H);
    const pal = PALETTES[paletteIndex % PALETTES.length];
    pal.forEach((c, i) => grad.addColorStop(i/(pal.length-1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);

    // particles (Φ possibilities) with resonance glow (multiverso feel)
    for (let i = 0; i < possibilities.length; i++) {
      const p = possibilities[i];
      const x = ((i * 9973) % W) * 0.03 + (p.symmetry * W) % W;
      const y = ((i * 7919) % H) * 0.04 + ((p.energy + 0.12 * Math.sin(t*0.03+i)) * H) % H;
      const r = 2 + 3 * Math.abs(p.curvature);
      const hue = Math.floor(360 * (p.energy * 0.6 + p.symmetry * 0.4));
      ctx.beginPath();
      ctx.fillStyle = `hsla(${hue}, 90%, 60%, 0.85)`;
      ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.9)`;
      ctx.shadowBlur = 12;
      ctx.arc(x % W, y % H, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // timeline pulses (ε events)
    ctx.shadowBlur = 0;
    for (const e of timeline.slice(-8)) {
      const phase = (t - e.t) * 0.05;
      const alpha = Math.max(0, 0.6 - phase * 0.08);
      if (alpha <= 0) continue;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 1 + 2 * (1 - alpha);
      const cx = (e.score * 997) % W;
      const cy = (e.score * 661) % H;
      ctx.beginPath();
      ctx.arc(cx, cy, 12 + phase*12, 0, Math.PI*2);
      ctx.stroke();
    }
  }, [possibilities, timeline, t, paletteIndex]);

  return <canvas ref={ref} className="w-full rounded-xl" style={{ height: 280 }} />;
}

// ======= One universe cell =======
function UniverseCell({ seed, running, onToggle, onResetSoft, onResetHard, paletteIndex }:{
  seed: number; running: boolean; onToggle: () => void; onResetSoft: () => void; onResetHard: () => void; paletteIndex: number;
}){
  const [t, setT] = useState(0);
  const [poss, setPoss] = useState(seededPossibilities(seed, 36));
  const [timeline, setTimeline] = useState<EventEpsilon[]>([]);

  useEffect(() => { setPoss(seededPossibilities(seed, 36)); setTimeline([]); setT(0); }, [seed]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = () => {
      const nextT = t + 1;
      setT(nextT);
      telemetry.record({ t: nextT, R: timeline.length, Lx: {}, Phi: seed, ResScore: 0, EpsilonFlag: false, Tau: 0 });
      // probabilistic event (ε) with resonance (ℜ) flavor
      if (Math.random() < 0.06) {
        const id = poss[Math.floor(Math.random()*poss.length)].id;
        const score = Math.random();
        setTimeline(arr => {
          const newArr = [...arr, { t: nextT, collapsedId: id, score }].slice(-64);
          telemetry.record({ t: nextT, R: newArr.length, Lx: {}, Phi: seed, ResScore: score, EpsilonFlag: true, Tau: newArr.length - arr.length });
          return newArr;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, poss, t]);

  return (
    <div className="bg-slate-900/70 rounded-2xl p-3 capture-frame relative">
      <PhiCanvas possibilities={poss} timeline={timeline} t={t} paletteIndex={paletteIndex} />
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
  const [palette, setPalette] = useState(0);

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
  const [labelsMode, setLabelsMode] = useState<"min"|"full">("min");
  const [mode, setMode] = useState<'BigBang' | 'SOLIS'>(() => (localStorage.getItem('ui-mode') as any) || 'BigBang');
  useEffect(() => { localStorage.setItem('ui-mode', mode); }, [mode]);

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
          {mode === 'SOLIS' && <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={exportExcel}>Export Excel</button>}
          <ModeToggle mode={mode} onChange={setMode} />
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
        <span className="ml-4">Paleta:</span>
        <select value={palette} onChange={e=>setPalette(parseInt(e.target.value))} className="bg-slate-900 rounded-md px-2 py-1">
          {PALETTES.map((_,i)=><option key={i} value={i}>#{i+1}</option>)}
        </select>
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
            paletteIndex={(palette + i) % PALETTES.length}
          />
        ))}
      </div>

      <AxiomOverlay enabled={showAxioms} />
      {mode === 'SOLIS' && <SolisPanel />}
    </div>
  );
}

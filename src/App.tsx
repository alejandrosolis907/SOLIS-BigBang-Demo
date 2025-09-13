import React, { useEffect, useRef, useState, useCallback } from "react";
import { exportGridPng } from "./utils/capture";
import { LinePlot } from "./components/LinePlot";
import { GlobalParamsPanel } from "./components/GlobalParamsPanel";
import { KernelEditor } from "./components/KernelEditor";
import { ResonanceMeter } from "./components/ResonanceMeter";
import { makePhi, tick, drawToCanvas, RNG } from "./engine";

function UniverseCell({ seed, running, speed, grid, balance, friction, kernel, onToggle, onResetSoft, onResetHard, mode = "both", label, onHistory, resetSignal, onLatticeChange }:{
  seed: number;
  running: boolean;
  speed: number;
  grid: number;
  balance: number;
  friction: number;
  kernel: number[];
  onToggle: () => void;
  onResetSoft: () => void;
  onResetHard: () => void;
  mode?: "visual" | "plot" | "both";
  label?: string;
  onHistory?: (hist: number[]) => void;
  resetSignal: number;
  onLatticeChange?: (k: number[]) => void;
}){
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<any>(null);
  const [snap, setSnap] = useState<{t:number; energy:number; avgT:number}>({t:0, energy:0, avgT:0});
  const resThreshold = 0.7;

  const reset = useCallback(() => {
    const rng = new RNG(seed);
    const phi = makePhi(seed, grid);
    stateRef.current = {
      phi,
      shaped: new Float32Array(phi.length),
      grid,
      preset: "custom",
      customKernel: kernel.slice(),
      baseKernel: kernel.slice(),
      epsilon: resThreshold,
      rng,
      drift: 0.01 + (balance + 1) * 0.01,
      friction,
      sparks: [],
      events: 0,
    };
      setSnap({t:0, energy:0, avgT:0});
  }, [seed, grid, kernel, balance, friction]);

  useEffect(() => { reset(); }, [reset, resetSignal]);

  useEffect(() => {
    if(!running) return;
    let raf:number;
    const loop = () => {
      const st = stateRef.current;
      for(let i=0;i<Math.max(1,Math.floor(speed));i++) tick(st);
      drawToCanvas(st, canvasRef.current!);
      setSnap({t: st.time, energy: st.lastRes, avgT: st.avgT ?? 0});
      onLatticeChange?.(Array.from(st.customKernel));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, onLatticeChange]);

  useEffect(() => {
    if(stateRef.current){
      stateRef.current.customKernel = kernel.slice();
      stateRef.current.baseKernel = kernel.slice();
      stateRef.current.friction = friction;
      stateRef.current.drift = 0.01 + (balance + 1) * 0.01;
    }
  }, [kernel, friction, balance]);

  return (
    <div className="bg-slate-900/70 rounded-2xl p-3 capture-frame relative">
      {label && <div className="text-sm font-semibold mb-2">{label}</div>}
      {mode !== "plot" && (
        <canvas ref={canvasRef} className="w-full h-48 rounded-xl" width={grid*4} height={grid*4}></canvas>
      )}
      {mode !== "visual" && (
        <div className={mode === "both" ? "mt-3" : ""}>
          <LinePlot snapshot={snap} running={running} onHistory={onHistory} />
          <div className="mt-2"><ResonanceMeter value={snap.energy} time={snap.avgT} /></div>
        </div>
      )}
      {mode !== "visual" && (
        <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
          <button className={"px-2 py-1 rounded-md "+(running?"bg-slate-800":"bg-indigo-700")} onClick={onToggle}>{running?"Pausar 𝓣":"Iniciar 𝓣"}</button>
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
  const [baseSeed, setBaseSeed] = useState(42);
  const [gridSize, setGridSize] = useState(32);
  const [speed, setSpeed] = useState(1);
  const [balance, setBalance] = useState(0);
  const [friction, setFriction] = useState(0);
  const [kernel, setKernel] = useState<number[]>([0,-1,0,-1,5,-1,0,-1,0]);

  const [seeds, setSeeds] = useState<number[]>(() => Array.from({length: COUNT}, (_,i)=> baseSeed + i*7));
  const [running, setRunning] = useState<boolean[]>(() => Array.from({length: COUNT}, ()=> true));
  const [resetSignals, setResetSignals] = useState<number[]>(() => Array.from({length: COUNT}, ()=> 0));

  useEffect(() => {
    setSeeds(Array.from({length: COUNT}, (_,i)=> baseSeed + i*7));
    setResetSignals(Array.from({length: COUNT}, ()=>0));
  }, [baseSeed]);

  const startAll = () => setRunning(arr => arr.map(()=>true));
  const pauseAll = () => setRunning(arr => arr.map(()=>false));
  const resetAllSoft = () => setResetSignals(arr => arr.map(v=> v+1));
  const resetAllHard = () => {
    setSeeds(prev => prev.map((_,i)=> Math.floor(Math.random()*100000)));
  };

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
      <header className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-center sm:text-left">BigBangSim — Φ ∘ 𝓛(x) → R</h1>
        <div className="flex flex-wrap justify-center sm:justify-end gap-2">
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={startAll}>Iniciar todo</button>
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={pauseAll}>Pausar todo</button>
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={resetAllSoft}>Reset 𝓣/R</button>
          <button className="px-3 py-1 rounded-xl bg-indigo-700 hover:bg-indigo-600" onClick={resetAllHard}>Big Bang ♻︎</button>
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={exportExcel}>Exportar CSV</button>
          <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={()=>exportGridPng("grid")}>Exportar captura</button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4">
        <aside className="space-y-4 w-full lg:w-2/5">
          <GlobalParamsPanel
            seedBase={baseSeed}
            setSeedBase={setBaseSeed}
            speed={speed}
            setSpeed={setSpeed}
            grid={gridSize}
            setGrid={setGridSize}
            balance={balance}
            setBalance={setBalance}
            friction={friction}
            setFriction={setFriction}
          />
          <KernelEditor kernel={kernel} setKernel={setKernel} />
        </aside>
        <main className="w-full lg:w-3/5">
          <div id="grid">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {seeds.map((s, i) => (
                <UniverseCell
                  key={"v"+i+"-"+s}
                  seed={s}
                  running={running[i]}
                  speed={speed}
                  grid={gridSize}
                  balance={balance}
                  friction={friction}
                  kernel={kernel}
                  onToggle={()=> setRunning(prev => prev.map((v,idx)=> idx===i ? !v : v))}
                  onResetSoft={()=> setResetSignals(prev => prev.map((v,idx)=> idx===i ? v+1 : v))}
                  onResetHard={()=> setSeeds(prev => prev.map((v,idx)=> idx===i ? Math.floor(Math.random()*100000) : v))}
                  mode="visual"
                  label={`Cámara Φ-${i + 1}`}
                  resetSignal={resetSignals[i]}
                  onLatticeChange={setKernel}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {seeds.map((s, i) => (
                <UniverseCell
                  key={"p"+i+"-"+s}
                  seed={s}
                  running={running[i]}
                  speed={speed}
                  grid={gridSize}
                  balance={balance}
                  friction={friction}
                  kernel={kernel}
                  onToggle={()=> setRunning(prev => prev.map((v,idx)=> idx===i ? !v : v))}
                  onResetSoft={()=> setResetSignals(prev => prev.map((v,idx)=> idx===i ? v+1 : v))}
                  onResetHard={()=> setSeeds(prev => prev.map((v,idx)=> idx===i ? Math.floor(Math.random()*100000) : v))}
                  mode="plot"
                  label={`Gráfica ${i + 1}`}
                  onHistory={arr => { historiesRef.current[i] = arr; }}
                  resetSignal={resetSignals[i]}
                  onLatticeChange={setKernel}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

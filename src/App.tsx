
import React, { useEffect, useMemo, useRef, useState } from "react";
import { exportGridPng } from "./utils/capture";
import { LinePlot } from "./components/LinePlot";
import { PhiCanvas, type Snapshot as PhiSnapshot } from "./components/PhiCanvas";
import { GlobalParamsPanel } from "./components/GlobalParamsPanel";
import { KernelEditor } from "./components/KernelEditor";
import ReportPanel from "./ui/report";
import { ResonanceMeter } from "./components/ResonanceMeter";
import { Header } from "./ui/Header";
import { ExperimentsPanel } from "./ui/ExperimentsPanel";
import { MetricsPanel } from "./ui/MetricsPanel";
import { ParamsPanel } from "./ui/ParamsPanel";
import type { EngineAdapterResult } from "./lib/physics/adapters";
import type { ExperimentHints } from "./lib/bridge";
import { getAxiomsDocUrl, getExperimentsDocUrl } from "./config";

declare global {
  interface Window {
    __BB_EXPERIMENT_HINTS__?: ExperimentHints | null;
    __BB_RUNTIME_CONFIG__?: {
      experimentsDocUrl?: string | null;
    };
    __BB_EXPERIMENT_CONTEXT__?: {
      entryId?: string | null;
    } | null;
  }
}

// ==== Core types reproduced to remain compatible with BigBang2 motor ====
type Possibility = { id: string; energy: number; symmetry: number; curvature: number; phase: number; };
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
    arr.push({ id: `p${i}`, energy: rnd() * 0.05, symmetry: 0.5, curvature: 0, phase: rnd() * Math.PI * 2 });
  }
  return arr;
}

// ======= One universe cell with visual + plot =======
function UniverseCell({ seed, running, speed, grid, balance, kernel, mu, onToggle, onResetSoft, onResetHard, mode = "both", label, onHistory, resetSignal }:{
  seed: number;
  running: boolean;
  speed: number;
  grid: number;
  balance: number;
  kernel: number[];
  mu: number;
  onToggle: () => void;
  onResetSoft: () => void;
  onResetHard: () => void;
  mode?: "visual" | "plot" | "both";
  label?: string;
  onHistory?: (hist: number[]) => void;
  resetSignal: number;
}){
  const [snapshot, setSnapshot] = useState<PhiSnapshot>(() => ({
    t: 0,
    energy: 0,
    symmetry: 0.5,
    curvature: 0,
    possibilities: seededPossibilities(seed, grid),
    timeline: [],
  }));
  const snapshotRef = useRef(snapshot);
  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);
  const [freqHz, setFreqHz] = useState(0);
  const [resonance, setResonance] = useState(0);
  const prev1Ref = useRef<number | null>(null);
  const prev2Ref = useRef<number | null>(null);
  const lastPeakTickRef = useRef<number | null>(null);

  const reset = React.useCallback(() => {
    const snap: PhiSnapshot = {
      t: 0,
      energy: 0,
      symmetry: 0.5,
      curvature: 0,
      possibilities: seededPossibilities(seed, grid),
      timeline: [],
    };
    snapshotRef.current = snap;
    setSnapshot(snap);
    onHistory?.([]);
    setFreqHz(0);
    prev1Ref.current = null;
    prev2Ref.current = null;
    lastPeakTickRef.current = null;
  }, [seed, grid, onHistory]);

  useEffect(() => { reset(); }, [reset, resetSignal]);

  const runningRef = useRef(running);
  useEffect(() => {
    runningRef.current = running;
    if (!running) {
      prev1Ref.current = null;
      prev2Ref.current = null;
      lastPeakTickRef.current = null;
      setFreqHz(0);
    }
  }, [running]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = () => {
      const prev = snapshotRef.current;
      const tt = prev.t + speed;

      const expansion = 1 - Math.exp(-tt * 0.02);
      const cooling = Math.exp(-tt * 0.0005);
      const base = expansion * cooling;

      const center = kernel[4] ?? 1;
      const ksum = kernel.reduce((a, b) => a + b, 0) || 1;
      let energyFirst = 0;
      const nextPoss = prev.possibilities.map((p, i) => {
        const noise = 0.1 * speed * (Math.random() - 0.5);
        const oscill = 0.15 * Math.sin(tt * 0.05 + i) * speed;
        const influx = base * center + oscill + noise + balance * 0.5;
        const energy = Math.min(
          1,
          Math.max(0, p.energy * (1 - mu) + influx)
        );
        const symmetry = Math.min(
          1,
          Math.max(
            0,
            0.5 + 0.5 * Math.cos(tt * 0.03 + i) * base * (ksum / 9) +
              balance * 0.5 + 0.1 * speed * (Math.random() - 0.5)
          )
        );
        const curvature = Math.max(
          -1,
          Math.min(
            1,
            p.curvature * 0.98 + 0.1 * Math.sin(tt * 0.04 + i) * speed +
              (center - 1) * 0.1 + 0.05 * speed * (Math.random() - 0.5)
          )
        );
        const phase = p.phase + 0.02 * speed + 0.01 * speed * Math.sin(tt * 0.01 + i);
        return { ...p, energy, symmetry, curvature, phase };
      });
      const avg = nextPoss.reduce((a, p) => a + p.energy, 0) / nextPoss.length;
      const avgSym = nextPoss.reduce((a, p) => a + p.symmetry, 0) / nextPoss.length;
      const avgCurv = nextPoss.reduce((a, p) => a + p.curvature, 0) / nextPoss.length;
      const res = nextPoss.reduce((a, p) => a + p.energy * p.symmetry, 0) / nextPoss.length;
      energyFirst = nextPoss[0]?.energy ?? 0;

      let timeline = prev.timeline;
      if (Math.random() < 0.06 * speed) {
        timeline = [...timeline.slice(-63), { t: tt, score: avg }];
      }

      const snap: PhiSnapshot = { t: tt, energy: avg, symmetry: avgSym, curvature: avgCurv, possibilities: nextPoss, timeline };
      snapshotRef.current = snap;
      setSnapshot(snap);
      setResonance(res);

      if (
        prev2Ref.current !== null &&
        prev1Ref.current !== null &&
        prev1Ref.current > prev2Ref.current &&
        prev1Ref.current > energyFirst
      ) {
        if (lastPeakTickRef.current != null) {
          const periodTicks = tt - lastPeakTickRef.current;
          if (periodTicks > 0) {
            setFreqHz((60 * speed) / periodTicks);
          }
        }
        lastPeakTickRef.current = tt;
      }
      prev2Ref.current = prev1Ref.current;
      prev1Ref.current = energyFirst;

      if (runningRef.current) {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, balance, kernel]);

  return (
    <div className="bg-slate-900/70 rounded-2xl p-3 capture-frame relative">
      {label && <div className="text-sm font-semibold mb-2">{label}</div>}
      {mode !== "plot" && (
        <PhiCanvas
          snapshot={snapshot}
          speed={speed}
          className="h-48"
          paletteIndex={seed}
        />
      )}
      {mode !== "visual" && (
        <div className={mode === "both" ? "mt-3" : ""}>
          <LinePlot snapshot={snapshot} running={running} onHistory={onHistory} />
          <div className="text-xs mt-1">f ≈ {freqHz.toFixed(2)} Hz</div>
          <div className="mt-2"><ResonanceMeter value={resonance} /></div>
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
  const [baseSeed, setBaseSeed] = useState(42);
  const [gridSize, setGridSize] = useState(32);
  const [speed, setSpeed] = useState(1);
  const [balance, setBalance] = useState(0);
  const [mu, setMu] = useState(0);
  const [kernel, setKernel] = useState<number[]>([0,-1,0,-1,5,-1,0,-1,0]);

  const kernelIntensity = useMemo(() => {
    if (!kernel.length) return 0;
    const magnitude = kernel.reduce((sum, value) => sum + Math.abs(value), 0);
    return magnitude / kernel.length;
  }, [kernel]);
  const muStructural = Math.min(0.5, kernelIntensity * 0.12);
  const muEffective = Math.min(0.9, mu + muStructural);

  const [seeds, setSeeds] = useState<number[]>(() => Array.from({length: COUNT}, (_,i)=> baseSeed + i*7));
  const [running, setRunning] = useState<boolean[]>(() => Array.from({length: COUNT}, ()=> true));
  const [resetSignals, setResetSignals] = useState<number[]>(() => Array.from({length: COUNT}, ()=> 0));
  const [showExperimentsPanel, setShowExperimentsPanel] = useState(false);
  const [showParamsPanel, setShowParamsPanel] = useState(false);
  const [appliedEngineSuggestions, setAppliedEngineSuggestions] =
    useState<EngineAdapterResult | null>(null);
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!appliedEngineSuggestions) {
      window.__BB_EXPERIMENT_HINTS__ = null;
      window.__BB_EXPERIMENT_CONTEXT__ = null;
      return;
    }
    const { suggestions } = appliedEngineSuggestions;
    const normalizeNumeric = (value: number | null): number | null =>
      typeof value === "number" && Number.isFinite(value) ? value : null;
    const hints: ExperimentHints = {
      noise: normalizeNumeric(suggestions.noise),
      damping: normalizeNumeric(suggestions.damping),
      threshold: normalizeNumeric(suggestions.threshold),
      kernelPreset: suggestions.kernelPreset ?? null,
    };
    window.__BB_EXPERIMENT_HINTS__ = hints;
    window.__BB_EXPERIMENT_CONTEXT__ = {
      entryId: appliedEngineSuggestions.entryId,
    };
  }, [appliedEngineSuggestions]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.__BB_EXPERIMENT_HINTS__ = null;
        window.__BB_EXPERIMENT_CONTEXT__ = null;
      }
    };
  }, []);

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

  const openExperimentsDoc = React.useCallback(() => {
    const experimentsUrl = getExperimentsDocUrl();
    window.open(experimentsUrl, "_blank", "noopener,noreferrer");
  }, []);

  const openAxiomsDoc = React.useCallback(() => {
    const axiomsUrl = getAxiomsDocUrl();
    window.open(axiomsUrl, "_blank", "noopener,noreferrer");
  }, []);

  const experimentsToggleClassName = showExperimentsPanel
    ? "px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white shadow"
    : "px-3 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white shadow";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 relative">
      <Header
        onStartAll={startAll}
        onPauseAll={pauseAll}
        onResetSoft={resetAllSoft}
        onResetHard={resetAllHard}
        onExportCsv={exportExcel}
        onExportCapture={() => exportGridPng("grid")}
        onOpenExperimentsDoc={openExperimentsDoc}
        onToggleMetrics={() => setShowMetricsPanel((prev) => !prev)}
        onToggleParams={() => setShowParamsPanel((prev) => !prev)}
        metricsOpen={showMetricsPanel}
        paramsOpen={showParamsPanel}
      />

      {(showMetricsPanel || showParamsPanel) && (
        <div className="space-y-4 mb-4">
          {showParamsPanel && (
            <ParamsPanel
              onApplySuggestions={(result) => setAppliedEngineSuggestions(result)}
              lastAppliedResult={appliedEngineSuggestions}
            />
          )}
          {showMetricsPanel && <MetricsPanel seed={baseSeed} depth={gridSize} />}
        </div>
      )}

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
            mu={mu}
            setMu={setMu}
            muStructural={muStructural}
            muEffective={muEffective}
          />
          <KernelEditor kernel={kernel} setKernel={setKernel} />
          <ReportPanel />
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
                  kernel={kernel}
                  mu={muEffective}
                  onToggle={()=> setRunning(prev => prev.map((v,idx)=> idx===i ? !v : v))}
                  onResetSoft={()=> setResetSignals(prev => prev.map((v,idx)=> idx===i ? v+1 : v))}
                  onResetHard={()=> setSeeds(prev => prev.map((v,idx)=> idx===i ? Math.floor(Math.random()*100000) : v))}
                  mode="visual"
                  label={`Cámara Φ-${i + 1}`}
                  resetSignal={resetSignals[i]}
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
                  kernel={kernel}
                  mu={muEffective}
                  onToggle={()=> setRunning(prev => prev.map((v,idx)=> idx===i ? !v : v))}
                  onResetSoft={()=> setResetSignals(prev => prev.map((v,idx)=> idx===i ? v+1 : v))}
                  onResetHard={()=> setSeeds(prev => prev.map((v,idx)=> idx===i ? Math.floor(Math.random()*100000) : v))}
                  mode="plot"
                  label={`Gráfica ${i + 1}`}
                  onHistory={arr => { historiesRef.current[i] = arr; }}
                  resetSignal={resetSignals[i]}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                className={experimentsToggleClassName}
                onClick={() => setShowExperimentsPanel((prev) => !prev)}
                type="button"
              >
                {showExperimentsPanel
                  ? "Cerrar mapa Φ ∘ 𝓛(x)"
                  : "Mapa Φ ∘ 𝓛(x)"}
              </button>
            </div>
            {showExperimentsPanel && (
              <div className="mt-4">
                <ExperimentsPanel onOpenDoc={openAxiomsDoc} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

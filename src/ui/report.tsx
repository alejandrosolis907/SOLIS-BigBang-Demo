import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_BATCH_CONFIG,
  REPORT_SUMMARY_KEYS,
  formatExperimentCsv,
  runBatchExperiments,
  type ExperimentResult,
  type ExperimentSummary,
} from "../lib/experiments";

function formatMeanStd(stats?: { mean: number; stdev: number }, digits = 3) {
  if (!stats) return "–";
  const mean = Number.isFinite(stats.mean) ? stats.mean.toFixed(digits) : "–";
  const stdev = Number.isFinite(stats.stdev) ? stats.stdev.toFixed(digits) : "–";
  return `${mean} ± ${stdev}`;
}

function clamp01(value: number) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function ReportPanel() {
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [summary, setSummary] = useState<ExperimentSummary | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleRun = useCallback(async () => {
    setStatus("running");
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 10));
    try {
      const { results, summary } = runBatchExperiments();
      setResults(results);
      setSummary(summary);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !results.length) return;
    const width = 360;
    const height = 240;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    const padding = 36;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(padding, padding);
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText("R² perímetro", width / 2 - 36, height - 8);
    ctx.save();
    ctx.translate(12, height / 2 + 24);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("R² área", 0, 0);
    ctx.restore();

    ctx.strokeStyle = "#334155";
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, padding);
    ctx.stroke();

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;
    ctx.fillStyle = "rgba(129, 140, 248, 0.78)";
    for (const item of results) {
      const x = padding + plotWidth * clamp01(item.r2Perimeter);
      const y = height - padding - plotHeight * clamp01(item.r2Area);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    if (summary) {
      const meanPerimeter = summary.metrics.r2Perimeter?.mean ?? 0;
      const meanArea = summary.metrics.r2Area?.mean ?? 0;
      const x = padding + plotWidth * clamp01(meanPerimeter);
      const y = height - padding - plotHeight * clamp01(meanArea);
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [results, summary]);

  const summaryRows = useMemo(() => {
    if (!summary) return [];
    return REPORT_SUMMARY_KEYS.map(({ key, label }) => ({
      key,
      label,
      stats: summary.metrics[key],
    }));
  }, [summary]);

  const handleExport = useCallback(() => {
    if (!results.length) return;
    const csv = formatExperimentCsv(results);
    const csvBlob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement("a");
    csvLink.href = csvUrl;
    csvLink.download = `reporte-experimentos-${Date.now()}.csv`;
    csvLink.click();
    URL.revokeObjectURL(csvUrl);

    const canvas = canvasRef.current;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const pngLink = document.createElement("a");
      pngLink.href = pngUrl;
      pngLink.download = `comparativa-area-volumen-${Date.now()}.png`;
      pngLink.click();
    }
  }, [results]);

  return (
    <div className="bg-slate-900/80 rounded-2xl p-4 space-y-3">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Panel de resultados reproducibles</h2>
          <p className="text-xs text-slate-400">
            Barridos en depth, boundaryNoise y kernelMix (≥30 corridas). Configuración por defecto:
            depth={DEFAULT_BATCH_CONFIG.depths.join(",")}, noise={DEFAULT_BATCH_CONFIG.boundaryNoises.join(",")},
            kernelMix={DEFAULT_BATCH_CONFIG.kernelMixes.join(",")}, semillas={DEFAULT_BATCH_CONFIG.seeds.length}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm disabled:opacity-40"
            onClick={handleRun}
            disabled={status === "running"}
          >
            {status === "running" ? "Calculando…" : "Correr experimentos"}
          </button>
          <button
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm disabled:opacity-40"
            onClick={handleExport}
            disabled={!results.length}
          >
            Exportar reporte
          </button>
        </div>
      </header>

      {error && (
        <div className="text-sm text-rose-400">
          Error al generar el reporte: {error}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full rounded-xl border border-slate-800"
        aria-label="Comparativa R² perímetro vs R² área"
      />

      {summary && (
        <div className="space-y-2 text-sm">
          <div className="text-slate-300">
            Corridas totales: <span className="font-semibold">{summary.totalRuns}</span>
          </div>
          <table className="w-full text-left text-xs border-separate border-spacing-y-1">
            <thead>
              <tr className="text-slate-400">
                <th className="px-2">Métrica</th>
                <th className="px-2">Media ± DE</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map(({ key, label, stats }) => (
                <tr key={key} className="bg-slate-900/60">
                  <td className="px-2 py-1.5 font-medium">{label}</td>
                  <td className="px-2 py-1.5 text-slate-200">{formatMeanStd(stats)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!summary && status === "done" && (
        <div className="text-xs text-slate-400">No se encontraron datos para resumir.</div>
      )}
    </div>
  );
}

export default ReportPanel;

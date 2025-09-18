import React, { useCallback, useEffect, useState } from "react";
import {
  getConstraintSatisfaction,
  getHintsApplied,
  subscribeMetrics,
  type ConstraintSatisfactionMetrics,
  type HintsAppliedMetrics,
} from "../metrics";

type MetricsPanelProps = {
  seed?: number | string | null;
  depth?: number | string | null;
};

type PanelSnapshot = {
  constraints: ConstraintSatisfactionMetrics;
  hints: HintsAppliedMetrics;
};

const getPanelSnapshot = (): PanelSnapshot => ({
  constraints: getConstraintSatisfaction(),
  hints: getHintsApplied(),
});

const subscribeToPanel = (listener: () => void): (() => void) => {
  return subscribeMetrics(listener);
};

const constraintsEqual = (
  a: ConstraintSatisfactionMetrics,
  b: ConstraintSatisfactionMetrics,
): boolean => {
  return (
    a.entryId === b.entryId &&
    a.constraintsOk === b.constraintsOk &&
    a.constraintsFailed === b.constraintsFailed
  );
};

const hintsEqual = (a: HintsAppliedMetrics, b: HintsAppliedMetrics): boolean => {
  if (a.entryId !== b.entryId) {
    return false;
  }
  if (a.hints === "N/D" || b.hints === "N/D") {
    return a.hints === b.hints;
  }
  if (a.hints.length !== b.hints.length) {
    return false;
  }
  for (let i = 0; i < a.hints.length; i += 1) {
    if (a.hints[i] !== b.hints[i]) {
      return false;
    }
  }
  return true;
};

const formatCount = (value: number | "N/D"): string => {
  return value === "N/D" ? value : value.toString();
};

const resolveHintsForCsv = (hints: readonly string[] | "N/D"): string => {
  if (hints === "N/D") {
    return "N/D";
  }
  if (hints.length === 0) {
    return "Ninguno";
  }
  return hints.join("|");
};

export function MetricsPanel(_props: MetricsPanelProps) {
  const [snapshot, setSnapshot] = useState<PanelSnapshot>(() => getPanelSnapshot());

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToPanel(() => {
      if (!isMounted) {
        return;
      }
      setSnapshot((prev) => {
        const next = getPanelSnapshot();
        if (
          constraintsEqual(prev.constraints, next.constraints) &&
          hintsEqual(prev.hints, next.hints)
        ) {
          return prev;
        }
        return next;
      });
    });
    setSnapshot(getPanelSnapshot());
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const { constraints, hints } = snapshot;

  const activeEntryId =
    hints.entryId !== "N/D"
      ? hints.entryId
      : constraints.entryId !== "N/D"
      ? constraints.entryId
      : "N/D";

  const validatedEntryId = constraints.entryId !== "N/D" ? constraints.entryId : "N/D";
  const hintsEntryId = hints.entryId !== "N/D" ? hints.entryId : "N/D";

  const constraintsOkDisplay = formatCount(constraints.constraintsOk);
  const constraintsFailedDisplay = formatCount(constraints.constraintsFailed);
  const hintsList = hints.hints === "N/D" ? "N/D" : [...hints.hints];
  const csvHints = resolveHintsForCsv(hintsList);

  const handleExport = useCallback(() => {
    const timestamp = new Date().toISOString();
    const rows = [
      "entryId,constraints_ok,constraints_failed,hints,timestamp",
      [activeEntryId, constraintsOkDisplay, constraintsFailedDisplay, csvHints, timestamp].join(","),
    ];

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `metricas-phi-l-${timestamp.replace(/[:.]/g, "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [activeEntryId, constraintsFailedDisplay, constraintsOkDisplay, csvHints]);

  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Panel de métricas Φ–𝓛</h2>
        <p className="text-sm text-slate-400">Estado de validación y hints aplicados.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricSummary label="Entrada activa (Φ–𝓛)" value={activeEntryId} />
        <MetricSummary label="Limitantes cumplidas" value={constraintsOkDisplay} />
        <MetricSummary label="Limitantes ajustadas" value={constraintsFailedDisplay} />
      </div>

      <div className="grid gap-2 text-sm text-slate-300">
        <DetailRow label="Validación registrada" value={validatedEntryId} />
        <DetailRow label="Fuente de hints" value={hintsEntryId} />
      </div>

      <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Hints activos</div>
        {hintsList === "N/D" ? (
          <p className="text-sm text-slate-500">N/D</p>
        ) : hintsList.length === 0 ? (
          <p className="text-sm text-slate-300">Ninguno</p>
        ) : (
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
            {hintsList.map((hint, index) => (
              <li key={`${hint}-${index}`}>{hint}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <button
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm"
          onClick={handleExport}
          type="button"
        >
          Exportar CSV
        </button>
      </div>
    </section>
  );
}

type MetricSummaryProps = {
  label: string;
  value: string;
};

function MetricSummary({ label, value }: MetricSummaryProps) {
  return (
    <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-2xl font-semibold text-slate-100 break-words">{value || "N/D"}</div>
    </div>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between bg-slate-900/40 rounded-xl p-3 border border-slate-800/40">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm text-slate-100 break-words">{value || "N/D"}</span>
    </div>
  );
}

export default MetricsPanel;

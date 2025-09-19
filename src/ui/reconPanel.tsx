import React from "react";
import type { ReconstructionMetrics } from "../reconstruction";

type ModeOption = "contiguous" | "alternate";

type TrainingHandlers = {
  onFreeze?: () => void;
  onClear?: () => void;
  onTrainLinear?: () => void;
  onTrainMLP?: () => void;
};

type ReconPanelProps = TrainingHandlers & {
  datasetSize: number;
  gridSize?: number;
  boundaryLength?: number;
  status?: string;
  metrics?: ReconstructionMetrics | null;
  coverage: number;
  onCoverageChange?: (value: number) => void;
  mode?: ModeOption;
  onModeChange?: (mode: ModeOption) => void;
  busy?: boolean;
  modelType?: "linear" | "mlp" | null;
  modelReady?: boolean;
  holographicActive?: boolean;
  degradePreview?: Array<{ coverage: number; psnr: number; psnrInterior?: number }>;
};

function formatNumber(value: number | undefined, digits = 4): string {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }
  if (!Number.isFinite(value)) {
    return "∞";
  }
  return value.toFixed(digits);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function ReconstructionPanel({
  datasetSize,
  gridSize,
  boundaryLength,
  status,
  metrics,
  coverage,
  onCoverageChange,
  mode = "contiguous",
  onModeChange,
  busy,
  modelType,
  modelReady,
  holographicActive,
  degradePreview,
  onFreeze,
  onClear,
  onTrainLinear,
  onTrainMLP,
}: ReconPanelProps) {
  const handleCoverage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(event.target.value);
    if (Number.isNaN(parsed)) return;
    onCoverageChange?.(Math.max(0, Math.min(1, parsed)));
  };

  const handleMode = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onModeChange?.(event.target.value as ModeOption);
  };

  const disableActions = busy || !holographicActive;

  return (
    <div style={{ border: "1px solid #444", borderRadius: 8, padding: 12, display: "grid", gap: 12 }}>
      <strong>Reconstrucción bulk-from-boundary</strong>
      <small style={{ color: "#a0aec0" }}>
        Congela configuraciones holográficas para entrenar un decodificador B que infiera el bulk completo desde la frontera.
        Compara el error cuadrático medio (MSE) y el PSNR tanto en todo el lattice como solo en la región interna, y recorta la
        cobertura de la frontera para simular un entanglement wedge parcial.
      </small>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        <Stat label="Muestras" value={datasetSize.toString()} />
        <Stat label="Grid" value={gridSize ? `${gridSize}×${gridSize}` : "—"} />
        <Stat label="|∂A|" value={boundaryLength !== undefined ? boundaryLength.toString() : "—"} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={onFreeze}
          disabled={disableActions}
          style={buttonStyle(disableActions)}
        >
          Congelar bulk
        </button>
        <button
          onClick={onTrainLinear}
          disabled={disableActions || datasetSize === 0}
          style={buttonStyle(disableActions || datasetSize === 0)}
        >
          Entrenar lineal
        </button>
        <button
          onClick={onTrainMLP}
          disabled={disableActions || datasetSize === 0}
          style={buttonStyle(disableActions || datasetSize === 0)}
        >
          Entrenar MLP
        </button>
        <button
          onClick={onClear}
          disabled={busy}
          style={buttonStyle(!!busy)}
        >
          Resetear dataset
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", gap: 8, alignItems: "center" }}>
        <span>Cobertura de frontera</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={Math.max(0, Math.min(1, coverage))}
          onChange={handleCoverage}
        />
        <code>{formatPercent(Math.max(0, Math.min(1, coverage)))}</code>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>Modo de máscara</span>
        <select value={mode} onChange={handleMode}>
          <option value="contiguous">Contiguo</option>
          <option value="alternate">Alterno</option>
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
        <MetricCard label="MSE (global)" value={formatNumber(metrics?.mse)} color="#f87171" />
        <MetricCard label="MSE (interior)" value={formatNumber(metrics?.mseInterior)} color="#fb923c" />
        <MetricCard label="PSNR (global)" value={formatNumber(metrics?.psnr, 2)} color="#34d399" />
        <MetricCard label="PSNR (interior)" value={formatNumber(metrics?.psnrInterior, 2)} color="#38bdf8" />
      </div>

      {modelType && (
        <small style={{ color: "#cbd5f5" }}>
          Modelo entrenado: {modelType.toUpperCase()} {modelReady ? "(listo)" : "(pendiente)"}
        </small>
      )}

      {degradePreview && degradePreview.length > 0 && (
        <div style={{ border: "1px solid #2d3748", borderRadius: 6, padding: 8 }}>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>PSNR frente a recorte de frontera:</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: "#cbd5f5" }}>
                <th style={{ textAlign: "left" }}>Cobertura</th>
                <th style={{ textAlign: "left" }}>PSNR</th>
                <th style={{ textAlign: "left" }}>PSNR interior</th>
              </tr>
            </thead>
            <tbody>
              {degradePreview.map((entry) => (
                <tr key={`coverage-${entry.coverage}`}>
                  <td>{formatPercent(entry.coverage)}</td>
                  <td>{formatNumber(entry.psnr, 2)}</td>
                  <td>{formatNumber(entry.psnrInterior ?? entry.psnr, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StatusMessage
        status={status}
        holographicActive={holographicActive}
        datasetSize={datasetSize}
        busy={busy}
      />
    </div>
  );
}

const baseButton: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 6,
  background: "#1e293b",
  color: "#f8fafc",
  border: "1px solid #334155",
  cursor: "pointer",
  fontSize: 12,
};

function buttonStyle(disabled: boolean): React.CSSProperties {
  if (disabled) {
    return {
      ...baseButton,
      background: "#1f2933",
      color: "#64748b",
      cursor: "not-allowed",
    };
  }
  return {
    ...baseButton,
    background: "#1d4ed8",
    border: "1px solid #1e40af",
  };
}

type StatProps = {
  label: string;
  value: string;
};

function Stat({ label, value }: StatProps) {
  return (
    <div style={{ border: "1px solid #333", borderRadius: 6, padding: 10 }}>
      <div style={{ fontSize: 12, color: "#94a3b8" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>{value}</div>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  color: string;
};

function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <div style={{ border: "1px solid #333", borderRadius: 6, padding: 10 }}>
      <div style={{ fontSize: 12, color: "#94a3b8" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

type StatusProps = {
  status?: string;
  holographicActive?: boolean;
  datasetSize: number;
  busy?: boolean;
};

function StatusMessage({ status, holographicActive, datasetSize, busy }: StatusProps) {
  const hints: string[] = [];
  if (!holographicActive) {
    hints.push("Activa el modo holográfico para capturar nuevas muestras.");
  }
  if (datasetSize === 0) {
    hints.push("Captura al menos una configuración antes de entrenar.");
  }
  if (busy) {
    hints.push("Procesando petición, por favor espera...");
  }

  return (
    <div style={{ fontSize: 12, color: "#a0aec0", display: "grid", gap: 4 }}>
      {status && <span>{status}</span>}
      {hints.map((hint, index) => (
        <span key={index} style={{ color: "#94a3b8" }}>
          {hint}
        </span>
      ))}
    </div>
  );
}

export default ReconstructionPanel;

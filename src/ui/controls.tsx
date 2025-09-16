import React from "react";

type HolographicControlsProps = {
  holographicMode: boolean;
  setHolographicMode: (value: boolean) => void;
  boundaryDepth: number;
  setBoundaryDepth: (value: number) => void;
  boundaryNoise: number;
  setBoundaryNoise: (value: number) => void;
  boundaryKernelMix: number;
  setBoundaryKernelMix: (value: number) => void;
};

export function HolographicControls({
  holographicMode,
  setHolographicMode,
  boundaryDepth,
  setBoundaryDepth,
  boundaryNoise,
  setBoundaryNoise,
  boundaryKernelMix,
  setBoundaryKernelMix,
}: HolographicControlsProps) {
  const handleDepth = (value: string) => {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      setBoundaryDepth(Math.max(0, Math.min(128, parsed)));
    }
  };

  const handleNoise = (value: string) => {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) {
      setBoundaryNoise(Math.max(0, Math.min(1, parsed)));
    }
  };

  const handleKernelMix = (value: string) => {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) {
      setBoundaryKernelMix(Math.max(0, Math.min(1, parsed)));
    }
  };

  return (
    <div style={{ border: "1px solid #444", borderRadius: 8, padding: 12, display: "grid", gap: 10 }}>
      <strong>Modo holográfico (𝓛 en la frontera)</strong>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={holographicMode}
          onChange={(event) => setHolographicMode(event.target.checked)}
        />
        <span>Activar propagación boundary-first</span>
      </label>
      <small style={{ color: "#aaa" }}>
        Con el modo holográfico activo, la estructura limitante 𝓛 se siembra en la frontera y se difunde por capas hacia el bulk. El
        resultado R depende de la configuración de estas capas externas, respetando el criterio holográfico.
      </small>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", gap: 8, alignItems: "center" }}>
        <span>Profundidad de capas</span>
        <input
          type="range"
          min={0}
          max={128}
          step={1}
          value={Math.max(0, Math.min(128, Math.round(boundaryDepth)))}
          onChange={(event) => handleDepth(event.target.value)}
          disabled={!holographicMode}
        />
        <code>{boundaryDepth}</code>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", gap: 8, alignItems: "center" }}>
        <span>Ruido de frontera</span>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.01}
          value={Math.max(0, Math.min(0.5, boundaryNoise))}
          onChange={(event) => handleNoise(event.target.value)}
          disabled={!holographicMode}
        />
        <code>{boundaryNoise.toFixed(2)}</code>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", gap: 8, alignItems: "center" }}>
        <span>Kernel mix</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={Math.max(0, Math.min(1, boundaryKernelMix))}
          onChange={(event) => handleKernelMix(event.target.value)}
          disabled={!holographicMode}
        />
        <code>{boundaryKernelMix.toFixed(2)}</code>
      </div>
      <small style={{ color: "#888" }}>
        Profundidades mayores extienden la influencia holográfica hacia el bulk. El ruido introduce variaciones deterministas en la
        frontera (Axioma IX), mientras que el mix ajusta el kernel usado en la propagación (entre SMOOTH y RIGID).
      </small>
    </div>
  );
}

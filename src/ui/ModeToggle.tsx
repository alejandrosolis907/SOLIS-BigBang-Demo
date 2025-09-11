import React from "react";

const SOLIS = import.meta.env.VITE_UI_MODE_SOLIS_ENABLED === "1";

export function ModeToggle() {
  if (!SOLIS) return null;
  const [mode, setMode] = React.useState<"BigBang" | "SOLIS">("BigBang");
  return (
    <div style={{ position: "fixed", top: 12, right: 12, padding: 8, background: "rgba(0,0,0,0.4)", borderRadius: 8 }}>
      <label style={{ marginRight: 8 }}>UI Mode:</label>
      <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
        <option>BigBang</option>
        <option>SOLIS</option>
      </select>
    </div>
  );
}

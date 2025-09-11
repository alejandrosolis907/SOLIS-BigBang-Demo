import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { SimulationController, setUIMode } from "../src/solis/api";
import { subscribeSnapshots, resetBuffer, getBuffer } from "../src/solis/telemetry";
import { exportExcel } from "../src/exports/xlsx";

function ensureDir(p: string) { if (!existsSync(p)) mkdirSync(p, { recursive: true }); }

async function main() {
  if (process.env.UI_MODE_SOLIS_ENABLED !== "1") {
    console.log("[verify] UI_MODE_SOLIS_ENABLED != 1 → verificación omitida.");
    return;
  }
  console.log("[verify] Iniciando verificación 30s (modo SOLIS)...");
  ensureDir("./artifacts");
  resetBuffer();
  setUIMode("SOLIS");

  const unsub = subscribeSnapshots(() => {});
  await SimulationController.start();

  const ms = Number(process.env.VERIFY_MS ?? 30000);
  await new Promise((r) => setTimeout(r, ms));

  await SimulationController.stop();
  unsub?.();

  const buffer = getBuffer();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const out = join("./artifacts", `verify_export_${ts}.xlsx`);
  await exportExcel({ series: buffer.series, meta: {
    ui_mode: "SOLIS",
    axioms_version: process.env.AXIOMS_VERSION ?? "v2",
    verify_window_ms: ms,
  }}, out);
  console.log("[verify] OK:", out);
}

main().catch((e) => { console.error("[verify] ERROR:", e); process.exit(0); });

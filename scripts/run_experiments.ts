// @ts-nocheck
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_BATCH_CONFIG,
  formatExperimentCsv,
  runBatchExperiments,
} from "../src/lib/experiments";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function main() {
  const { results, summary } = runBatchExperiments();
  const outDir = path.resolve(process.cwd(), "reports");
  ensureDir(outDir);
  const baseName = `experimentos-${timestamp()}`;
  const csvPath = path.join(outDir, `${baseName}.csv`);
  const jsonPath = path.join(outDir, `${baseName}.json`);

  fs.writeFileSync(csvPath, formatExperimentCsv(results), "utf8");
  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ config: DEFAULT_BATCH_CONFIG, summary, results }, null, 2),
    "utf8",
  );

  console.log(`✅ Reporte guardado en:\n  - ${csvPath}\n  - ${jsonPath}`);
  console.log(`Corridas totales: ${summary.totalRuns}`);
  for (const [key, stats] of Object.entries(summary.metrics)) {
    console.log(`  • ${key}: ${stats.mean.toFixed(4)} ± ${stats.stdev.toFixed(4)}`);
  }
}

main();

// src/utils/exportExcel.ts
// Exporta snapshots y eventos a Excel (silencioso si falta 'xlsx')
export async function exportExcel(data: {
  L: number[];
  theta: number;
  timeline: Array<{ t:number; resonance:number; epsilon?: { id:string; r:number } }>;
}, fileName = "telemetria_solis.xlsx") {
  try {
    const XLSX = await import('xlsx'); // carga dinámica
    const rows = data.timeline.map(row => ({
      t: row.t,
      resonance: row.resonance,
      epsilon_id: row.epsilon?.id ?? "",
      epsilon_r: row.epsilon?.r ?? ""
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "timeline");
    const meta = XLSX.utils.aoa_to_sheet([["L", ...data.L], ["theta", data.theta]]);
    XLSX.utils.book_append_sheet(wb, meta, "parametros");
    XLSX.writeFile(wb, fileName);
  } catch (e) {
    console.warn("xlsx no disponible; se omite exportación Excel.", e);
    alert("Exportación Excel omitida (librería 'xlsx' no instalada en runtime).");
  }
}

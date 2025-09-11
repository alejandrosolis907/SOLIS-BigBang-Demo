type Series = Array<{
  t: number;
  R: number[] | Float32Array;
  Lx: Record<string, number>;
  Phi: Record<string, number | string>;
  ResScore: number;
  EpsilonFlag: boolean;
  Tau: number;
}>;

export async function exportExcel(
  data: { series: Series; meta: Record<string, any> },
  outPath: string
) {
  let XLSX: any;
  try { XLSX = require("xlsx"); }
  catch {
    console.warn("[xlsx] Paquete 'xlsx' no instalado. Export omitido.");
    return;
  }
  const toSheet = (rows: any[]) => XLSX.utils.json_to_sheet(rows);

  const wb = XLSX.utils.book_new();
  const R_series = data.series.map(s => ({ t: s.t, R0: Number((s.R as any)[0] ?? 0), Tau: s.Tau }));
  const Lx_params = data.series.map(s => ({ t: s.t, ...s.Lx }));
  const Phi_seed  = data.series.map(s => ({ t: s.t, ...s.Phi }));
  const Res_events= data.series.map(s => ({ t: s.t, score: s.ResScore, flag: s.EpsilonFlag }));
  const Meta      = [ data.meta ];

  XLSX.utils.book_append_sheet(wb, toSheet(R_series),  "R_series");
  XLSX.utils.book_append_sheet(wb, toSheet(Lx_params), "Lx_params");
  XLSX.utils.book_append_sheet(wb, toSheet(Phi_seed),  "Phi_seed");
  XLSX.utils.book_append_sheet(wb, toSheet(Res_events),"Res_events");
  XLSX.utils.book_append_sheet(wb, toSheet(Meta),      "Meta");

  XLSX.writeFile(wb, outPath);
}

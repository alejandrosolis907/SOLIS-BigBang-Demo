// Excel export utilities for SOLIS telemetry
import * as XLSX from 'xlsx';
import { telemetry } from '../solis/telemetry';
import { PHI, LX, RES, EVT, TAU, R } from '../solis/ontology';

export function exportExcel() {
  const wb = XLSX.utils.book_new();
  const snaps = telemetry.snapshots;

  const rSheet = XLSX.utils.json_to_sheet(snaps.map(s => ({ t: s.t, R: s.R })));
  const lxSheet = XLSX.utils.json_to_sheet(snaps.map(s => s.Lx));
  const phiSheet = XLSX.utils.json_to_sheet(snaps.map(s => s.Phi));
  const resSheet = XLSX.utils.json_to_sheet(snaps.map(s => ({ t: s.t, ResScore: s.ResScore, Epsilon: s.EpsilonFlag })));
  const metaSheet = XLSX.utils.json_to_sheet([
    { key: 'mode', value: 'SOLIS' },
    { key: 'formula_R', value: 'R = ε(ℜ(Φ,𝓛(x),𝓣))' },
    { key: 'formula_T', value: '𝓣 = ∂R/∂𝓛(x)' },
  ]);

  XLSX.utils.book_append_sheet(wb, rSheet, 'R_series');
  XLSX.utils.book_append_sheet(wb, lxSheet, 'Lx_params');
  XLSX.utils.book_append_sheet(wb, phiSheet, 'Phi_seed');
  XLSX.utils.book_append_sheet(wb, resSheet, 'Res_events');
  XLSX.utils.book_append_sheet(wb, metaSheet, 'Meta');

  XLSX.writeFile(wb, 'solis_export.xlsx');
}

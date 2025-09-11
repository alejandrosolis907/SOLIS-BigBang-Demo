import { SOLIS_ENABLED, Snapshot } from "./ontology";

let buffer: { series: Snapshot[] } = { series: [] };
let subs: Array<() => void> = [];

export function resetBuffer() { buffer = { series: [] }; }
export function getBuffer() { return buffer; }

export function publishSnap(s: Snapshot) {
  if (!SOLIS_ENABLED) return;
  buffer.series.push(s);
  for (const cb of subs) try { cb(); } catch {}
}

export function subscribeSnapshots(cb: () => void) {
  if (!SOLIS_ENABLED) return () => {};
  subs.push(cb);
  return () => { subs = subs.filter(x => x !== cb); };
}

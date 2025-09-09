
export function exportGridPng(containerId: string, fileName = "captura_bigbang.png") {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  const canvases = Array.from(cont.querySelectorAll("canvas")) as HTMLCanvasElement[];
  if (canvases.length === 0) return;
  // Compute grid size from DOM
  const cols = getComputedStyle(cont).gridTemplateColumns.split(" ").length || 1;
  const rows = Math.ceil(canvases.length / cols);
  const cw = canvases[0].width, ch = canvases[0].height;
  const out = document.createElement("canvas");
  out.width = cw * cols; out.height = ch * rows;
  const octx = out.getContext("2d")!;
  canvases.forEach((c, i) => {
    const r = Math.floor(i/cols), col = i % cols;
    octx.drawImage(c, col*cw, r*ch);
  });
  const url = out.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url; a.download = fileName; a.click();
}

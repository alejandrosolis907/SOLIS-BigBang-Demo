import { RNG, makePhi, tick, drawToCanvas, snapshot, drawSeries } from "./engine.js";

const $ = (sel)=> document.querySelector(sel);
const seedEl = $("#seed");
const gridEl = $("#grid");
const speedEl = $("#speed");
const presetEl = $("#preset");
const muEl = $("#mu");
const kpiEvents = $("#kpiEvents");
const kpiRes = $("#kpiRes");
const kpiT = $("#kpiT");
const kpiFrames = $("#kpiFrames");
const bufferBar = $("#bufferBar");
const c1 = $("#c1"), c2 = $("#c2"), c3 = $("#c3");
const chart1=$("#chart1"), chart2=$("#chart2"), chart3=$("#chart3");

const kernelGrid = $("#kernelGrid");
const kernelNormalize = $("#kernelNormalize");
const kernelSharpen = $("#kernelSharpen");
const kernelSmooth = $("#kernelSmooth");

const MAX_FRAMES = 240; // timeline buffer
let replay = false;
let framePtr = 0;

// Kernel editor state (3x3)
let customKernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]; // sharpen default
function renderKernelEditor(){
  kernelGrid.innerHTML = "";
  customKernel.forEach((v,i)=>{
    const inp = document.createElement("input");
    inp.type = "number"; inp.step = "0.01"; inp.value = v.toFixed(2);
    inp.addEventListener("input", ()=>{
      const val = parseFloat(inp.value);
      if(!Number.isNaN(val)) customKernel[i] = val;
      if(presetEl.value==="custom") applyGlobalParamChange(); // live
    });
    kernelGrid.appendChild(inp);
  });
}
renderKernelEditor();

kernelNormalize.addEventListener("click", ()=>{
  const sum = customKernel.reduce((a,b)=> a+b, 0) || 1;
  customKernel = customKernel.map(x=> x/sum);
  renderKernelEditor();
  if(presetEl.value==="custom") applyGlobalParamChange();
});
kernelSharpen.addEventListener("click", ()=>{
  customKernel = [0,-1,0,-1,5,-1,0,-1,0];
  renderKernelEditor();
  if(presetEl.value==="custom") applyGlobalParamChange();
});
kernelSmooth.addEventListener("click", ()=>{
  customKernel = [0.07,0.12,0.07,0.12,0.26,0.12,0.07,0.12,0.07];
  renderKernelEditor();
  if(presetEl.value==="custom") applyGlobalParamChange();
});

function makeState({seed, grid, preset, mu}){
  return {
    seed, grid, preset,
    epsilon: 1.4,
    rng: new RNG(seed ^ 0x9e3779b9),
    phi: makePhi(seed, grid),
    shaped: new Float32Array(grid*grid),
    events: 0,
    sparks: [],
    drift: 0.02,
    mu: mu ?? 0,
    customKernel: customKernel.slice(),
    // Timeline buffers
    timeline: [], // array of snapshots
    resSeries: [],
    evSeries: []
  };
}

let params = {
  seed: Number(seedEl.value),
  grid: Number(gridEl.value),
  preset: presetEl.value,
  speed: Number(speedEl.value),
  mu: Number(muEl?.value ?? 0)
};

let running = true;
let states = [
  makeState(params),
  makeState({...params, seed: params.seed+101}),
  makeState({...params, seed: params.seed+202})
];

function reinitAll(){
  states = [
    makeState(params),
    makeState({...params, seed: params.seed+101}),
    makeState({...params, seed: params.seed+202})
  ];
  kpiEvents.textContent = "0";
  kpiFrames.textContent = "0";
  bufferBar.style.width = "0%";
  framePtr = 0;
}

function applyGlobalParamChange(){
  params = {
    seed: Number(seedEl.value),
    grid: Number(gridEl.value),
    preset: presetEl.value,
    speed: Number(speedEl.value),
    mu: Number(muEl?.value ?? 0)
  };
  for(let i=0;i<states.length;i++){
    const keepE = states[i].events;
    const keepRes = states[i].resSeries.slice();
    const keepEv = states[i].evSeries.slice();
    states[i] = makeState({...params, seed: params.seed + i*101});
    states[i].events = keepE;
    states[i].resSeries = keepRes;
    states[i].evSeries = keepEv;
    states[i].customKernel = customKernel.slice();
  }
  kpiT.textContent = params.speed.toFixed(2)+"x";
}

seedEl.addEventListener("input", applyGlobalParamChange);
gridEl.addEventListener("input", applyGlobalParamChange);
presetEl.addEventListener("change", applyGlobalParamChange);
speedEl.addEventListener("input", applyGlobalParamChange);
if(muEl) muEl.addEventListener("input", applyGlobalParamChange);

$("#startAll").addEventListener("click", ()=> running=true);
$("#pauseAll").addEventListener("click", ()=> running=false);
$("#resetAll").addEventListener("click", ()=> { reinitAll(); });
$("#toggleReplay").addEventListener("click", ()=> { replay = !replay; });
$("#exportCSV").addEventListener("click", exportCSV);

function logFrame(){
  // record per camera
  for(const s of states){
    s.timeline.push(snapshot(s));
    s.resSeries.push(s.lastRes||0);
    s.evSeries.push(s.events||0);
    if(s.timeline.length > MAX_FRAMES){ s.timeline.shift(); s.resSeries.shift(); s.evSeries.shift(); }
  }
  const len = states[0].timeline.length;
  kpiFrames.textContent = String(len);
  bufferBar.style.width = Math.floor((len/MAX_FRAMES)*100)+"%";
}

function drawCharts(){
  drawSeries(chart1, states[0].resSeries);
  drawSeries(chart2, states[1].resSeries);
  drawSeries(chart3, states[2].resSeries);
}

function exportCSV(){
  // time, res1,res2,res3, ev1,ev2,ev3, evTotal
  const L = Math.max(states[0].resSeries.length, states[1].resSeries.length, states[2].resSeries.length);
  let lines = ["time,res1,res2,res3,ev1,ev2,ev3,evTotal"];
  for(let i=0;i<L;i++){
    const r1 = states[0].resSeries[i] ?? "";
    const r2 = states[1].resSeries[i] ?? "";
    const r3 = states[2].resSeries[i] ?? "";
    const e1 = states[0].evSeries[i] ?? "";
    const e2 = states[1].evSeries[i] ?? "";
    const e3 = states[2].evSeries[i] ?? "";
    const et = (Number(e1)||0)+(Number(e2)||0)+(Number(e3)||0);
    lines.push([i,r1,r2,r3,e1,e2,e3,et].join(","));
  }
  const blob = new Blob([lines.join("\\n")], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "bigbang_plus_log.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

let last = performance.now();
function loop(t){
  const dt = Math.min(0.05, (t - last)/1000);
  last = t;

  if(!replay){
    if(running){
      const stepScale = params.speed;
      for(const s of states){
        const steps = Math.max(1, Math.floor(2*stepScale));
        for(let i=0;i<steps;i++){ tick(s); }
      }
    }
    // after state advance, capture a frame
    logFrame();
    // draw current state
    drawToCanvas(states[0], c1);
    drawToCanvas(states[1], c2);
    drawToCanvas(states[2], c3);
  } else {
    // Replay timeline (loops over buffer)
    const len = states[0].timeline.length;
    if(len>0){
      framePtr = (framePtr+1) % len;
      for(let i=0;i<states.length;i++){
        const snap = states[i].timeline[framePtr];
        // draw shaped snapshot directly
        const tmp = { ...states[i], shaped: snap.shaped };
        drawToCanvas(tmp, [c1,c2,c3][i]);
      }
    }
  }
  // KPIs
  const ev = states.reduce((a,s)=> a+s.events, 0);
  const resAvg = states.reduce((a,s)=> a+(s.lastRes||0), 0)/states.length;
  kpiEvents.textContent = String(ev);
  kpiRes.textContent = (resAvg||0).toFixed(2);

  drawCharts();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Resize canvases to device pixel ratio for clarity
for(const canvas of [c1,c2,c3,chart1,chart2,chart3]){
  const ratio = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  canvas.width = Math.floor(cssW*ratio);
  canvas.height = Math.floor(cssH*ratio);
}

import { computeAreaLaw } from "./metrics.ts";
import {
  captureSample,
  trainDecoder,
  evaluateReconstruction,
} from "./reconstruction.ts";

// BigBang_PLUS engine — maps UI concepts to SOLIS axioms
// Ω: not modeled
// Φ: stochastic potential field derived from seed
// 𝓛(x): lattice/rule-set shaping Φ into R
// 𝓣: update cadence
// ℜ: resonance selector (coherence metric thresholding)
// ε: discrete events when resonance crosses threshold
// R: rendered canvas state
// 𝓡ₐ: feedback: R nudges 𝓛 over time

// Axioma XI — coeficiente de proporcionalidad
// Ω se modela como una constante absoluta en el motor.
export const OMEGA = 1;

// Axioma XII — Teorema de Contención Dimensional
// metaSpace registra las dimensiones de Φ y Ω utilizadas por el motor.
export const metaSpace = {
  dimPhi: 2,
  dimOmega: 3,
};

export class RNG {
  constructor(seed=1234){
    this.s = seed >>> 0;
  }
  next(){
    // xorshift32
    let x = this.s;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.s = x >>> 0;
    return (this.s / 0xFFFFFFFF);
  }
}

export function makePhi(seed, grid){
  const rng = new RNG(seed);
  const phi = new Float32Array(grid*grid);
  for(let i=0;i<phi.length;i++){ phi[i] = rng.next(); }
  return phi;
}

function applyKernel(phi, grid, kernel){
  const out = new Float32Array(phi.length);
  const idx = (x,y)=> (y*grid + x);
  for(let y=0;y<grid;y++){
    for(let x=0;x<grid;x++){
      let acc=0, w=0;
      for(let ky=-1;ky<=1;ky++){
        for(let kx=-1;kx<=1;kx++){
          const xx=(x+kx+grid)%grid, yy=(y+ky+grid)%grid;
          const p = phi[idx(xx,yy)];
          const wi = kernel[(ky+1)*3+(kx+1)];
          acc += p*wi; w += Math.abs(wi);
        }
      }
      out[idx(x,y)] = (w>0)? acc/w : phi[idx(x,y)];
    }
  }
  return out;
}

export const SMOOTH_KERNEL = [
  0.07, 0.12, 0.07,
  0.12, 0.26, 0.12,
  0.07, 0.12, 0.07
];
export const RIGID_KERNEL = [
  0, -1,  0,
  -1, 4, -1,
  0, -1,  0
];

function clamp01(v){
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function blendKernel(mix=0){
  const m = clamp01(mix);
  return SMOOTH_KERNEL.map((s, i) => s * (1 - m) + RIGID_KERNEL[i] * m);
}

function fract(x){
  return x - Math.floor(x);
}

function deterministicNoise(x, y, value){
  // Deterministic pseudo-noise that only depends on the boundary value and coordinates.
  const basis = value * 977.13 + (x + 1) * 12.9898 + (y + 1) * 78.233;
  return fract(Math.sin(basis) * 43758.5453);
}

function propagateBoundaryLattice(state){
  const { grid } = state;
  const total = grid * grid;
  if (!state.lattice || state.lattice.length !== total) {
    state.lattice = new Float32Array(total);
  }
  const lattice = state.lattice;
  lattice.fill(0);
  if (!state._holoVisited || state._holoVisited.length !== total) {
    state._holoVisited = new Uint8Array(total);
  } else {
    state._holoVisited.fill(0);
  }
  const visited = state._holoVisited;
  const queue = [];
  const idx = (x, y) => y * grid + x;
  const depthLimit = Math.max(0, Math.floor(state.boundaryDepth ?? grid));
  const boundaryNoise = state.boundaryNoise ?? 0;
  const kernel = blendKernel(state.boundaryKernelMix ?? 0);

  let boundarySum = 0;
  let boundaryCount = 0;

  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      if (x === 0 || y === 0 || x === grid - 1 || y === grid - 1) {
        const id = idx(x, y);
        const phiVal = clamp01(state.phi[id]);
        const noise = boundaryNoise ? boundaryNoise * (deterministicNoise(x, y, phiVal) - 0.5) : 0;
        const value = clamp01(phiVal + noise);
        lattice[id] = value;
        visited[id] = 1;
        queue.push({ x, y, depth: 0 });
        boundarySum += value;
        boundaryCount++;
      }
    }
  }

  const boundaryAvg = boundaryCount ? boundarySum / boundaryCount : 0;
  const neighbours = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];

  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    const { x, y, depth } = current;
    if (depth >= depthLimit) continue;
    for (const [dx, dy] of neighbours) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= grid || ny < 0 || ny >= grid) continue;
      const nid = idx(nx, ny);
      if (visited[nid]) continue;
      let acc = 0;
      let weight = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = nx + kx;
          const py = ny + ky;
          if (px < 0 || px >= grid || py < 0 || py >= grid) continue;
          const pid = idx(px, py);
          if (!visited[pid]) continue;
          const w = kernel[(ky + 1) * 3 + (kx + 1)];
          if (w === 0) continue;
          acc += lattice[pid] * w;
          weight += Math.abs(w);
        }
      }
      const source = lattice[idx(x, y)];
      const value = weight > 0 ? clamp01(acc / weight) : source;
      lattice[nid] = value;
      visited[nid] = 1;
      queue.push({ x: nx, y: ny, depth: depth + 1 });
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const id = idx(x, y);
        if (visited[id]) continue;
        let acc = 0;
        let weight = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = x + kx;
            const py = y + ky;
            if (px < 0 || px >= grid || py < 0 || py >= grid) continue;
            const pid = idx(px, py);
            if (!visited[pid]) continue;
            const w = kernel[(ky + 1) * 3 + (kx + 1)];
            if (w === 0) continue;
            acc += lattice[pid] * w;
            weight += Math.abs(w);
          }
        }
        if (weight > 0) {
          lattice[id] = clamp01(acc / weight);
          visited[id] = 1;
          changed = true;
        }
      }
    }
  }

  for (let i = 0; i < lattice.length; i++) {
    if (!visited[i]) {
      lattice[i] = boundaryAvg;
    }
  }

  let sum = 0;
  for (let i = 0; i < lattice.length; i++) sum += lattice[i];
  state.holographicBulk = lattice.length ? sum / lattice.length : 0;

  return lattice;
}

const DEFAULT_RECON_STATE = () => ({
  samples: [],
  lastSample: null,
  model: null,
  pendingFreeze: false,
  pendingTrain: null,
  coverage: 1,
  mode: "contiguous",
  offset: 0,
  metrics: null,
  maskedBoundary: null,
  predicted: null,
  mask: null,
  status: "idle",
  recalcPending: false,
});

function ensureReconstructionState(state){
  if (!state.reconstruction) {
    state.reconstruction = DEFAULT_RECON_STATE();
  }
  return state.reconstruction;
}

export function applyLattice(phi, grid, preset, customKernel, mix=0){
  // blend smooth/rigid kernels according to mix (𝓡ₐ feedback)
  const blended = SMOOTH_KERNEL.map((s,i)=> s*(1-mix) + RIGID_KERNEL[i]*mix);
  let kernel = blended;
  if(preset==="rigid") kernel = RIGID_KERNEL;
  if(preset==="smooth") kernel = SMOOTH_KERNEL;
  if(preset==="custom" && customKernel?.length===9) kernel = customKernel;
  let shaped = applyKernel(phi, grid, kernel);
  if(preset==="entropy"){
    // add gentle drift in entropy preset
    for(let i=0;i<shaped.length;i++){
      shaped[i] = 0.85*shaped[i] + 0.15*Math.random();
    }
  }
  return shaped;
}

// ℜ: measure affinity between φ and 𝓛 with temporal context 𝓣
function cosineSim01(a,b){
  let dot=0,na=0,nb=0;
  const n=Math.min(a.length,b.length);
  for(let i=0;i<n;i++){
    const x=a[i], y=b[i];
    dot+=x*y; na+=x*x; nb+=y*y;
  }
  if(na===0||nb===0) return 0;
  const raw=dot/Math.sqrt(na*nb); // -1..1
  return (raw+1)/2; // 0..1
}

export function resonance(phi, shaped, context=0){
  const sim = cosineSim01(phi, shaped);
  // map context (timeField) to 0..1 window via sinusoidal cycle
  const t = 0.5 + 0.5*Math.sin(context*0.05);
  const res = sim * t;
  return {sim, t, res};
}

export function tick(state){
  const {grid, preset, epsilon, rng, drift, mu = 0, customKernel} = state;
  const ms = state.metaSpace || metaSpace;
  if(ms.dimOmega < ms.dimPhi + 1){
    console.warn(`Axioma XII violado: dimΩ (${ms.dimOmega}) < dimΦ + 1 (${ms.dimPhi + 1})`);
  }
  const recon = ensureReconstructionState(state);
  // remember original preset so feedback can modify and restore
  state.basePreset = state.basePreset ?? preset;
  for(let i=0;i<state.phi.length;i++){
    state.phi[i] = (1-drift)*state.phi[i] + drift*rng.next();
    // ontological friction μ attenuates Φ
    state.phi[i] *= (1 - mu);
  }
  // 𝓡ₐ: decay lattice mix and apply to kernel selection
  state.kernelMix = (state.kernelMix ?? 0) * 0.97;

  if (state.holographicMode) {
    const lattice = propagateBoundaryLattice(state);
    const holoKernel = blendKernel(state.boundaryKernelMix ?? 0);
    state.shaped = applyKernel(lattice, grid, holoKernel);
    if (recon.pendingFreeze) {
      if (lattice && lattice.length === grid * grid) {
        const sample = captureSample(lattice, grid);
        recon.samples.push(sample);
        if (recon.samples.length > 128) {
          recon.samples.shift();
        }
        recon.lastSample = sample;
        recon.status = `Muestra holográfica capturada (N=${recon.samples.length})`;
        recon.recalcPending = true;
      } else {
        recon.status = "No se pudo capturar el bulk holográfico actual";
      }
      recon.pendingFreeze = false;
    }
  } else {
    state.shaped = applyLattice(state.phi, grid, preset, customKernel, state.kernelMix);
    if (recon.pendingFreeze) {
      recon.status = "Activa el modo holográfico para congelar el bulk";
      recon.pendingFreeze = false;
    }
  }
  if(mu>0){
    for(let i=0;i<state.shaped.length;i++){
      state.shaped[i] *= (1 - mu);
    }
  }

  if (state.shaped && state.shaped.length === grid * grid) {
    state.areaLaw = computeAreaLaw(state.shaped, grid);
  } else {
    state.areaLaw = state.areaLaw ?? null;
  }

  if (recon.pendingTrain) {
    const boundarySize = grid * 4 - 4;
    if (boundarySize <= 0) {
      recon.status = "La grilla es demasiado pequeña para entrenar un decodificador";
      recon.model = null;
      recon.metrics = null;
      recon.maskedBoundary = null;
      recon.predicted = null;
      recon.mask = null;
      recon.pendingTrain = null;
    } else {
      const candidates = recon.samples.filter(sample => sample.boundary.length === boundarySize);
      if (candidates.length === 0) {
        recon.status = "No hay muestras compatibles con la grilla actual";
        recon.model = null;
        recon.metrics = null;
        recon.maskedBoundary = null;
        recon.predicted = null;
        recon.mask = null;
      } else {
        try {
          recon.model = trainDecoder(candidates, recon.pendingTrain);
          recon.status = `Decodificador ${recon.model.type} entrenado (${candidates.length} muestras)`;
          recon.recalcPending = true;
        } catch (err) {
          recon.status = `Error al entrenar: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
      recon.pendingTrain = null;
    }
  }

  if (recon.model) {
    const targetSample = (() => {
      const expected = recon.model.inputSize;
      for (let i = recon.samples.length - 1; i >= 0; i--) {
        const sample = recon.samples[i];
        if (sample.boundary.length === expected) {
          return sample;
        }
      }
      return null;
    })();
    if (targetSample) {
      recon.lastSample = targetSample;
      if (recon.recalcPending || !recon.metrics) {
        try {
          const result = evaluateReconstruction(targetSample, recon.model, {
            coverage: recon.coverage,
            mode: recon.mode,
            offset: recon.offset,
          });
          recon.metrics = result.metrics;
          recon.maskedBoundary = result.maskedBoundary;
          recon.predicted = result.predicted;
          recon.mask = result.mask;
          recon.recalcPending = false;
        } catch (err) {
          recon.status = `Error al evaluar: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    } else {
      recon.metrics = null;
      recon.maskedBoundary = null;
      recon.predicted = null;
      recon.mask = null;
    }
  }
  // Axioma XI: R como cociente Ω/(Φ∘𝓛)
  let phiL = 0;
  for(let i=0;i<state.shaped.length;i++){ phiL += state.shaped[i]; }
  phiL /= state.shaped.length;
  state.realityRatio = phiL !== 0 ? OMEGA / phiL : Infinity;
  // 𝓣: derivative of R with respect to lattice variation
  // clampeamos Δ𝓛 con epsilonL para evitar escalada cuando Δ𝓛≈0 (Axioma IV)
  if(state.prevShaped){
    let diffR=0;
    for(let i=0;i<state.shaped.length;i++){
      diffR += Math.abs(state.shaped[i]-state.prevShaped[i]);
    }
    diffR /= state.shaped.length;
    let diffL;
    if (state.holographicMode) {
      diffL = Math.abs((state.boundaryKernelMix ?? 0) - (state.prevBoundaryKernelMix ?? state.boundaryKernelMix ?? 0));
      state.prevBoundaryKernelMix = state.boundaryKernelMix ?? 0;
    } else {
      diffL = Math.abs((state.kernelMix ?? 0) - (state.prevKernelMix ?? state.kernelMix));
      state.prevKernelMix = state.kernelMix;
    }
    const epsilonL = 1e-6;
    state.timeField = diffR / Math.max(diffL, epsilonL);
  } else {
    state.timeField = 0;
  }
  state.prevShaped = Float32Array.from(state.shaped);
  const stats = resonance(state.phi, state.shaped, state.timeField);
  state.lastRes = stats.res;
  const effectiveEps = epsilon * (1 + state.timeField);
  if(stats.res >= effectiveEps){
    state.events++;
    state.kernelMix = Math.min(1, (state.kernelMix ?? 0) + 0.1);
    const x = Math.floor(rng.next()*grid);
    const y = Math.floor(rng.next()*grid);
    state.sparks.push({x,y,t:1.0});
  }
  state.sparks = state.sparks.map(s=> ({...s, t: Math.max(0, s.t-0.06)})).filter(s=>s.t>0);

  // 𝓡ₐ: adjust lattice based on spark distribution and event history
  if(state.sparks.length){
    let left=0,right=0,top=0,bottom=0;
    for(const s of state.sparks){
      if(s.x < grid/2) left++; else right++;
      if(s.y < grid/2) top++; else bottom++;
    }
    const biasX = (right - left)/state.sparks.length;
    const biasY = (bottom - top)/state.sparks.length;
    const scale = Math.min(0.2, state.events/100) * (1 + state.timeField);
    const dynamic = Array.from(SMOOTH_KERNEL);
    dynamic[3] += biasX * scale;
    dynamic[5] -= biasX * scale;
    dynamic[1] += biasY * scale;
    dynamic[7] -= biasY * scale;
    state.customKernel = dynamic;
    state.preset = "custom";
  } else {
    state.preset = state.basePreset;
  }
}

export function drawToCanvas(state, canvas){
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  const {grid} = state;
  const cw = w/grid, ch = h/grid;

  ctx.fillStyle = "#05080c";
  ctx.fillRect(0,0,w,h);

  for(let y=0;y<grid;y++){
    for(let x=0;x<grid;x++){
      const v = state.shaped[y*grid+x];
      const lum = Math.max(0, Math.min(255, Math.floor(v*255)));
      ctx.fillStyle = `rgb(${lum},${Math.floor(lum*0.8)},${Math.floor(180+0.3*lum)})`;
      ctx.fillRect(x*cw, y*ch, cw+1, ch+1);
    }
  }
  for(const s of state.sparks){
    const cx = (s.x+0.5)*cw, cy=(s.y+0.5)*ch;
    const r = 6*s.t;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(57,192,186,${0.7*s.t})`;
    ctx.fill();
  }
}

// Compact snapshot for timeline (store shaped only to keep memory light)
export function snapshot(state){
  return {
    shaped: Float32Array.from(state.shaped),
    res: state.lastRes,
    events: state.events,
    timeField: state.timeField
  };
}

export function drawSeries(canvas, series, color="rgba(57,192,186,1)"){
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = "#0a0f17";
  ctx.fillRect(0,0,w,h);
  if(series.length<2) return;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = (max-min)||1;
  ctx.beginPath();
  for(let i=0;i<series.length;i++){
    const x = i/(series.length-1)*w;
    const y = h - ((series[i]-min)/range)*h;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function requestHolographicFreeze(state){
  const recon = ensureReconstructionState(state);
  recon.pendingFreeze = true;
  return recon;
}

export function clearReconstruction(state){
  const recon = ensureReconstructionState(state);
  recon.samples = [];
  recon.lastSample = null;
  recon.model = null;
  recon.metrics = null;
  recon.maskedBoundary = null;
  recon.predicted = null;
  recon.mask = null;
  recon.status = "Reconstrucción reiniciada";
  recon.recalcPending = false;
  return recon;
}

export function trainReconstructionModel(state, options={}){
  const recon = ensureReconstructionState(state);
  recon.pendingTrain = { ...options };
  return recon;
}

export function setReconstructionCoverage(state, coverage, mode, offset){
  const recon = ensureReconstructionState(state);
  recon.coverage = Math.max(0, Math.min(1, coverage ?? recon.coverage));
  if (mode) recon.mode = mode;
  if (typeof offset === "number") {
    recon.offset = Math.max(0, Math.min(1, offset));
  }
  recon.recalcPending = true;
  return recon.coverage;
}

export function getReconstructionState(state){
  return ensureReconstructionState(state);
}

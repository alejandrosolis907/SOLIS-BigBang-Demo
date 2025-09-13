// BigBang_PLUS engine — maps UI concepts to SOLIS axioms
// Ω: not modeled
// Φ: stochastic potential field derived from seed
// 𝓛(x): lattice/rule-set shaping Φ into R
// 𝓣: update cadence
// ℜ: resonance selector (coherence metric thresholding)
// ε: discrete events when resonance crosses threshold
// R: rendered canvas state
// 𝓡ₐ: feedback: R nudges 𝓛 over time

import { cosineSim01 } from "./lib/resonance";

const SMOOTH_KERNEL = [
  0.07, 0.12, 0.07,
  0.12, 0.26, 0.12,
  0.07, 0.12, 0.07
];

const RIGID_KERNEL = [
  0, -1,  0,
 -1, 4, -1,
  0, -1,  0
];

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

export function applyLattice(phi, grid, preset, customKernel){
  let kernel = SMOOTH_KERNEL;
  if(preset==="rigid") kernel = RIGID_KERNEL;
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

export function resonance(phi, shaped, t=0, tField=0){
  const sim = cosineSim01(phi, shaped);
  const tWeight = 0.5 + 0.5*Math.sin(t*0.1);
  const res = sim * tWeight * (1 + tField);
  return { sim, tWeight, tField, res };
}

export function tick(state){
  const {grid, preset, epsilon, rng, drift, customKernel, friction = 0} = state;
  state.time = (state.time ?? 0) + 1;
  for(let i=0;i<state.phi.length;i++){
    state.phi[i] = (1-drift)*state.phi[i] + drift*rng.next();
  }
  state.shaped = applyLattice(state.phi, grid, preset, customKernel);
  if(friction>0){
    const damp = 1 - Math.min(Math.max(friction,0),1);
    for(let i=0;i<state.shaped.length;i++){
      state.shaped[i] *= damp;
    }
  }

  const prevMix = state.prevKernelMix ?? (state.kernelMix ?? 0);
  const prevShaped = state.prevShaped ?? state.shaped;

  const stats0 = resonance(state.phi, state.shaped, state.time, state.timeField ?? 0);
  let triggered = false;
  if(stats0.res >= epsilon){
    state.events++;
    triggered = true;
    const x = Math.floor(rng.next()*grid);
    const y = Math.floor(rng.next()*grid);
    state.sparks.push({x,y,t:1.0});
  }
  state.sparks = state.sparks.map(s=> ({...s, t: Math.max(0, s.t-0.06)})).filter(s=>s.t>0);

  // 𝓡ₐ feedback: adjust lattice based on recent events
  state.kernelMix = (state.kernelMix ?? 0) * 0.99; // decay
  if(triggered) state.kernelMix = Math.min(1, state.kernelMix + 0.05);

  if(!state.baseKernel){
    // capture starting lattice as baseline
    if(customKernel?.length === 9) state.baseKernel = Array.from(customKernel);
    else state.baseKernel = SMOOTH_KERNEL.slice();
  }

  if(state.preset !== "custom"){
    state.preset = "custom";
    if(!state.customKernel || state.customKernel.length !== 9){
      state.customKernel = state.baseKernel.slice();
    }
  }

  const mix = state.kernelMix;
  for(let i=0;i<9;i++){
    state.customKernel[i] = state.baseKernel[i]*(1-mix) + RIGID_KERNEL[i]*mix;
  }

  // recompute shaped with updated lattice and estimate 𝓣
  const shapedNew = applyLattice(state.phi, grid, "custom", state.customKernel);
  if(friction>0){
    const damp = 1 - Math.min(Math.max(friction,0),1);
    for(let i=0;i<shapedNew.length;i++){
      shapedNew[i] *= damp;
    }
  }
  let deltaR = 0;
  for(let i=0;i<shapedNew.length;i++){
    deltaR += Math.abs(shapedNew[i] - prevShaped[i]);
  }
  deltaR /= shapedNew.length;
  const deltaL = Math.abs(state.kernelMix - prevMix);
  state.timeField = deltaL > 1e-6 ? deltaR / deltaL : 0;
  state.shaped = shapedNew;
  state.prevShaped = Float32Array.from(shapedNew);
  state.prevKernelMix = state.kernelMix;

  const stats = resonance(state.phi, state.shaped, state.time, state.timeField);
  state.lastRes = stats.res;
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
    tField: state.timeField
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

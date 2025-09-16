export type BoundarySample = {
  boundary: Float32Array;
  bulk: Float32Array;
  grid: number;
};

export type TrainOptions = {
  type?: "linear" | "mlp";
  includeBias?: boolean;
  ridge?: number;
  hiddenSize?: number;
  epochs?: number;
  learningRate?: number;
  l2?: number;
};

export type MaskOptions = {
  coverage?: number;
  mode?: "contiguous" | "alternate";
  offset?: number;
};

type LinearModel = {
  type: "linear";
  inputSize: number;
  outputSize: number;
  includeBias: boolean;
  weights: Float64Array; // stored column-major: i * output + j
};

type MLPModel = {
  type: "mlp";
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
  includeBias: boolean;
  w1: Float64Array; // hidden x input
  b1: Float64Array; // hidden
  w2: Float64Array; // output x hidden
  b2: Float64Array; // output
  activation: "relu";
};

export type ReconstructionModel = LinearModel | MLPModel;

export type ReconstructionMetrics = {
  mse: number;
  mseInterior: number;
  psnr: number;
  psnrInterior: number;
};

export type EvaluationResult = {
  metrics: ReconstructionMetrics;
  predicted: Float32Array;
  maskedBoundary: Float32Array;
  mask: Uint8Array;
};

const EPS = 1e-9;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function captureSample(field: ArrayLike<number>, grid: number): BoundarySample {
  assert(grid > 1, "grid must be greater than 1");
  const total = grid * grid;
  assert(field.length === total, "field length does not match grid size");
  const boundary = new Float32Array(grid * 4 - 4);
  let ptr = 0;
  // top row
  for (let x = 0; x < grid; x++) {
    boundary[ptr++] = Number(field[x]);
  }
  // right column (excluding corners)
  for (let y = 1; y < grid - 1; y++) {
    boundary[ptr++] = Number(field[y * grid + (grid - 1)]);
  }
  // bottom row (right to left)
  for (let x = grid - 1; x >= 0; x--) {
    boundary[ptr++] = Number(field[(grid - 1) * grid + x]);
  }
  // left column (excluding corners, bottom to top)
  for (let y = grid - 2; y >= 1; y--) {
    boundary[ptr++] = Number(field[y * grid]);
  }
  const bulk = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    bulk[i] = Number(field[i]);
  }
  return { boundary, bulk, grid };
}

function prepareInputVector(boundary: ArrayLike<number>, includeBias: boolean): Float64Array {
  const len = boundary.length;
  const out = new Float64Array(len + (includeBias ? 1 : 0));
  for (let i = 0; i < len; i++) {
    out[i] = Number(boundary[i]);
  }
  if (includeBias) {
    out[len] = 1;
  }
  return out;
}

function trainLinearModel(samples: BoundarySample[], options: Required<Pick<TrainOptions, "includeBias" | "ridge" | "l2">>): LinearModel {
  const { includeBias, ridge, l2 } = options;
  assert(samples.length > 0, "no samples provided");
  const inputBase = samples[0].boundary.length;
  const outputSize = samples[0].bulk.length;
  const augmentedSize = inputBase + (includeBias ? 1 : 0);
  const xtx = new Float64Array(augmentedSize * augmentedSize);
  const xty = new Float64Array(augmentedSize * outputSize);

  for (const sample of samples) {
    assert(sample.boundary.length === inputBase, "inconsistent boundary length");
    assert(sample.bulk.length === outputSize, "inconsistent bulk length");
    const x = prepareInputVector(sample.boundary, includeBias);
    const y = sample.bulk;
    for (let i = 0; i < augmentedSize; i++) {
      const xi = x[i];
      for (let j = 0; j < augmentedSize; j++) {
        xtx[i * augmentedSize + j] += xi * x[j];
      }
      for (let k = 0; k < outputSize; k++) {
        xty[i * outputSize + k] += xi * y[k];
      }
    }
  }

  const matrix = xtx.slice();
  const diagRegularizer = ridge + l2;
  for (let i = 0; i < augmentedSize; i++) {
    matrix[i * augmentedSize + i] += diagRegularizer;
  }

  const L = cholesky(matrix, augmentedSize);
  const weights = new Float64Array(augmentedSize * outputSize);
  const column = new Float64Array(augmentedSize);
  for (let k = 0; k < outputSize; k++) {
    for (let i = 0; i < augmentedSize; i++) {
      column[i] = xty[i * outputSize + k];
    }
    const solved = choleskySolve(L, column, augmentedSize);
    for (let i = 0; i < augmentedSize; i++) {
      weights[i * outputSize + k] = solved[i];
    }
  }

  return {
    type: "linear",
    inputSize: inputBase,
    outputSize,
    includeBias,
    weights,
  };
}

function randomUniform(scale: number): number {
  return (Math.random() * 2 - 1) * scale;
}

function trainMlpModel(samples: BoundarySample[], options: Required<Pick<TrainOptions, "hiddenSize" | "epochs" | "learningRate">>): MLPModel {
  const { hiddenSize, epochs, learningRate } = options;
  assert(samples.length > 0, "no samples provided");
  const inputSize = samples[0].boundary.length;
  const outputSize = samples[0].bulk.length;
  const w1 = new Float64Array(hiddenSize * inputSize);
  const b1 = new Float64Array(hiddenSize);
  const w2 = new Float64Array(outputSize * hiddenSize);
  const b2 = new Float64Array(outputSize);

  const initScale1 = Math.sqrt(2 / Math.max(1, inputSize));
  const initScale2 = Math.sqrt(2 / Math.max(1, hiddenSize));

  for (let i = 0; i < w1.length; i++) {
    w1[i] = randomUniform(initScale1);
  }
  for (let i = 0; i < hiddenSize; i++) {
    b1[i] = 0;
  }
  for (let i = 0; i < w2.length; i++) {
    w2[i] = randomUniform(initScale2);
  }
  for (let i = 0; i < outputSize; i++) {
    b2[i] = 0;
  }

  const gradW1 = new Float64Array(hiddenSize * inputSize);
  const gradB1 = new Float64Array(hiddenSize);
  const gradW2 = new Float64Array(outputSize * hiddenSize);
  const gradB2 = new Float64Array(outputSize);
  const z1 = new Float64Array(hiddenSize);
  const a1 = new Float64Array(hiddenSize);
  const deltaHidden = new Float64Array(hiddenSize);
  const deltaOutput = new Float64Array(outputSize);

  const inputs = samples.map(sample => {
    assert(sample.boundary.length === inputSize, "inconsistent boundary length");
    assert(sample.bulk.length === outputSize, "inconsistent bulk length");
    const arr = new Float64Array(inputSize);
    for (let i = 0; i < inputSize; i++) {
      arr[i] = sample.boundary[i];
    }
    return arr;
  });

  const targets = samples.map(sample => {
    const arr = new Float64Array(outputSize);
    for (let i = 0; i < outputSize; i++) {
      arr[i] = sample.bulk[i];
    }
    return arr;
  });

  const datasetSize = samples.length;
  const invSize = 1 / datasetSize;

  for (let epoch = 0; epoch < epochs; epoch++) {
    gradW1.fill(0);
    gradB1.fill(0);
    gradW2.fill(0);
    gradB2.fill(0);

    for (let n = 0; n < datasetSize; n++) {
      const x = inputs[n];
      const y = targets[n];

      // forward pass
      for (let h = 0; h < hiddenSize; h++) {
        let sum = b1[h];
        for (let i = 0; i < inputSize; i++) {
          sum += w1[h * inputSize + i] * x[i];
        }
        z1[h] = sum;
        a1[h] = sum > 0 ? sum : 0; // ReLU
      }

      for (let j = 0; j < outputSize; j++) {
        let sum = b2[j];
        for (let h = 0; h < hiddenSize; h++) {
          sum += w2[j * hiddenSize + h] * a1[h];
        }
        deltaOutput[j] = sum - y[j];
      }

      // backward pass
      for (let j = 0; j < outputSize; j++) {
        const grad = deltaOutput[j];
        gradB2[j] += grad;
        for (let h = 0; h < hiddenSize; h++) {
          gradW2[j * hiddenSize + h] += grad * a1[h];
        }
      }

      for (let h = 0; h < hiddenSize; h++) {
        let grad = 0;
        for (let j = 0; j < outputSize; j++) {
          grad += w2[j * hiddenSize + h] * deltaOutput[j];
        }
        grad = z1[h] > 0 ? grad : 0;
        deltaHidden[h] = grad;
        gradB1[h] += grad;
        for (let i = 0; i < inputSize; i++) {
          gradW1[h * inputSize + i] += grad * x[i];
        }
      }
    }

    const step = learningRate * invSize;
    for (let i = 0; i < gradW1.length; i++) {
      w1[i] -= step * gradW1[i];
    }
    for (let i = 0; i < gradB1.length; i++) {
      b1[i] -= step * gradB1[i];
    }
    for (let i = 0; i < gradW2.length; i++) {
      w2[i] -= step * gradW2[i];
    }
    for (let i = 0; i < gradB2.length; i++) {
      b2[i] -= step * gradB2[i];
    }
  }

  return {
    type: "mlp",
    inputSize,
    hiddenSize,
    outputSize,
    includeBias: false,
    w1,
    b1,
    w2,
    b2,
    activation: "relu",
  };
}

export function trainDecoder(samples: BoundarySample[], options: TrainOptions = {}): ReconstructionModel {
  if (!samples.length) {
    throw new Error("No hay muestras suficientes para entrenar el decodificador");
  }
  const type = options.type ?? "linear";
  if (type === "linear") {
    const includeBias = options.includeBias ?? true;
    const ridge = options.ridge ?? 1e-3;
    const l2 = options.l2 ?? 1e-5;
    return trainLinearModel(samples, { includeBias, ridge, l2 });
  }
  const hiddenSize = options.hiddenSize ?? Math.max(8, Math.ceil(samples[0].boundary.length / 2));
  const epochs = options.epochs ?? 200;
  const learningRate = options.learningRate ?? 0.01;
  return trainMlpModel(samples, { hiddenSize, epochs, learningRate });
}

export function runDecoder(model: ReconstructionModel, boundary: ArrayLike<number>): Float32Array {
  if (model.type === "linear") {
    assert(boundary.length === model.inputSize, "boundary length mismatch for linear model");
    const inputVec = prepareInputVector(boundary, model.includeBias);
    const { outputSize, weights } = model;
    const output = new Float32Array(outputSize);
    for (let j = 0; j < outputSize; j++) {
      let sum = 0;
      for (let i = 0; i < inputVec.length; i++) {
        sum += inputVec[i] * weights[i * outputSize + j];
      }
      output[j] = clamp01(sum);
    }
    return output;
  }

  assert(boundary.length === model.inputSize, "boundary length mismatch for MLP model");
  const input = new Float64Array(model.inputSize);
  for (let i = 0; i < model.inputSize; i++) {
    input[i] = boundary[i];
  }
  const hidden = new Float64Array(model.hiddenSize);
  for (let h = 0; h < model.hiddenSize; h++) {
    let sum = model.b1[h];
    for (let i = 0; i < model.inputSize; i++) {
      sum += model.w1[h * model.inputSize + i] * input[i];
    }
    hidden[h] = sum > 0 ? sum : 0;
  }
  const output = new Float32Array(model.outputSize);
  for (let j = 0; j < model.outputSize; j++) {
    let sum = model.b2[j];
    for (let h = 0; h < model.hiddenSize; h++) {
      sum += model.w2[j * model.hiddenSize + h] * hidden[h];
    }
    output[j] = clamp01(sum);
  }
  return output;
}

export function maskBoundary(boundary: ArrayLike<number>, options: MaskOptions = {}): { masked: Float32Array; mask: Uint8Array } {
  const len = boundary.length;
  const masked = new Float32Array(len);
  const mask = new Uint8Array(len);
  if (len === 0) {
    return { masked, mask };
  }
  const coverage = Math.max(0, Math.min(1, options.coverage ?? 1));
  if (coverage >= 0.999) {
    for (let i = 0; i < len; i++) {
      const value = Number(boundary[i]);
      masked[i] = value;
      mask[i] = 1;
    }
    return { masked, mask };
  }

  const mode = options.mode ?? "contiguous";
  const keepCount = Math.max(1, Math.floor(len * coverage));
  if (mode === "alternate") {
    const step = len / keepCount;
    for (let i = 0; i < keepCount; i++) {
      const idx = Math.min(len - 1, Math.round(i * step));
      masked[idx] = Number(boundary[idx]);
      mask[idx] = 1;
    }
    return { masked, mask };
  }

  // contiguous chunk with configurable offset (0..1)
  const offset = Math.max(0, Math.min(1, options.offset ?? 0));
  const start = Math.floor((len - keepCount) * offset);
  const end = start + keepCount;
  for (let i = start; i < end && i < len; i++) {
    masked[i] = Number(boundary[i]);
    mask[i] = 1;
  }
  return { masked, mask };
}

export function computePSNR(mse: number, peak = 1): number {
  if (mse <= EPS) {
    return Infinity;
  }
  return 20 * Math.log10(peak) - 10 * Math.log10(mse);
}

export function computeReconstructionMetrics(sample: BoundarySample, predicted: ArrayLike<number>): ReconstructionMetrics {
  assert(predicted.length === sample.bulk.length, "predicted vector length mismatch");
  const { bulk, grid } = sample;
  const total = bulk.length;
  let mse = 0;
  let mseInterior = 0;
  let interiorCount = 0;
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const idx = y * grid + x;
      const diff = bulk[idx] - Number(predicted[idx]);
      mse += diff * diff;
      const interior = x > 0 && x < grid - 1 && y > 0 && y < grid - 1;
      if (interior) {
        mseInterior += diff * diff;
        interiorCount += 1;
      }
    }
  }
  mse /= total || 1;
  mseInterior = interiorCount > 0 ? mseInterior / interiorCount : mse;
  const psnr = computePSNR(mse);
  const psnrInterior = computePSNR(mseInterior);
  return { mse, mseInterior, psnr, psnrInterior };
}

export function evaluateReconstruction(sample: BoundarySample, model: ReconstructionModel, options: MaskOptions = {}): EvaluationResult {
  const { masked, mask } = maskBoundary(sample.boundary, options);
  const predicted = runDecoder(model, masked);
  const metrics = computeReconstructionMetrics(sample, predicted);
  return { metrics, predicted, maskedBoundary: masked, mask };
}

function cholesky(matrix: Float64Array, size: number): Float64Array {
  const L = new Float64Array(size * size);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = matrix[i * size + j];
      for (let k = 0; k < j; k++) {
        sum -= L[i * size + k] * L[j * size + k];
      }
      if (i === j) {
        if (sum < EPS) {
          sum = EPS;
        }
        L[i * size + j] = Math.sqrt(sum);
      } else {
        L[i * size + j] = sum / L[j * size + j];
      }
    }
  }
  return L;
}

function choleskySolve(L: Float64Array, b: Float64Array, size: number): Float64Array {
  const y = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    let sum = b[i];
    for (let k = 0; k < i; k++) {
      sum -= L[i * size + k] * y[k];
    }
    y[i] = sum / L[i * size + i];
  }
  const x = new Float64Array(size);
  for (let i = size - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < size; k++) {
      sum -= L[k * size + i] * x[k];
    }
    x[i] = sum / L[i * size + i];
  }
  return x;
}


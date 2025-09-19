import {
  DEFAULT_AXIOMS_DOC_URL,
  DEFAULT_EXPERIMENTS_DOC_URL,
  getAxiomsDocUrl,
  getExperimentsDocUrl,
} from "../src/config.js";

type MaybeString = string | null | undefined;

type RuntimeConfigShape = {
  experiments?: MaybeString;
  axioms?: MaybeString;
};

type EnvConfigShape = {
  experiments?: MaybeString;
  axioms?: MaybeString;
};

function setRuntimeConfig(config?: RuntimeConfigShape): void {
  const globalRef = globalThis as any;
  if (!config) {
    delete globalRef.window;
    return;
  }

  const runtime: Record<string, MaybeString> = {};
  if (Object.prototype.hasOwnProperty.call(config, "experiments")) {
    runtime.experimentsDocUrl = config.experiments ?? undefined;
  }
  if (Object.prototype.hasOwnProperty.call(config, "axioms")) {
    runtime.axiomsDocUrl = config.axioms ?? undefined;
  }

  globalRef.window = {
    __BB_RUNTIME_CONFIG__: runtime,
  };
}

function setViteEnv(config?: EnvConfigShape): void {
  const globalRef = globalThis as any;
  if (!config) {
    delete globalRef.__BB_IMPORT_META_ENV__;
    return;
  }

  const env: Record<string, MaybeString> = {};
  if (Object.prototype.hasOwnProperty.call(config, "experiments")) {
    env.VITE_EXPERIMENTS_DOC_URL = config.experiments ?? undefined;
  }
  if (Object.prototype.hasOwnProperty.call(config, "axioms")) {
    env.VITE_AXIOMS_DOC_URL = config.axioms ?? undefined;
  }

  globalRef.__BB_IMPORT_META_ENV__ = env;
}

function resetEnvironment(): void {
  setRuntimeConfig();
  setViteEnv();
}

function runTest(name: string, fn: () => void): void {
  try {
    resetEnvironment();
    fn();
    console.log(`\u2714\ufe0f  ${name}`);
  } catch (error) {
    console.error(`\u274c  ${name}`);
    throw error;
  } finally {
    resetEnvironment();
  }
}

function expectEqual(actual: unknown, expected: unknown, message?: string): void {
  if (actual !== expected) {
    const error = new Error(
      message ?? `Expected ${String(actual)} to strictly equal ${String(expected)}`
    );
    (error as Error & { actual?: unknown }).actual = actual;
    (error as Error & { expected?: unknown }).expected = expected;
    throw error;
  }
}

runTest("experiments doc prefers runtime override", () => {
  setRuntimeConfig({ experiments: "https://runtime.example/docs" });
  setViteEnv({ experiments: "https://vite.example/docs" });
  expectEqual(getExperimentsDocUrl(), "https://runtime.example/docs");
});

runTest("experiments doc falls back to Vite value", () => {
  setRuntimeConfig({ experiments: "" });
  setViteEnv({ experiments: "https://vite.example/docs" });
  expectEqual(getExperimentsDocUrl(), "https://vite.example/docs");
});

runTest("experiments doc returns default when no overrides", () => {
  expectEqual(getExperimentsDocUrl(), DEFAULT_EXPERIMENTS_DOC_URL);
});

runTest("experiments doc ignores invalid runtime values", () => {
  setRuntimeConfig({ experiments: "/relative/path" });
  expectEqual(getExperimentsDocUrl(), DEFAULT_EXPERIMENTS_DOC_URL);
});

runTest("experiments doc ignores invalid Vite values", () => {
  setViteEnv({ experiments: "ftp://example.com/file.pdf" });
  expectEqual(getExperimentsDocUrl(), DEFAULT_EXPERIMENTS_DOC_URL);
});

runTest("axioms doc prefers dedicated runtime override", () => {
  setRuntimeConfig({ axioms: "https://runtime.example/axioms.pdf" });
  expectEqual(getAxiomsDocUrl(), "https://runtime.example/axioms.pdf");
});

runTest("axioms doc reuses experiments runtime override for compatibility", () => {
  setRuntimeConfig({ experiments: "https://runtime.example/shared.pdf" });
  expectEqual(getAxiomsDocUrl(), "https://runtime.example/shared.pdf");
});

runTest("axioms doc prefers dedicated Vite env override", () => {
  setViteEnv({ axioms: "https://vite.example/axioms.pdf" });
  expectEqual(getAxiomsDocUrl(), "https://vite.example/axioms.pdf");
});

runTest("axioms doc falls back to experiments env override", () => {
  setViteEnv({ experiments: "https://vite.example/shared.pdf" });
  expectEqual(getAxiomsDocUrl(), "https://vite.example/shared.pdf");
});

runTest("axioms doc returns default when no overrides", () => {
  expectEqual(getAxiomsDocUrl(), DEFAULT_AXIOMS_DOC_URL);
});

runTest("axioms doc ignores invalid overrides", () => {
  setRuntimeConfig({ axioms: "/relative/path" });
  setViteEnv({ axioms: "mailto:example" });
  expectEqual(getAxiomsDocUrl(), DEFAULT_AXIOMS_DOC_URL);
});

import {
  DEFAULT_EXPERIMENTS_DOC_URL,
  getExperimentsDocUrl,
} from "../src/config.js";

type MaybeString = string | null | undefined;

function setRuntimeUrl(url: MaybeString): void {
  const globalRef = globalThis as any;
  if (url === undefined) {
    delete globalRef.window;
    return;
  }
  globalRef.window = {
    __BB_RUNTIME_CONFIG__: {
      experimentsDocUrl: url ?? undefined,
    },
  };
}

function setViteEnv(url: MaybeString): void {
  const globalRef = globalThis as any;
  if (url === undefined) {
    delete globalRef.__BB_IMPORT_META_ENV__;
    return;
  }
  globalRef.__BB_IMPORT_META_ENV__ = {
    VITE_EXPERIMENTS_DOC_URL: url ?? undefined,
  };
}

function resetEnvironment(): void {
  setRuntimeUrl(undefined);
  setViteEnv(undefined);
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

runTest("prefers runtime override over Vite environment", () => {
  setRuntimeUrl("https://runtime.example/docs");
  setViteEnv("https://vite.example/docs");
  expectEqual(getExperimentsDocUrl(), "https://runtime.example/docs");
});

runTest("falls back to Vite value when runtime is empty", () => {
  setRuntimeUrl("");
  setViteEnv("https://vite.example/docs");
  expectEqual(getExperimentsDocUrl(), "https://vite.example/docs");
});

runTest("falls back to default when neither source provides a value", () => {
  expectEqual(getExperimentsDocUrl(), DEFAULT_EXPERIMENTS_DOC_URL);
});

runTest("ignores relative runtime overrides", () => {
  setRuntimeUrl("/relative/path.pdf");
  expectEqual(getExperimentsDocUrl(), DEFAULT_EXPERIMENTS_DOC_URL);
});

runTest("ignores non-http Vite values", () => {
  setRuntimeUrl(null);
  setViteEnv("ftp://example.com/file.pdf");
  expectEqual(getExperimentsDocUrl(), DEFAULT_EXPERIMENTS_DOC_URL);
});

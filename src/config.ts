export const DEFAULT_EXPERIMENTS_DOC_URL =
  "https://github.com/solis-labs/SOLIS-BigBang-Demo/blob/main/docs/README-Experimentos.md";

export const DEFAULT_AXIOMS_DOC_URL =
  "https://zenodo.org/records/17153982";

type MaybeString = string | null | undefined;

type RuntimeConfig = {
  experimentsDocUrl?: MaybeString;
  axiomsDocUrl?: MaybeString;
};

const EXPERIMENTS_PLACEHOLDER_PATTERN = /^__BB_EXPERIMENTS_DOC_URL__$/;
const AXIOMS_PLACEHOLDER_PATTERN = /^__BB_AXIOMS_DOC_URL__$/;
const HTTP_URL_PATTERN = /^https?:\/\//i;

function normalizeCandidate(
  value: MaybeString,
  placeholderPattern: RegExp
): string {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed || placeholderPattern.test(trimmed)) {
    return "";
  }

  if (!HTTP_URL_PATTERN.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function readRuntimeValue(
  key: keyof RuntimeConfig,
  placeholderPattern: RegExp
): string {
  if (typeof window === "undefined") {
    return "";
  }
  const runtime = window.__BB_RUNTIME_CONFIG__ as RuntimeConfig | undefined;
  if (!runtime) {
    return "";
  }
  return normalizeCandidate(runtime[key] ?? "", placeholderPattern);
}

function readViteEnvValue(
  key: "VITE_EXPERIMENTS_DOC_URL" | "VITE_AXIOMS_DOC_URL",
  placeholderPattern: RegExp
): string {
  const env = (
    (import.meta as ImportMeta & {
      env?: Record<string, unknown>;
    }).env ?? (globalThis as { __BB_IMPORT_META_ENV__?: Record<string, unknown> })
      .__BB_IMPORT_META_ENV__
  );

  return normalizeCandidate((env?.[key] as MaybeString) ?? "", placeholderPattern);
}

export function getExperimentsDocUrl(): string {
  const runtimeValue = readRuntimeValue(
    "experimentsDocUrl",
    EXPERIMENTS_PLACEHOLDER_PATTERN
  );
  if (runtimeValue) {
    return runtimeValue;
  }

  const envValue = readViteEnvValue(
    "VITE_EXPERIMENTS_DOC_URL",
    EXPERIMENTS_PLACEHOLDER_PATTERN
  );
  if (envValue) {
    return envValue;
  }

  return DEFAULT_EXPERIMENTS_DOC_URL;
}

export function getAxiomsDocUrl(): string {
  const runtimeValue = readRuntimeValue("axiomsDocUrl", AXIOMS_PLACEHOLDER_PATTERN);
  if (runtimeValue) {
    return runtimeValue;
  }

  const runtimeFallback = readRuntimeValue(
    "experimentsDocUrl",
    EXPERIMENTS_PLACEHOLDER_PATTERN
  );
  if (runtimeFallback) {
    return runtimeFallback;
  }

  const envValue = readViteEnvValue(
    "VITE_AXIOMS_DOC_URL",
    AXIOMS_PLACEHOLDER_PATTERN
  );
  if (envValue) {
    return envValue;
  }

  const envFallback = readViteEnvValue(
    "VITE_EXPERIMENTS_DOC_URL",
    EXPERIMENTS_PLACEHOLDER_PATTERN
  );
  if (envFallback) {
    return envFallback;
  }

  return DEFAULT_AXIOMS_DOC_URL;
}

declare global {
  interface Window {
    __BB_RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

export {}; // ensure this file is treated as a module

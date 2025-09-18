export const DEFAULT_EXPERIMENTS_DOC_URL =
  "https://zenodo.org/records/17153982";

type MaybeString = string | null | undefined;

const PLACEHOLDER_PATTERN = /^__BB_EXPERIMENTS_DOC_URL__$/;
const HTTP_URL_PATTERN = /^https?:\/\//i;

function normalizeCandidate(value: MaybeString): string {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed)) {
    return "";
  }

  if (!HTTP_URL_PATTERN.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function readRuntimeConfig(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const runtime = window.__BB_RUNTIME_CONFIG__;
  if (!runtime) {
    return "";
  }
  return normalizeCandidate(runtime.experimentsDocUrl ?? "");
}

function readViteEnv(): string {
  const env = (
    (import.meta as ImportMeta & {
      env?: Record<string, unknown>;
    })
  ).env ?? (globalThis as { __BB_IMPORT_META_ENV__?: Record<string, unknown> })
    .__BB_IMPORT_META_ENV__;

  const viteValue = normalizeCandidate(
    (env?.VITE_EXPERIMENTS_DOC_URL as MaybeString) ?? ""
  );
  return viteValue;
}

export function getExperimentsDocUrl(): string {
  const fromRuntime = readRuntimeConfig();
  if (fromRuntime) {
    return fromRuntime;
  }

  const fromVite = readViteEnv();
  if (fromVite) {
    return fromVite;
  }

  return DEFAULT_EXPERIMENTS_DOC_URL;
}

declare global {
  interface Window {
    __BB_RUNTIME_CONFIG__?: {
      experimentsDocUrl?: string | null;
    };
  }
}

export {}; // ensure this file is treated as a module

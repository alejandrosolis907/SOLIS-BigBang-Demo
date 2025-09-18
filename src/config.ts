export const DEFAULT_EXPERIMENTS_DOC_URL =
  "https://github.com/SOLIS-Lab/SOLIS-BigBang-Demo/blob/main/docs/README-Experimentos.md";

type MaybeString = string | null | undefined;

const PLACEHOLDER_PATTERN = /^__BB_EXPERIMENTS_DOC_URL__$/;

function normalizeCandidate(value: MaybeString): string {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed)) {
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
  const viteValue = normalizeCandidate(
    (import.meta.env.VITE_EXPERIMENTS_DOC_URL as MaybeString) ?? ""
  );
  return viteValue;
}

export function getExperimentsDocUrl(): string {
  const fromVite = readViteEnv();
  if (fromVite) {
    return fromVite;
  }

  const fromRuntime = readRuntimeConfig();
  if (fromRuntime) {
    return fromRuntime;
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

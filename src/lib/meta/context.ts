export type MetaLearnerContext = {
  readonly entryId: string | null;
};

type MaybeState = Record<string, unknown> | null | undefined;

const readFromObject = (object: Record<string, unknown> | null | undefined, key: string): string | null => {
  if (!object) {
    return null;
  }
  const value = object[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
};

const resolveFromState = (state: MaybeState): string | null => {
  if (!state) {
    return null;
  }
  const direct = readFromObject(state, "metaLearnerEntryId");
  if (direct) {
    return direct;
  }
  const ui = (state as { ui?: Record<string, unknown> }).ui;
  if (ui) {
    const viaUi = readFromObject(ui, "metaLearnerEntryId");
    if (viaUi) {
      return viaUi;
    }
  }
  return null;
};

const resolveFromWindow = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const context = (window as unknown as {
    __BB_EXPERIMENT_CONTEXT__?: { entryId?: string | null } | null;
  }).__BB_EXPERIMENT_CONTEXT__;
  if (context && typeof context.entryId === "string" && context.entryId.trim()) {
    return context.entryId.trim();
  }
  return null;
};

export const resolveMetaLearnerEntryId = (state: MaybeState): string | null => {
  const viaState = resolveFromState(state);
  if (viaState) {
    return viaState;
  }
  return resolveFromWindow();
};

export const resolveMetaLearnerContext = (state: MaybeState): MetaLearnerContext => ({
  entryId: resolveMetaLearnerEntryId(state),
});


type TermsRequiredListener = (payload: unknown) => void;

const listeners = new Set<TermsRequiredListener>();

export function emitTermsRequired(payload: unknown) {
  for (const listener of listeners) listener(payload);
}

export function subscribeTermsRequired(listener: TermsRequiredListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

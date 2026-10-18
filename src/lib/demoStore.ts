import { useState } from 'react';

/** Temporary in-memory provider retained for disconnected legacy views; it never reads or writes browser storage. */
export function useDemoState<T>(_key: string, seed: T) {
  const [state, setState] = useState<T>(() => Array.isArray(seed) ? [] as T : seed);
  return [state, setState] as const;
}

/** Browser-local demo records are no longer stored, so reset only reloads the current page. */
export function resetDemo() {
  window.location.reload();
}

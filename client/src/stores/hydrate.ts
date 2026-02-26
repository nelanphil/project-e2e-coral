"use client";

import { useEffect } from "react";

/**
 * Hydrate a Zustand store with server data after mount.
 * Use in a client component that receives server-fetched props so the store
 * is populated once and other components can subscribe without prop drilling.
 * Runs only on the client, so no hydration mismatch.
 */
export function useHydrateStore<T>(store: { setState: (state: Partial<T> | ((s: T) => Partial<T>)) => void }, initial: T | null | undefined) {
  useEffect(() => {
    if (initial != null) {
      store.setState(initial as Partial<T>);
    }
  }, [store, initial]);
}

"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A persisted boolean flag backed by localStorage, read via useSyncExternalStore
 * (SSR-safe, no setState-in-effect, syncs across tabs). Returns the current value
 * and a setter that flips it to true permanently.
 */
export function useLocalStorageFlag(key: string): [boolean, () => void] {
    const subscribe = useCallback(
        (cb: () => void) => {
            const evt = `local-flag:${key}`;
            window.addEventListener("storage", cb);
            window.addEventListener(evt, cb);
            return () => {
                window.removeEventListener("storage", cb);
                window.removeEventListener(evt, cb);
            };
        },
        [key],
    );

    const getSnapshot = useCallback(() => {
        try {
            return localStorage.getItem(key) === "true";
        } catch {
            return false;
        }
    }, [key]);

    const value = useSyncExternalStore(subscribe, getSnapshot, () => false);

    const setTrue = useCallback(() => {
        try {
            localStorage.setItem(key, "true");
        } catch {
            /* ignore */
        }
        window.dispatchEvent(new Event(`local-flag:${key}`));
    }, [key]);

    return [value, setTrue];
}

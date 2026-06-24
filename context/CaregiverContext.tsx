"use client";

import {
    createContext,
    useCallback,
    useContext,
    useSyncExternalStore,
    ReactNode,
} from "react";

type CaregiverState = {
    isCaregiver: boolean;
    patientName: string;
    enter: (patientName: string) => void;
    exit: () => void;
};

const CaregiverCtx = createContext<CaregiverState | null>(null);
const KEY = "caregiverMode";
const EVENT = "caregiver-change";

function subscribe(cb: () => void) {
    window.addEventListener("storage", cb);
    window.addEventListener(EVENT, cb);
    return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener(EVENT, cb);
    };
}

// Snapshot is the raw string (a stable primitive), so useSyncExternalStore
// doesn't loop; the object is derived from it during render.
function getSnapshot(): string | null {
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
}

function getServerSnapshot(): string | null {
    return null;
}

function parse(raw: string | null): { patientName: string } | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as { patientName: string };
    } catch {
        return null;
    }
}

export function CaregiverProvider({ children }: { children: ReactNode }) {
    const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const stored = parse(raw);

    const enter = useCallback((patientName: string) => {
        try {
            localStorage.setItem(KEY, JSON.stringify({ patientName }));
        } catch {
            /* ignore */
        }
        window.dispatchEvent(new Event(EVENT));
    }, []);

    const exit = useCallback(() => {
        try {
            localStorage.removeItem(KEY);
        } catch {
            /* ignore */
        }
        window.dispatchEvent(new Event(EVENT));
    }, []);

    return (
        <CaregiverCtx.Provider
            value={{
                isCaregiver: stored !== null,
                patientName: stored?.patientName ?? "",
                enter,
                exit,
            }}
        >
            {children}
        </CaregiverCtx.Provider>
    );
}

export function useCaregiver(): CaregiverState {
    const ctx = useContext(CaregiverCtx);
    if (!ctx)
        throw new Error("useCaregiver must be used within CaregiverProvider");
    return ctx;
}

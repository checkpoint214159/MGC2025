"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, ReactNode } from "react";

/**
 * Whole-app text/zoom scale for low-vision older patients (and their caregivers).
 * Applies `zoom` to the document root so text, spacing, AND tap targets all grow
 * together — better for low vision than text-only scaling. Persisted, SSR-safe.
 */
const KEY = "textScale";
const EVENT = "text-scale-change";
export const TEXT_SCALES = [1, 1.15, 1.3] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

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

function parseScale(raw: string | null): TextScale {
  const n = Number(raw);
  return (TEXT_SCALES as readonly number[]).includes(n) ? (n as TextScale) : 1;
}

type Ctx = { scale: TextScale; setScale: (s: TextScale) => void };
const TextScaleCtx = createContext<Ctx | null>(null);

export function TextScaleProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const scale = parseScale(raw);

  useEffect(() => {
    // `zoom` is the pragmatic way to scale a px-based UI uniformly; modern browsers
    // reflow it properly (unlike transform: scale).
    document.documentElement.style.zoom = String(scale);
    return () => {
      document.documentElement.style.zoom = "";
    };
  }, [scale]);

  const setScale = useCallback((s: TextScale) => {
    try {
      localStorage.setItem(KEY, String(s));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return <TextScaleCtx.Provider value={{ scale, setScale }}>{children}</TextScaleCtx.Provider>;
}

export function useTextScale(): Ctx {
  const ctx = useContext(TextScaleCtx);
  if (!ctx) throw new Error("useTextScale must be used within TextScaleProvider");
  return ctx;
}

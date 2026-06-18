"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type CaregiverState = {
  isCaregiver: boolean;
  patientName: string;
  enter: (patientName: string) => void;
  exit: () => void;
};

const CaregiverCtx = createContext<CaregiverState | null>(null);
const KEY = "caregiverMode";

export function CaregiverProvider({ children }: { children: ReactNode }) {
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [patientName, setPatientName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { patientName: string };
        setIsCaregiver(true);
        setPatientName(parsed.patientName);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const enter = (name: string) => {
    setIsCaregiver(true);
    setPatientName(name);
    try {
      localStorage.setItem(KEY, JSON.stringify({ patientName: name }));
    } catch {
      /* ignore */
    }
  };

  const exit = () => {
    setIsCaregiver(false);
    setPatientName("");
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <CaregiverCtx.Provider value={{ isCaregiver, patientName, enter, exit }}>
      {children}
    </CaregiverCtx.Provider>
  );
}

export function useCaregiver(): CaregiverState {
  const ctx = useContext(CaregiverCtx);
  if (!ctx) throw new Error("useCaregiver must be used within CaregiverProvider");
  return ctx;
}

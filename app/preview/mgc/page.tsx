import { notFound } from "next/navigation";
import { MgcPatientDashboard } from "./MgcPatientDashboard";

/**
 * Dev-only MGC mockup (S4 patient dashboard) — mock data, no DB/gateway.
 * Gated to development (proxy.ts 404s /preview/* in production).
 */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MgcPatientDashboard />;
}

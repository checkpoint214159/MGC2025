import { notFound } from "next/navigation";
import { MgcShell } from "@/components/mgc/MgcShell";
import { MgcHub } from "./MgcHub";

/** Dev-only MGC mockup hub. Gated to development (proxy.ts 404s /preview/* in production). */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <MgcShell>
      <MgcHub />
    </MgcShell>
  );
}

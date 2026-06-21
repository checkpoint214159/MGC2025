import { notFound } from "next/navigation";
import { MgcShell } from "@/components/mgc/MgcShell";
import { MgcPlanGeneration } from "./MgcPlanGeneration";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <MgcShell active="S2">
      <MgcPlanGeneration />
    </MgcShell>
  );
}

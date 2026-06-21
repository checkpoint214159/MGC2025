import { notFound } from "next/navigation";
import { MgcShell } from "@/components/mgc/MgcShell";
import { MgcOnboarding } from "./MgcOnboarding";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <MgcShell active="S1">
      <MgcOnboarding />
    </MgcShell>
  );
}

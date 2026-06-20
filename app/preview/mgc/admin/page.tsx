import { notFound } from "next/navigation";
import { MgcShell } from "@/components/mgc/MgcShell";
import { MgcAdminMonitor } from "./MgcAdminMonitor";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <MgcShell active="S7">
      <MgcAdminMonitor />
    </MgcShell>
  );
}

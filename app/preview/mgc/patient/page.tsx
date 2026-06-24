import { notFound } from "next/navigation";
import { MgcShell } from "@/components/mgc/MgcShell";
import { MgcPatientDashboard } from "../MgcPatientDashboard";

export default function Page() {
    if (process.env.NODE_ENV === "production") notFound();
    return (
        <MgcShell active="S4">
            <MgcPatientDashboard />
        </MgcShell>
    );
}

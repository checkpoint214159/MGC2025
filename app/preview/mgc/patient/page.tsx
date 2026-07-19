import { MgcShell } from "@/components/mgc/MgcShell";
import { MgcPatientDashboard } from "../MgcPatientDashboard";

export default function Page() {
    return (
        <MgcShell active="S4">
            <MgcPatientDashboard />
        </MgcShell>
    );
}

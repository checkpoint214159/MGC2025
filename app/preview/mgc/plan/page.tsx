import { MgcShell } from "@/components/mgc/MgcShell";
import { MgcPlanGeneration } from "./MgcPlanGeneration";

export default function Page() {
    return (
        <MgcShell active="S2">
            <MgcPlanGeneration />
        </MgcShell>
    );
}

import { MgcShell } from "@/components/mgc/MgcShell";
import { MgcOnboarding } from "./MgcOnboarding";

export default function Page() {
    return (
        <MgcShell active="S1">
            <MgcOnboarding />
        </MgcShell>
    );
}

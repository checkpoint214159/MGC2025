import { MgcShell } from "@/components/mgc/MgcShell";
import { MgcAdminMonitor } from "./MgcAdminMonitor";

export default function Page() {
    return (
        <MgcShell active="S7">
            <MgcAdminMonitor />
        </MgcShell>
    );
}

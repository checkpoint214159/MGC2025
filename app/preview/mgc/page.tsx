import { MgcShell } from "@/components/mgc/MgcShell";
import { MgcHub } from "./MgcHub";

/** MGC mockup hub — mock data, no backend. */
export default function Page() {
    return (
        <MgcShell>
            <MgcHub />
        </MgcShell>
    );
}

import { MgcShell } from "@/components/mgc/MgcShell";
import { MgcClinicalVerify } from "./MgcClinicalVerify";

export default function Page() {
    return (
        <MgcShell active="S3">
            <MgcClinicalVerify />
        </MgcShell>
    );
}

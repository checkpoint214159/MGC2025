import { notFound } from "next/navigation";
import { MgcShell } from "@/components/mgc/MgcShell";
import { MgcClinicalVerify } from "./MgcClinicalVerify";

export default function Page() {
    if (process.env.NODE_ENV === "production") notFound();
    return (
        <MgcShell active="S3">
            <MgcClinicalVerify />
        </MgcShell>
    );
}

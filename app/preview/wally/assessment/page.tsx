import { notFound } from "next/navigation";
import { WallyShell } from "@/components/wally/WallyShell";
import { WallyAssessment } from "./WallyAssessment";

export default function Page() {
    if (process.env.NODE_ENV === "production") notFound();
    return (
        <WallyShell active="assessment">
            <WallyAssessment />
        </WallyShell>
    );
}

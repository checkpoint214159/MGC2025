import { notFound } from "next/navigation";
import { WallyShell } from "@/components/wally/WallyShell";
import { WallyPlan } from "./WallyPlan";

export default function Page() {
    if (process.env.NODE_ENV === "production") notFound();
    return (
        <WallyShell active="plan">
            <WallyPlan />
        </WallyShell>
    );
}

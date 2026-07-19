import { WallyShell } from "@/components/wally/WallyShell";
import { WallyPlan } from "./WallyPlan";

export default function Page() {
    return (
        <WallyShell active="plan">
            <WallyPlan />
        </WallyShell>
    );
}

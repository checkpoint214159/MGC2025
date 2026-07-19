import { WallyShell } from "@/components/wally/WallyShell";
import { WallyOnboarding } from "./WallyOnboarding";

export default function Page() {
    return (
        <WallyShell active="onboarding">
            <WallyOnboarding />
        </WallyShell>
    );
}

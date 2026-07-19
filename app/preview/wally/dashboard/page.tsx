import { WallyShell } from "@/components/wally/WallyShell";
import { WallyDashboard } from "./WallyDashboard";

export default function Page() {
    return (
        <WallyShell active="dashboard">
            <WallyDashboard />
        </WallyShell>
    );
}

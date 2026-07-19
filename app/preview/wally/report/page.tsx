import { WallyShell } from "@/components/wally/WallyShell";
import { WallyReport } from "./WallyReport";

export default function Page() {
    return (
        <WallyShell active="report">
            <WallyReport />
        </WallyShell>
    );
}

import { WallyShell } from "@/components/wally/WallyShell";
import { WallyLifestyle } from "./WallyLifestyle";

export default function Page() {
    return (
        <WallyShell active="lifestyle">
            <WallyLifestyle />
        </WallyShell>
    );
}

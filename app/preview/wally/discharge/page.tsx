import { WallyShell } from "@/components/wally/WallyShell";
import { WallyDischarge } from "./WallyDischarge";

export default function Page() {
    return (
        <WallyShell active="discharge">
            <WallyDischarge />
        </WallyShell>
    );
}

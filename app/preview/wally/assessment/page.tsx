import { WallyShell } from "@/components/wally/WallyShell";
import { WallyAssessment } from "./WallyAssessment";

export default function Page() {
    return (
        <WallyShell active="assessment">
            <WallyAssessment />
        </WallyShell>
    );
}

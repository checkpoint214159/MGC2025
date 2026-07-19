import { WallyShell } from "@/components/wally/WallyShell";
import { WallyReview } from "./WallyReview";

export default function Page() {
    return (
        <WallyShell active="review">
            <WallyReview />
        </WallyShell>
    );
}

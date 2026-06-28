import { notFound } from "next/navigation";
import { WallyShell } from "@/components/wally/WallyShell";
import { WallyOnboarding } from "./WallyOnboarding";

export default function Page() {
    if (process.env.NODE_ENV === "production") notFound();
    return (
        <WallyShell active="onboarding">
            <WallyOnboarding />
        </WallyShell>
    );
}

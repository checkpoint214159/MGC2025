import { notFound } from "next/navigation";
import { WallyShell } from "@/components/wally/WallyShell";
import { WallyLifestyle } from "./WallyLifestyle";

export default function Page() {
    if (process.env.NODE_ENV === "production") notFound();
    return (
        <WallyShell active="lifestyle">
            <WallyLifestyle />
        </WallyShell>
    );
}

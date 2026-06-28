import { notFound } from "next/navigation";
import { WallyShell } from "@/components/wally/WallyShell";
import { WallyDischarge } from "./WallyDischarge";

export default function Page() {
    if (process.env.NODE_ENV === "production") notFound();
    return (
        <WallyShell active="discharge">
            <WallyDischarge />
        </WallyShell>
    );
}

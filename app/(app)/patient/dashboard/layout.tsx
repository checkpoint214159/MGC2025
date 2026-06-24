import { auth } from "@/auth";
import { OnboardingGuard } from "@/components/guards/OnboardingGuard";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <OnboardingGuard>{children}</OnboardingGuard>;
}

import { auth } from "@/auth";

export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await auth();

    return <div className="min-h-screen bg-bg">{children}</div>;
}

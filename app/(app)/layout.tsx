import Sidebar from "@/components/layout/Sidebar";
import { auth } from "@/auth";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await auth();
    return (
        <div className="min-h-screen bg-bg">
            <Sidebar />
            <main className="md:pl-[240px] transition-[padding] duration-300 ease-out">
                {children}
            </main>
        </div>
    );
}

import { RoleGuard } from "@/components/guards/RoleGuard";
import { PushSubscriber } from "@/components/notifications/PushSubscriber";

export default async function UserLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RoleGuard>
            <PushSubscriber />
            {children}
        </RoleGuard>
    );
}

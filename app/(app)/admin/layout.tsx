import { RoleGuard } from "@/components/guards/RoleGuard";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <RoleGuard>{children}</RoleGuard>;
}

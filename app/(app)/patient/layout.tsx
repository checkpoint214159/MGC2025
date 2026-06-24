import { RoleGuard } from "@/components/guards/RoleGuard";

export default async function UserLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <RoleGuard>{children}</RoleGuard>;
}

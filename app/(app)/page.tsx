'use client';

import { RoleGuard } from "@/components/guards/RoleGuard";
import { useSession } from "next-auth/react";

export default function filler() {
    const { data: session, status } = useSession();

    RoleGuard({ children: <div>Filler</div>});
    
    return <div>Filler</div>;
}
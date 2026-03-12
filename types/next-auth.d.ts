import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { State } from "@/app/api/state/generate/schema";


declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      doneOnboarding: boolean;
      role: 'patient' | 'admin';
      adminManagedPatientIds?: string[];
    } & DefaultSession["user"]
    hasTodayState?: boolean | null,
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: 'patient' | 'admin'
    adminManagedPatientIds?: string[]
    doneOnboarding?: boolean
    hasTodayState?: boolean | null
    userProfile?: string | null
  }
}
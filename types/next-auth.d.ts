import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { State } from "@/app/api/state/generate/schema";


declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      profile?: string | null;
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
    hasTodayState?: boolean | null
    userProfile?: string | null
  }
}
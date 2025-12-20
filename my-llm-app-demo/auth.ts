import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
const bcrypt = require("bcryptjs");
import Credentials from "next-auth/providers/credentials";


export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const account = await prisma.account.findUnique({
                    where: { email: credentials.email },
                });

                if (!account) return null;

                const isValid = await bcrypt.compare(credentials.password, account.password);
                if (!isValid) return null;

                return {
                    id: account.user_id,
                    email: account.email,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
            }
            
            if (token?.id) {
                if (!token.treatment || trigger === "update") {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { treatment: true, dashboardConfig: true }
                    });

                    if (dbUser) {
                        token.treatment = dbUser.treatment;
                        token.dashboardConfig = dbUser.dashboardConfig;
                    }
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.treatment = token.treatment as string;
                session.user.dashboardConfig = token.dashboardConfig;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
});

import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
const bcrypt = require("bcryptjs");
import Credentials from "next-auth/providers/credentials";
import { getNormalizedAppDate } from "@/lib/date-utils";

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                const email = credentials.email as string;
                
                const account = await prisma.account.findUnique({
                    where: { email: email },
                });

                if (!account) return null;

                const isValid = await bcrypt.compare(credentials.password as string, account.password);
                if (!isValid) return null;

                return {
                    id: account.user_id,
                    email: account.email,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id;
            }

            if (token?.id) {
                // Only re-fetch if we don't know about the profile yet, or if explicitly updating
                if (!token.hasProfile|| trigger === "update") {
                    const today = await getNormalizedAppDate();

                    const [stateRecord, dbUser] = await Promise.all([
                        prisma.state.findFirst({
                            where: {
                                isActive: true,
                            }
                        }),
                        prisma.user.findUnique({
                            where: { id: token.id as string },
                            select: { name: true, profile: true }
                        })
                    ]);
                    if (dbUser) {
                        token.name = dbUser.name;
                        // Store a boolean instead of the full clinical string
                        token.hasProfile = !!dbUser.profile;
                    }
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.hasTodayState = token.hasTodayState as boolean;
                // Expose the boolean to the client UI
                session.user.hasProfile = token.hasProfile as boolean;
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
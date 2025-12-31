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
                const email = credentials.email as string
                const password = credentials.password as string
                const account = await prisma.account.findUnique({
                    where: { email: email },
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
                if (!token.userProfile || trigger === "update") {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    console.log("Querying for:", { id: token.id, date: today });
                    const [stateRecord, dbUser] = await Promise.all([
                        prisma.state.findUnique({
                            where: { userId_dateCreated: {
                                userId: token.id as string,
                                dateCreated: today,
                            } }
                        }),
                        prisma.user.findUnique({
                            where: { id: token.id as string } // Fixed: Use token.id
                        })
                    ]);

                    if (stateRecord) {
                        token.hasTodayState = true;
                    }

                    if (dbUser) {
                        token.userProfile = dbUser.profile
                        token.name = dbUser.name
                    }
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.hasTodayState = token.hasTodayState as boolean;
                // technically really bad, this profile is sensitive info kinda
                session.user.profile = token.userProfile as string;
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

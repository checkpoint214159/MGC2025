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
            // console.log('all?', { token, user, trigger, session })
            if (token?.id) {

                if (!token.doneOnboarding || trigger === "update") {

                    const [dbUser] = await Promise.all([
                        prisma.user.findUnique({
                            where: { id: token.id as string },
                            select: { name: true,
                                profile: true, biometric: true,
                                baseline: true, threads: {
                                    where: { type: "onboarding" },
                                    include: { messages: { orderBy: { createdAt: 'asc' } } },
                                    take: 1
                                },
                            }
                        })
                    ]);
                    
                    if (dbUser) {
                        token.name = dbUser.name;
                        token.doneOnboarding = !!dbUser.profile && !!dbUser.biometric
                            && !!dbUser.baseline && !!dbUser.threads;
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
                session.user.doneOnboarding = token.doneOnboarding as boolean;
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
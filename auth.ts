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
                // Fetch user role and admin relations on first login or session update
                if (!token.role || trigger === "update") {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: {
                            name: true,
                            role: true,
                            profile: true,
                            biometric: true,
                            baseline: true,
                            threads: {
                                where: { type: "onboarding" },
                                include: { messages: { orderBy: { createdAt: 'asc' } } },
                                take: 1
                            },
                            adminManagedPatients: {
                                select: { patientId: true }
                            }
                        }
                    });
                    
                    if (dbUser) {
                        token.name = dbUser.name;
                        token.role = dbUser.role;
                        token.doneOnboarding = !!dbUser.profile && !!dbUser.biometric
                            && !!dbUser.baseline && !!dbUser.threads;
                        
                        // If admin, include managed patient IDs
                        if (dbUser.role === 'admin') {
                            token.adminManagedPatientIds = dbUser.adminManagedPatients.map(rel => rel.patientId);
                        }
                    }
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as 'patient' | 'admin' | 'physiotherapist' | 'dietician';
                session.user.doneOnboarding = token.doneOnboarding as boolean;
                session.hasTodayState = token.hasTodayState as boolean;
                
                // Expose admin managed patient IDs if user is admin
                if (token.role === 'admin' && token.adminManagedPatientIds) {
                    session.user.adminManagedPatientIds = token.adminManagedPatientIds as string[];
                }
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
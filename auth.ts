import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
const bcrypt = require("bcryptjs");
import Credentials from "next-auth/providers/credentials";
import { getNormalizedAppDate } from "@/lib/date-utils";

export const { handlers, auth, signIn, signOut } = NextAuth({
    // Auth.js auto-trusts the host only on platforms it detects (e.g. Vercel).
    // On Cloudflare Workers it doesn't, so opt in explicitly — Cloudflare sets a
    // correct Host header, so trusting it is safe. (Equivalent env: AUTH_TRUST_HOST=true.)
    trustHost: true,
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
            console.log("[JWT CALLBACK] trigger:", trigger, "token.id:", token?.id);
            if (user) {
                token.id = user.id;
            }
            
            if (token?.id) {
                // Fetch user role and admin relations on first login only
                // doneOnboarding is now always checked fresh in session callback
                if (!token.role) {
                    console.log("[JWT CALLBACK] Fetching user data from DB");
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: {
                            name: true,
                            role: true,
                            adminManagedPatients: {
                                select: { patientId: true }
                            }
                        }
                    });
                    
                    if (dbUser) {
                        token.name = dbUser.name;
                        token.role = dbUser.role;
                        
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
                session.user.role = token.role as 'patient' | 'admin';
                session.hasTodayState = token.hasTodayState as boolean;
                
                // Always fetch fresh doneOnboarding state from DB
                // This ensures profile updates from setProfileAction are picked up immediately
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: {
                            profile: true,
                            biometric: true,
                            screening: true,
                            threads: {
                                where: { type: "onboarding" },
                                take: 1
                            }
                        }
                    });

                    if (dbUser) {
                        session.user.doneOnboarding = !!dbUser.profile && !!dbUser.biometric
                            && !!dbUser.screening && !!dbUser.threads;
                    }
                } catch (error) {
                    console.error("[SESSION] Failed to fetch doneOnboarding state:", error);
                    session.user.doneOnboarding = token.doneOnboarding as boolean;
                }
                
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
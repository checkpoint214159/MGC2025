"use client";

/**
 * Dev-only "All pages" directory — the front door reachable straight from `npm run dev`
 * at /preview . Links every destination: the MGC mockup flow, the component gallery, and
 * the live (auth-gated) app routes. Gated to development by page.tsx + proxy.ts.
 */

import {
    ClipboardList,
    Sparkles,
    BadgeCheck,
    LayoutDashboard,
    ShieldAlert,
    LayoutGrid,
    Compass,
    LogIn,
    UserPlus,
    Home,
    MessageCircle,
    Users,
    HeartPulse,
    ArrowRight,
    Lock,
    type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Item = { href: string; tag?: string; icon: LucideIcon; title: string; desc: string; locked?: boolean };
type Group = { label: string; hint: string; items: Item[] };

const GROUPS: Group[] = [
    {
        label: "MGC mockup flow",
        hint: "The demo — onboarding through the daily recovery loop. Fully clickable, no backend.",
        items: [
            { href: "/preview/mgc", icon: Compass, title: "Flow overview", desc: "The hub — every step of the demo in order." },
            { href: "/preview/mgc/onboarding", tag: "S1", icon: ClipboardList, title: "Onboarding", desc: "Biometrics → screening → lifestyle → readiness." },
            { href: "/preview/mgc/plan", tag: "S2", icon: Sparkles, title: "Plan generation", desc: "A personalized X-day recovery arc + targets." },
            { href: "/preview/mgc/verify", tag: "S3", icon: BadgeCheck, title: "Clinical verification", desc: "Physio + dietician sign-off activates the plan." },
            { href: "/preview/mgc/patient", tag: "S4", icon: LayoutDashboard, title: "Patient dashboard", desc: "Daily plant, four priorities, Start → Do → AAR." },
            { href: "/preview/mgc/admin", tag: "S7", icon: ShieldAlert, title: "Clinician monitoring", desc: "Stalling / dropping / nearing-done flags for review." },
        ],
    },
    {
        label: "Design reference",
        hint: "Building blocks and visual motifs in isolation.",
        items: [
            { href: "/preview/gallery", icon: LayoutGrid, title: "Component gallery", desc: "Plant varieties + stages, hero, recovery arc, streak, nudges." },
        ],
    },
    {
        label: "Live app",
        hint: "The real product. These hit the backend and need a login first.",
        items: [
            { href: "/login", icon: LogIn, title: "Log in", desc: "Sign in to reach the authenticated app." },
            { href: "/signup", icon: UserPlus, title: "Sign up", desc: "Create a patient account." },
            { href: "/", icon: Home, title: "Today", desc: "The patient's home dashboard.", locked: true },
            { href: "/patient/info", icon: HeartPulse, title: "Onboarding (real)", desc: "The live onboarding wizard.", locked: true },
            { href: "/patient/dashboard", icon: LayoutDashboard, title: "Patient dashboard (real)", desc: "Live recovery dashboard with logging.", locked: true },
            { href: "/chat", icon: MessageCircle, title: "Ask", desc: "The RAG-backed assistant.", locked: true },
            { href: "/admin", icon: Users, title: "Admin", desc: "Clinician patient list + monitoring.", locked: true },
        ],
    },
];

export function PreviewDirectory() {
    return (
        <div className="min-h-screen bg-bg">
            <div className="mx-auto max-w-3xl space-y-10 px-5 py-12 md:px-8">
                <header className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-md bg-attention-soft px-3 py-1.5 text-[12px] text-attention-ink">
                        Dev directory — all pages in one place. Hidden in production.
                    </div>
                    <h1 className="text-[30px] font-semibold text-ink">Recovery — all pages</h1>
                    <p className="max-w-prose text-[16px] text-ink-muted">
                        Click into any screen. The MGC mockup flow is the demo and needs no backend; the live
                        app routes require a login.
                    </p>
                </header>

                {GROUPS.map((group) => (
                    <section key={group.label} className="space-y-3">
                        <div>
                            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-subtle">{group.label}</h2>
                            <p className="text-[13px] text-ink-muted">{group.hint}</p>
                        </div>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <a key={item.href} href={item.href} className="block focus:outline-none">
                                        <Card interactive className="flex h-full items-center gap-3.5">
                                            <div className={cn("grid size-10 shrink-0 place-items-center rounded-md", item.locked ? "bg-surface-sunken text-ink-subtle" : "bg-accent-soft text-accent-ink")}>
                                                <Icon size={20} strokeWidth={1.75} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    {item.tag && <span className="font-mono text-[11px] text-ink-subtle">{item.tag}</span>}
                                                    <h3 className="truncate text-[15px] font-semibold text-ink">{item.title}</h3>
                                                    {item.locked && <Lock size={12} strokeWidth={2} className="shrink-0 text-ink-subtle" />}
                                                </div>
                                                <p className="text-[13px] text-ink-muted">{item.desc}</p>
                                            </div>
                                            <ArrowRight size={17} strokeWidth={1.75} className="shrink-0 text-ink-subtle" />
                                        </Card>
                                    </a>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

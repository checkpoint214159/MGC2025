"use client";

import { ClipboardList, HeartPulse, Sparkles, Upload, FileText, LayoutDashboard, ClipboardCheck, ShieldCheck, ArrowRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { WallyMascot } from "@/components/wally/WallyMascot";

type Screen = { href: string; phase: string; tone: string; icon: LucideIcon; title: string; desc: string };

const SCREENS: Screen[] = [
    { href: "/preview/wally/onboarding", phase: "Phase 1", tone: "bg-accent-soft text-accent-ink", icon: ClipboardList, title: "General Onboarding", desc: "Biometrics — age, gender, height, weight, conditions and surgery." },
    { href: "/preview/wally/assessment", phase: "Phase 2", tone: "bg-progress-soft text-progress-ink", icon: HeartPulse, title: "Initial Assessment", desc: "PAR-Q, SARC-F and MUST — readiness, strength and nutrition screening." },
    { href: "/preview/wally/lifestyle", phase: "Phase 3", tone: "bg-attention-soft text-attention-ink", icon: Sparkles, title: "Getting to Know You", desc: "Adaptive questions about activities, goals and preferences." },
    { href: "/preview/wally/discharge", phase: "Upload", tone: "bg-accent-soft text-accent-ink", icon: Upload, title: "Discharge Care Plan", desc: "Upload the physiotherapy + dietitian plans from discharge." },
    { href: "/preview/wally/review", phase: "Review", tone: "bg-attention-soft text-attention-ink", icon: ShieldCheck, title: "Clinical Review", desc: "Wally's draft goes to the physiotherapist + dietitian for sign-off before it goes live." },
    { href: "/preview/wally/plan", phase: "Output", tone: "bg-accent-soft text-accent-ink", icon: FileText, title: "Recovery Plan", desc: "Mr Tan's plan — goals, physiotherapy + dietitian columns, red flags." },
    { href: "/preview/wally/dashboard", phase: "Daily", tone: "bg-progress-soft text-progress-ink", icon: LayoutDashboard, title: "Patient Dashboard", desc: "Growing plant for today's tasks, hydration/sleep logging, feedback loop." },
    { href: "/preview/wally/report", phase: "Report", tone: "bg-progress-soft text-progress-ink", icon: ClipboardCheck, title: "Recovery Progress Report", desc: "Clinical summary, key metrics, insights and recommended actions." },
];

export function WallyHub() {
    return (
        <div className="mx-auto max-w-3xl space-y-8 px-5 py-12">
            <header className="flex items-center gap-4">
                <WallyMascot pose="wave" size={92} />
                <div>
                    <h1 className="text-[30px] font-semibold text-ink">Wally — patient journey</h1>
                    <p className="mt-1 max-w-prose text-[15px] text-ink-muted">
                        Wally optimizes recovery at home — onboarding through assessment to a clinician-prepared plan and a
                        daily loop that adapts to the patient&apos;s feedback. Click through the flow:
                    </p>
                </div>
            </header>

            <div className="space-y-2.5">
                {SCREENS.map((s) => {
                    const Icon = s.icon;
                    return (
                        <a key={s.href} href={s.href} className="block focus:outline-none">
                            <Card interactive className="flex items-center gap-4">
                                <div className={`grid size-10 shrink-0 place-items-center rounded-md ${s.tone}`}>
                                    <Icon size={20} strokeWidth={1.75} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-[12px] text-ink-subtle">{s.phase}</span>
                                        <h3 className="text-[16px] font-semibold text-ink">{s.title}</h3>
                                    </div>
                                    <p className="text-[14px] text-ink-muted">{s.desc}</p>
                                </div>
                                <ArrowRight size={18} strokeWidth={1.75} className="shrink-0 text-ink-subtle" />
                            </Card>
                        </a>
                    );
                })}
            </div>

            <p className="text-[13px] text-ink-muted">
                The clinician side (plan verification + stalled-recovery flags) lives in the{" "}
                <a href="/preview/mgc/admin" className="font-medium text-accent-ink hover:underline">monitoring screens</a>.
            </p>
        </div>
    );
}

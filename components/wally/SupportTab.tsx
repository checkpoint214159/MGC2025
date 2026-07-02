"use client";

import { ReactNode, useState } from "react";
import {
    LifeBuoy, BookOpen, HeartHandshake, ChevronDown, Phone, Globe, Stethoscope,
    ShowerHead, Salad, Bandage, Users,
} from "lucide-react";
import { PhaseScope } from "@/components/wally/PhaseScope";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/** Support tab: colorectal-surgery care resources + Singapore support groups. */

const RESOURCES: { icon: ReactNode; title: string; body: string[] }[] = [
    {
        icon: <Bandage size={18} />,
        title: "Stoma care basics",
        body: [
            "Empty the pouch when it is one-third to half full — don't wait for it to fill.",
            "Check the skin around the stoma daily; it should look like the rest of your tummy.",
            "Your stoma nurse is part of your care team — no question is too small.",
        ],
    },
    {
        icon: <Salad size={18} />,
        title: "Eating after colorectal surgery",
        body: [
            "Return to a normal diet as tolerated — smaller, easier-to-digest meals first.",
            "Go slow with very oily food and gas-forming foods (beans, cabbage, fizzy drinks).",
            "Chew well and drink 6–8 glasses of water through the day.",
        ],
    },
    {
        icon: <ShowerHead size={18} />,
        title: "Wound care & showering",
        body: [
            "You can usually shower with a healed dressing — pat the area dry, don't rub.",
            "Watch for redness, swelling or discharge; tell your care team if a wound opens.",
        ],
    },
];

const GROUPS: { name: string; org: string; desc: string; tel: string; telLabel: string; url: string }[] = [
    {
        name: "CGH Colorectal Cancer Support Group",
        org: "Changi General Hospital",
        desc: "Peer support and talks for colorectal patients and caregivers, run with the CGH colorectal team.",
        tel: "tel:+6567888833",
        telLabel: "6788 8833",
        url: "https://www.cgh.com.sg",
    },
    {
        name: "TTSH Colorectal Support Group",
        org: "Tan Tock Seng Hospital",
        desc: "Meet others walking the same recovery — sharing sessions with nurses and dietitians.",
        tel: "tel:+6562566011",
        telLabel: "6256 6011",
        url: "https://www.ttsh.com.sg",
    },
    {
        name: "NCIS Patient Support Groups",
        org: "National University Cancer Institute, Singapore",
        desc: "Hospital-led support groups and survivorship programmes across cancer types.",
        tel: "tel:+6567737888",
        telLabel: "6773 7888",
        url: "https://www.ncis.com.sg",
    },
    {
        name: "CR47 Colorectal Support Group",
        org: "Community peer group",
        desc: "A community of colorectal cancer warriors and caregivers supporting each other beyond the hospital.",
        tel: "tel:18007273333",
        telLabel: "1800 727 3333",
        url: "https://www.singaporecancersociety.org.sg",
    },
];

function ResourceCard({ icon, title, body }: { icon: ReactNode; title: string; body: string[] }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-2xl border border-border bg-surface">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">{icon}</span>
                <span className="flex-1 text-[15px] font-semibold text-ink">{title}</span>
                <ChevronDown size={18} className={cn("shrink-0 text-ink-subtle transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <ul className="space-y-2 border-t border-border px-4 py-3">
                    {body.map((line) => (
                        <li key={line} className="flex gap-2 text-[14px] leading-snug text-ink-muted">
                            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
                            {line}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function SupportTab() {
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
                    <LifeBuoy size={22} />
                </span>
                <div>
                    <h2 className="text-[20px] font-bold text-ink">Support</h2>
                    <p className="text-[13px] text-ink-muted">You&apos;re not doing this alone.</p>
                </div>
            </div>

            {/* care team CTA */}
            <div className="rounded-2xl border border-accent/20 bg-accent-soft/40 p-4">
                <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-accent-ink">
                        <Stethoscope size={20} />
                    </span>
                    <div className="flex-1">
                        <h3 className="text-[15px] font-semibold text-ink">Not feeling right?</h3>
                        <p className="mt-0.5 text-[13px] text-ink-muted">
                            Trust your gut — it&apos;s always okay to call. Your care team would much rather hear from you.
                        </p>
                        <a href="tel:+6567888833" className="mt-2.5 inline-block">
                            <Button size="sm">
                                <Phone size={15} strokeWidth={2} /> Call your care team
                            </Button>
                        </a>
                    </div>
                </div>
            </div>

            {/* resources */}
            <PhaseScope phase="assessment">
                <section className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <BookOpen size={16} className="text-accent-ink" />
                        <h3 className="text-[13px] font-bold uppercase tracking-wide text-accent-ink">Colorectal surgery resources</h3>
                    </div>
                    <div className="space-y-2">
                        {RESOURCES.map((r) => (
                            <ResourceCard key={r.title} {...r} />
                        ))}
                    </div>
                </section>
            </PhaseScope>

            {/* support groups */}
            <PhaseScope phase="lifestyle">
                <section className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <HeartHandshake size={16} className="text-accent-ink" />
                        <h3 className="text-[13px] font-bold uppercase tracking-wide text-accent-ink">Support groups</h3>
                    </div>
                    <div className="space-y-2">
                        {GROUPS.map((g) => (
                            <div key={g.name} className="rounded-2xl border border-border bg-surface p-4">
                                <div className="flex items-start gap-3">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                                        <Users size={18} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[15px] font-semibold leading-snug text-ink">{g.name}</h4>
                                        <p className="text-[12px] font-medium text-accent-ink">{g.org}</p>
                                        <p className="mt-1 text-[13px] leading-snug text-ink-muted">{g.desc}</p>
                                        <div className="mt-2.5 flex flex-wrap gap-2">
                                            <a href={g.tel}>
                                                <Button size="sm" variant="secondary">
                                                    <Phone size={14} strokeWidth={2} /> {g.telLabel}
                                                </Button>
                                            </a>
                                            <a href={g.url} target="_blank" rel="noreferrer">
                                                <Button size="sm" variant="ghost">
                                                    <Globe size={14} strokeWidth={2} /> Website
                                                </Button>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </PhaseScope>

            <p className="px-1 text-[12px] leading-snug text-ink-subtle">
                Group schedules change — call ahead to confirm meeting times. Wally can help you prepare questions to ask.
            </p>
        </div>
    );
}

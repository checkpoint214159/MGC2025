"use client";

import { useState } from "react";
import { BadgeCheck, Check, MessageSquare, Pencil } from "lucide-react";
import { Card, Chip, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const EXERCISE = [
    {
        name: "Ankle pumps",
        detail: "3 sets of 10, twice daily",
        intensity: "Easy",
    },
    {
        name: "Short hallway walk",
        detail: "3 min, twice daily",
        intensity: "Cautious",
    },
    {
        name: "Seated knee extensions",
        detail: "2 sets of 8",
        intensity: "Easy",
    },
];
const NUTRITION = [
    { name: "Protein target", detail: "90 g/day for tissue repair" },
    { name: "Hydration", detail: "2 L/day" },
    { name: "Fiber, eased in", detail: "Gentle return for the gut" },
];

function SignSlot({
    label,
    sub,
    signed,
}: {
    label: string;
    sub: string;
    signed: boolean;
}) {
    return (
        <div
            className={cn(
                "flex flex-1 items-center gap-2.5 rounded-md border px-3 py-2.5",
                signed
                    ? "border-progress/30 bg-progress-soft/40"
                    : "border-border bg-surface",
            )}
        >
            <div
                className={cn(
                    "grid size-7 place-items-center rounded-full",
                    signed
                        ? "bg-progress text-ink-inverse"
                        : "bg-surface-sunken text-ink-subtle",
                )}
            >
                {signed ? (
                    <Check size={15} strokeWidth={2.5} />
                ) : (
                    <span className="size-1.5 rounded-full bg-current" />
                )}
            </div>
            <div className="leading-tight">
                <div className="text-[14px] font-medium text-ink">{label}</div>
                <div className="text-[12px] text-ink-muted">
                    {signed ? "Signed off" : `${sub} · pending`}
                </div>
            </div>
        </div>
    );
}

export function MgcClinicalVerify() {
    const [role, setRole] = useState<"pt" | "dt">("pt");
    const [ptSigned, setPtSigned] = useState(false);
    const [dtSigned, setDtSigned] = useState(false);
    const active = ptSigned && dtSigned;

    return (
        <div className="mx-auto max-w-3xl space-y-6 px-5 py-10">
            <header className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-[26px] font-semibold text-ink">
                        Verify plan — Margaret Chen
                    </h1>
                    <p className="text-[15px] text-ink-muted">
                        Open colectomy · 28-day recovery arc · drafted by the
                        model
                    </p>
                </div>
                <Chip tone={active ? "progress" : "attention"} size="md">
                    {active ? "Active" : "Draft"}
                </Chip>
            </header>

            <div className="flex gap-3">
                <SignSlot
                    label="Physiotherapist"
                    sub="Exercise"
                    signed={ptSigned}
                />
                <SignSlot label="Dietician" sub="Nutrition" signed={dtSigned} />
            </div>

            {active ? (
                <Card className="space-y-2 border-progress/20 bg-progress-soft/30 p-8 text-center">
                    <BadgeCheck
                        size={32}
                        strokeWidth={1.75}
                        className="mx-auto text-progress"
                    />
                    <h2 className="text-[19px] font-semibold text-ink">
                        Plan activated
                    </h2>
                    <p className="text-[15px] text-ink-muted">
                        Both clinicians have signed off. Margaret&apos;s daily
                        recovery loop is now live.
                    </p>
                    <a
                        href="/preview/mgc/patient"
                        className="inline-block pt-2"
                    >
                        <Button>Open patient dashboard →</Button>
                    </a>
                </Card>
            ) : (
                <>
                    <div className="flex w-fit gap-1 rounded-md bg-surface-sunken p-1">
                        {(["pt", "dt"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRole(r)}
                                className={cn(
                                    "h-9 rounded px-3 text-[14px] font-medium",
                                    role === r
                                        ? "bg-surface text-ink shadow-sm"
                                        : "text-ink-muted hover:text-ink",
                                )}
                            >
                                {r === "pt" ? "Physio view" : "Dietician view"}
                            </button>
                        ))}
                    </div>

                    <Card className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[17px] font-semibold text-ink">
                                {role === "pt"
                                    ? "Exercise plan"
                                    : "Nutrition plan"}
                            </h3>
                            <span className="text-[13px] text-ink-subtle">
                                your discipline
                            </span>
                        </div>
                        <ul className="divide-y divide-border rounded-md border border-border">
                            {(role === "pt" ? EXERCISE : NUTRITION).map(
                                (item) => (
                                    <li
                                        key={item.name}
                                        className="flex items-center gap-3 px-4 py-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[15px] font-medium text-ink">
                                                {item.name}
                                            </div>
                                            <div className="text-[13px] text-ink-muted">
                                                {item.detail}
                                            </div>
                                        </div>
                                        {"intensity" in item && (
                                            <Chip tone="accent" size="sm">
                                                {
                                                    (
                                                        item as {
                                                            intensity: string;
                                                        }
                                                    ).intensity
                                                }
                                            </Chip>
                                        )}
                                        <button
                                            aria-label="Edit"
                                            className="grid size-9 place-items-center rounded-md text-ink-subtle hover:bg-surface-sunken hover:text-ink"
                                        >
                                            <Pencil
                                                size={15}
                                                strokeWidth={1.75}
                                            />
                                        </button>
                                    </li>
                                ),
                            )}
                        </ul>
                        <button className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
                            <MessageSquare size={15} strokeWidth={1.75} /> Add a
                            comment…
                        </button>
                        <div className="flex justify-end border-t border-border pt-3">
                            {role === "pt" ? (
                                <Button
                                    onClick={() => setPtSigned(true)}
                                    disabled={ptSigned}
                                >
                                    {ptSigned
                                        ? "Signed ✓"
                                        : "Sign off Exercise"}
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setDtSigned(true)}
                                    disabled={dtSigned}
                                >
                                    {dtSigned
                                        ? "Signed ✓"
                                        : "Sign off Nutrition"}
                                </Button>
                            )}
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}

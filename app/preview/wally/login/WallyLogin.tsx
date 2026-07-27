"use client";

import { useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { PhaseScope } from "@/components/wally/PhaseScope";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const field =
    "w-full rounded-xl border border-border-strong bg-surface px-4 py-3.5 text-[16px] text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring";

/**
 * Wally patient sign-in — the phone-framed entry screen. Logo lockup (sprout mark +
 * wordmark), editable email/password so it can be typed on camera, and links onward to
 * the daily dashboard (sign in) or onboarding (new patient). Restrained, on-brand.
 */
export function WallyLogin() {
    const [showPw, setShowPw] = useState(false);

    return (
        <PhaseScope phase="onboarding">
            <div className="flex min-h-full flex-col px-6 pb-8 pt-6">
                <div className="flex flex-1 flex-col justify-center">
                    {/* logo lockup */}
                    <div className="flex flex-col items-center text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/wally/wally_full.png"
                            alt="Wally"
                            className="h-40 w-auto mix-blend-multiply"
                        />
                        <p className="mt-2 max-w-[16rem] text-[14px] text-ink-muted">
                            Welcome back — sign in to continue your recovery.
                        </p>
                    </div>

                    {/* form */}
                    <div className="mt-8 space-y-4">
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-[13px] font-medium text-ink-muted"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                className={field}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-1.5 block text-[13px] font-medium text-ink-muted"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPw ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className={cn(field, "pr-12")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((v) => !v)}
                                    aria-label={
                                        showPw ? "Hide password" : "Show password"
                                    }
                                    className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-subtle hover:bg-surface-sunken hover:text-ink"
                                >
                                    {showPw ? (
                                        <EyeOff size={18} strokeWidth={1.75} />
                                    ) : (
                                        <Eye size={18} strokeWidth={1.75} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <a
                                href="#"
                                className="text-[13px] font-medium text-accent-ink hover:underline"
                            >
                                Forgot password?
                            </a>
                        </div>

                        <a href="/preview/wally/dashboard" className="block">
                            <Button size="lg" className="mt-1 w-full">
                                Sign in <ArrowRight size={18} />
                            </Button>
                        </a>
                    </div>
                </div>

                {/* new patient */}
                <p className="mt-8 text-center text-[14px] text-ink-muted">
                    New to Wally?{" "}
                    <a
                        href="/preview/wally/onboarding"
                        className="font-semibold text-accent-ink hover:underline"
                    >
                        Create an account
                    </a>
                </p>
            </div>
        </PhaseScope>
    );
}

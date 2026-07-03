"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getPatientDetailsForAdminAction } from "@/lib/actions";
import { getPatientThreadsForAdminAction } from "@/lib/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ensureAction } from "@/lib/utils";
import DashboardRenderer from "@/app/(app)/patient/dashboard/DashboardRenderer";
import { ReportTab } from "@/components/admin/ReportTab";
import type { State } from "@/lib/state/schemas/state";

interface PatientDetailViewProps {
    patientId: string;
}

/**
 * Admin view for detailed patient information with multiple tabs.
 * Shows biometrics, recovery progress, onboarding threads, and screening results.
 */
export function PatientDetailView({ patientId }: PatientDetailViewProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<
        "overview" | "progress" | "threads" | "screening" | "report"
    >("overview");

    // Fetch patient details
    const {
        data: patient,
        isLoading: patientLoading,
        isError: patientError,
    } = useQuery({
        queryKey: ["admin", "patient", patientId],
        queryFn: async () => {
            const result = await getPatientDetailsForAdminAction(patientId);
            return ensureAction(result);
        },
        enabled: !!patientId && !!session?.user?.id,
    });

    // Fetch patient threads
    const { data: threads, isLoading: threadsLoading } = useQuery({
        queryKey: ["admin", "patient-threads", patientId],
        queryFn: async () => {
            const result = await getPatientThreadsForAdminAction(patientId);
            return ensureAction(result);
        },
        enabled: !!patientId && !!session?.user?.id,
    });

    if (patientLoading) {
        // Skeleton, not a spinner (DESIGN.md)
        return (
            <div className="mx-auto max-w-6xl p-8">
                <div className="mb-10 space-y-3">
                    <div className="h-11 w-40 animate-pulse rounded-md bg-surface-sunken" />
                    <div className="h-8 w-72 animate-pulse rounded-md bg-surface-sunken" />
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="h-48 animate-pulse rounded-lg bg-surface-sunken" />
                    <div className="h-48 animate-pulse rounded-lg bg-surface-sunken" />
                </div>
            </div>
        );
    }

    if (patientError || !patient) {
        return (
            <div className="mx-auto max-w-6xl p-8">
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="mb-6"
                >
                    ← Back
                </Button>
                <div className="rounded-lg border border-critical/30 bg-critical-soft p-6">
                    <p className="font-semibold text-critical-ink">
                        Error loading patient details
                    </p>
                </div>
            </div>
        );
    }

    const tabs: Array<
        "overview" | "progress" | "threads" | "screening" | "report"
    > = ["overview", "progress", "threads", "screening", "report"];

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-10">
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    ← Back to Dashboard
                </Button>
                <h1 className="text-3xl font-semibold text-ink">
                    {patient.name}
                </h1>
                <p className="mt-2 text-ink-muted">Patient ID: {patient.id}</p>
            </div>

            {/* Tab Navigation */}
            <div className="mb-8 flex gap-4 border-b border-border">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`border-b-2 px-4 py-2 font-medium transition-colors ${
                            activeTab === tab
                                ? "border-accent text-accent-ink"
                                : "border-transparent text-ink-muted hover:text-ink"
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6">
                            <h2 className="text-xl font-semibold mb-4">
                                Biometrics
                            </h2>
                            {patient.biometric ? (
                                <div className="space-y-2">
                                    <p>
                                        <span className="font-medium">
                                            Age:
                                        </span>{" "}
                                        {patient.biometric.age}
                                    </p>
                                    <p>
                                        <span className="font-medium">
                                            Sex:
                                        </span>{" "}
                                        {patient.biometric.sex}
                                    </p>
                                    <p>
                                        <span className="font-medium">
                                            Treatment:
                                        </span>{" "}
                                        {patient.biometric.treatment}
                                    </p>
                                    <p>
                                        <span className="font-medium">
                                            Surgery Date:
                                        </span>{" "}
                                        {new Date(
                                            patient.biometric.surgeryDate,
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-ink-subtle">
                                    No biometric data available
                                </p>
                            )}
                        </Card>

                        <Card className="p-6">
                            <h2 className="text-xl font-semibold mb-4">
                                Profile Summary
                            </h2>
                            {patient.profile ? (
                                <p className="text-ink-muted leading-relaxed">
                                    {patient.profile}
                                </p>
                            ) : (
                                <p className="text-ink-subtle">
                                    No profile summary available
                                </p>
                            )}
                        </Card>
                    </div>
                )}

                {/* Progress Tab */}
                {activeTab === "progress" && (
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            Recovery Progress
                        </h2>
                        {patient.states && patient.states.length > 0 ? (
                            <DashboardRenderer
                                config={patient.states[0] as unknown as State}
                            />
                        ) : (
                            <p className="text-ink-subtle">
                                No active recovery state found
                            </p>
                        )}
                    </Card>
                )}

                {/* Threads Tab */}
                {activeTab === "threads" && (
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            Onboarding Conversation
                        </h2>
                        {threadsLoading ? (
                            <div className="space-y-3 py-2">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="h-16 w-full animate-pulse rounded-md bg-surface-sunken"
                                    />
                                ))}
                            </div>
                        ) : threads && threads.length > 0 ? (
                            <div className="space-y-4">
                                {threads.map((thread) => (
                                    <div
                                        key={thread.id}
                                        className="rounded-lg bg-surface-sunken/50 px-4 py-3"
                                    >
                                        <h3 className="font-semibold text-ink mb-3">
                                            {thread.title}
                                        </h3>
                                        <div className="space-y-3">
                                            {thread.messages?.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={`p-3 rounded-md ${
                                                        message.role ===
                                                        "assistant"
                                                            ? "bg-accent-soft/60"
                                                            : "bg-surface"
                                                    }`}
                                                >
                                                    <p className="text-sm font-medium text-ink-muted mb-1">
                                                        {message.role ===
                                                        "assistant"
                                                            ? "Doctor"
                                                            : "Patient"}
                                                    </p>
                                                    <p className="text-ink">
                                                        {message.content}
                                                    </p>
                                                    {message.reasoning && (
                                                        <p className="text-sm text-ink-muted mt-2 italic">
                                                            Reasoning:{" "}
                                                            {message.reasoning}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-ink-subtle">
                                No conversation history available
                            </p>
                        )}
                    </Card>
                )}

                {/* Screening Tab */}
                {activeTab === "screening" && (
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            PAR-Q Activity Readiness Screening
                        </h2>
                        {patient.screening &&
                        (patient.screening as { data?: unknown }).data ? (
                            <div className="space-y-6">
                                <pre className="text-ink-muted whitespace-pre-wrap text-sm">
                                    {JSON.stringify(
                                        (
                                            patient.screening as {
                                                data?: unknown;
                                            }
                                        ).data,
                                        null,
                                        2,
                                    )}
                                </pre>
                            </div>
                        ) : (
                            <p className="text-ink-subtle">
                                No screening on record
                            </p>
                        )}
                    </Card>
                )}

                {/* Report Tab */}
                {activeTab === "report" && <ReportTab patientId={patientId} />}
            </div>
        </div>
    );
}

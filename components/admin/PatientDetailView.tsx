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
        return (
            <div className="flex items-center justify-center min-h-screen">
                <svg
                    className="animate-spin h-10 w-10 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            </div>
        );
    }

    if (patientError || !patient) {
        return (
            <div className="p-8 max-w-6xl mx-auto">
                <Button
                    onClick={() => router.back()}
                    className="mb-6 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                    ← Back
                </Button>
                <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                    <p className="text-red-700 font-semibold">
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
                    onClick={() => router.back()}
                    className="mb-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                    ← Back to Dashboard
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">
                    {patient.name}
                </h1>
                <p className="text-gray-600 mt-2">Patient ID: {patient.id}</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-8 border-b">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                            activeTab === tab
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-600 hover:text-gray-900"
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
                                <p className="text-gray-500">
                                    No biometric data available
                                </p>
                            )}
                        </Card>

                        <Card className="p-6">
                            <h2 className="text-xl font-semibold mb-4">
                                Profile Summary
                            </h2>
                            {patient.profile ? (
                                <p className="text-gray-700 leading-relaxed">
                                    {patient.profile}
                                </p>
                            ) : (
                                <p className="text-gray-500">
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
                            <p className="text-gray-500">
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
                            <div className="text-center py-8">
                                <svg
                                    className="animate-spin h-8 w-8 text-blue-600"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                            </div>
                        ) : threads && threads.length > 0 ? (
                            <div className="space-y-4">
                                {threads.map((thread) => (
                                    <div
                                        key={thread.id}
                                        className="rounded-lg bg-gray-50 px-4 py-3"
                                    >
                                        <h3 className="font-semibold text-gray-900 mb-3">
                                            {thread.title}
                                        </h3>
                                        <div className="space-y-3">
                                            {thread.messages?.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={`p-3 rounded-md ${
                                                        message.role ===
                                                        "assistant"
                                                            ? "bg-blue-50"
                                                            : "bg-white"
                                                    }`}
                                                >
                                                    <p className="text-sm font-semibold text-gray-700 mb-1">
                                                        {message.role ===
                                                        "assistant"
                                                            ? "Doctor"
                                                            : "Patient"}
                                                    </p>
                                                    <p className="text-gray-800">
                                                        {message.content}
                                                    </p>
                                                    {message.reasoning && (
                                                        <p className="text-sm text-gray-600 mt-2 italic">
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
                            <p className="text-gray-500">
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
                                <pre className="text-gray-600 whitespace-pre-wrap text-sm">
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
                            <p className="text-gray-500">
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

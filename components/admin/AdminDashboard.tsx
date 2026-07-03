"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { getAdminManagedPatientsAction } from "@/lib/actions";
import { getPatientDetailsForAdminAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ensureAction } from "@/lib/utils";

/**
 * Admin dashboard showing all assigned patients.
 * Allows admins to search, filter, and navigate to patient details.
 */
export function AdminDashboard() {
    const { data: session } = useSession();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch managed patient IDs
    const {
        data: patientIds,
        isLoading: idsLoading,
        isError: idsError,
    } = useQuery({
        queryKey: ["admin", "patients"],
        queryFn: async () => {
            const result = await getAdminManagedPatientsAction();
            return ensureAction(result);
        },
        enabled: !!session?.user?.id,
    });

    // Fetch details for each patient
    const { data: patientDetails, isLoading: detailsLoading } = useQuery({
        queryKey: ["admin", "patient-details", patientIds],
        queryFn: async () => {
            if (!patientIds || patientIds.length === 0) return [];
            const results = await Promise.all(
                patientIds.map((pid) =>
                    getPatientDetailsForAdminAction(pid).then(ensureAction),
                ),
            );
            return results;
        },
        enabled: !!patientIds && patientIds.length > 0,
    });

    const filteredPatients = useMemo(() => {
        if (!patientDetails) return [];
        return patientDetails.filter((patient) => {
            const searchLower = searchQuery.toLowerCase();
            return (
                patient.name.toLowerCase().includes(searchLower) ||
                patient.biometric?.treatment.toLowerCase().includes(searchLower)
            );
        });
    }, [patientDetails, searchQuery]);

    // Calculate days since surgery
    const getDaysSinceSurgery = (surgeryDate: Date) => {
        const now = new Date();
        const surgery = new Date(surgeryDate);
        const diffTime = now.getTime() - surgery.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (idsLoading || detailsLoading) {
        // Skeleton rows, not a spinner (DESIGN.md: skeletons over spinners-mid-content)
        return (
            <div className="mx-auto max-w-6xl p-8">
                <div className="mb-10 space-y-2">
                    <div className="h-8 w-64 animate-pulse rounded-md bg-surface-sunken" />
                    <div className="h-4 w-40 animate-pulse rounded-md bg-surface-sunken" />
                </div>
                <div className="space-y-2">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-14 w-full animate-pulse rounded-md bg-surface-sunken"
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (idsError) {
        return (
            <div className="mx-auto max-w-5xl p-8">
                <div className="rounded-lg border border-critical/30 bg-critical-soft p-6">
                    <p className="font-semibold text-critical-ink">
                        Error loading patient list
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl p-8">
            <header className="mb-10">
                <h1 className="text-3xl font-semibold text-ink">
                    Admin Dashboard
                </h1>
                <p className="mt-2 text-ink-muted">
                    Manage {patientIds?.length || 0} assigned patient
                    {patientIds?.length !== 1 ? "s" : ""}
                </p>
            </header>

            {/* Search Bar */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search by patient name or surgery type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 w-full rounded-md border border-border-strong bg-surface px-4 text-ink placeholder:text-ink-subtle focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                />
            </div>

            {/* Patient List */}
            {filteredPatients && filteredPatients.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-sunken/60">
                                <th className="px-6 py-3 text-left text-sm font-semibold text-ink">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-ink">
                                    Surgery Type
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-ink">
                                    Days Since Surgery
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-ink">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-center text-sm font-semibold text-ink">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPatients.map((patient) => (
                                <tr
                                    key={patient.id}
                                    className="border-b border-border transition-colors hover:bg-surface-sunken/40"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-ink">
                                        {patient.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-ink-muted">
                                        {patient.biometric?.treatment || "N/A"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-ink-muted">
                                        {patient.biometric
                                            ? getDaysSinceSurgery(
                                                  patient.biometric.surgeryDate,
                                              )
                                            : "N/A"}{" "}
                                        days
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span
                                            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                                                patient.profile
                                                    ? "bg-progress-soft text-progress-ink"
                                                    : "bg-attention-soft text-attention-ink"
                                            }`}
                                        >
                                            {patient.profile
                                                ? "Active"
                                                : "Onboarding"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                router.push(
                                                    `/admin/patients/${patient.id}`,
                                                )
                                            }
                                        >
                                            View Details
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <Card className="p-12 text-center">
                    <p className="text-lg text-ink-subtle">
                        {searchQuery
                            ? "No patients match your search."
                            : "No patients assigned yet."}
                    </p>
                </Card>
            )}
        </div>
    );
}

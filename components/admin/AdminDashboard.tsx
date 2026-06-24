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
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (idsError) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                    <p className="text-red-700 font-semibold">
                        Error loading patient list
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900">
                    Admin Dashboard
                </h1>
                <p className="text-gray-600 mt-2">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            {/* Patient List */}
            {filteredPatients && filteredPatients.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white rounded-lg shadow">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                    Surgery Type
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                    Days Since Surgery
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPatients.map((patient) => (
                                <tr
                                    key={patient.id}
                                    className="border-b hover:bg-gray-50 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {patient.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {patient.biometric?.treatment || "N/A"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {patient.biometric
                                            ? getDaysSinceSurgery(
                                                  patient.biometric.surgeryDate,
                                              )
                                            : "N/A"}{" "}
                                        days
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span
                                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                                patient.profile
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-yellow-100 text-yellow-800"
                                            }`}
                                        >
                                            {patient.profile
                                                ? "Active"
                                                : "Onboarding"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Button
                                            onClick={() =>
                                                router.push(
                                                    `/admin/patients/${patient.id}`,
                                                )
                                            }
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
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
                    <p className="text-gray-500 text-lg">
                        {searchQuery
                            ? "No patients match your search."
                            : "No patients assigned yet."}
                    </p>
                </Card>
            )}
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    getAdminManagedPatientsAction,
    assignPatientToAdminAction,
} from "@/lib/actions";
import { ensureAction } from "@/lib/utils";

/**
 * Development Admin Panel
 * Only visible in development mode (checked by parent route guard).
 * Provides utilities for managing demo admin-patient relationships.
 */
export function DevAdminPanel() {
    const [showPanel, setShowPanel] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [targetAdminId, setTargetAdminId] = useState<string>("");
    const [isReassigning, setIsReassigning] = useState(false);

    // Fetch managed patients
    const { data: managedPatientIds, isLoading } = useQuery({
        queryKey: ["dev-admin-patients"],
        queryFn: async () => {
            const result = await getAdminManagedPatientsAction();
            return ensureAction(result);
        },
    });

    const handleReassign = async () => {
        if (!selectedPatientId || !targetAdminId) {
            alert("Please select both a patient and target admin");
            return;
        }

        setIsReassigning(true);
        try {
            const result = await assignPatientToAdminAction(
                selectedPatientId,
                targetAdminId,
            );
            if (result.success) {
                alert(`✅ Patient reassigned to admin`);
                // Invalidate and refetch
                setSelectedPatientId("");
                setTargetAdminId("");
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (error) {
            alert(
                `❌ Error: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`,
            );
        } finally {
            setIsReassigning(false);
        }
    };

    if (!showPanel) {
        return (
            <button
                onClick={() => setShowPanel(true)}
                className="fixed bottom-4 right-4 px-3 py-2 bg-attention text-ink text-xs font-semibold rounded-md hover:opacity-90 transition-colors"
            >
                [DEV] Admin Panel
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 max-w-md bg-attention-soft border border-attention rounded-lg p-4 shadow-lg z-50">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-attention-ink">
                    🔧 Dev Admin Panel
                </h3>
                <button
                    onClick={() => setShowPanel(false)}
                    className="text-attention-ink hover:opacity-70 font-semibold"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-3 text-sm">
                {/* Info section */}
                <div className="bg-attention-soft p-2 rounded-md border border-attention/40">
                    <p className="text-attention-ink font-semibold">
                        ℹ️ Dev Admin Info
                    </p>
                    <ul className="text-attention-ink text-xs mt-1 space-y-1">
                        <li>
                            <strong>Email:</strong> dev-admin@localhost
                        </li>
                        <li>
                            <strong>Password:</strong> dev-admin-password
                        </li>
                        <li>
                            <strong>Auto-created:</strong> on first server
                            startup
                        </li>
                    </ul>
                </div>

                {/* Reload managed patients */}
                <div className="bg-surface p-2 rounded-md border border-border">
                    <p className="font-semibold text-ink mb-1">
                        Managed Patients
                    </p>
                    {isLoading ? (
                        <p className="text-ink-muted text-xs">Loading...</p>
                    ) : (
                        <p className="text-ink-muted text-xs">
                            {managedPatientIds?.length ?? 0} patient(s) assigned
                            to you
                        </p>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-1 w-full px-2 py-1 bg-surface-sunken hover:bg-border text-ink text-xs font-semibold rounded transition-colors"
                    >
                        Refresh View
                    </button>
                </div>

                {/* Reassign patient section */}
                <div className="bg-surface p-2 rounded-md border border-border">
                    <p className="font-semibold text-ink mb-2">
                        📋 Reassign Patient (Dev Only)
                    </p>
                    <p className="text-ink-muted text-xs mb-1">
                        ⚠️ Only works in development mode
                    </p>

                    <input
                        type="text"
                        placeholder="Patient ID (paste)"
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-border-strong rounded-md mb-1 bg-surface"
                    />

                    <input
                        type="text"
                        placeholder="Target Admin ID (paste)"
                        value={targetAdminId}
                        onChange={(e) => setTargetAdminId(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-border-strong rounded-md mb-2 bg-surface"
                    />

                    <button
                        onClick={handleReassign}
                        disabled={isReassigning}
                        className="w-full px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-ink-inverse text-xs font-semibold rounded transition-colors"
                    >
                        {isReassigning ? "Reassigning..." : "Reassign Patient"}
                    </button>
                </div>

                {/* Help section */}
                <div className="bg-accent-soft/60 p-2 rounded-md border border-border">
                    <p className="font-semibold text-accent-ink text-xs mb-1">
                        💡 Tips
                    </p>
                    <ul className="text-ink-muted text-xs space-y-1">
                        <li>• Patients auto-assign to dev admin on signup</li>
                        <li>
                            • Use reassign tool to test multi-admin scenarios
                        </li>
                        <li>• Check console for ⚠️ warnings on operations</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

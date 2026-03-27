"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminManagedPatientsAction, assignPatientToAdminAction } from "@/lib/actions";
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
      const result = await assignPatientToAdminAction(selectedPatientId, targetAdminId);
      if (result.success) {
        alert(`✅ Patient reassigned to admin`);
        // Invalidate and refetch
        setSelectedPatientId("");
        setTargetAdminId("");
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsReassigning(false);
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-4 right-4 px-3 py-2 bg-yellow-500 text-white text-xs font-bold rounded-lg hover:bg-yellow-600 transition-colors"
      >
        [DEV] Admin Panel
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4 shadow-xl z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-yellow-900">🔧 Dev Admin Panel</h3>
        <button
          onClick={() => setShowPanel(false)}
          className="text-yellow-600 hover:text-yellow-900 font-bold"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {/* Info section */}
        <div className="bg-yellow-100 p-2 rounded border border-yellow-300">
          <p className="text-yellow-900 font-semibold">ℹ️ Dev Admin Info</p>
          <ul className="text-yellow-800 text-xs mt-1 space-y-1">
            <li>
              <strong>Email:</strong> dev-admin@localhost
            </li>
            <li>
              <strong>Password:</strong> dev-admin-password
            </li>
            <li>
              <strong>Auto-created:</strong> on first server startup
            </li>
          </ul>
        </div>

        {/* Reload managed patients */}
        <div className="bg-white p-2 rounded border border-yellow-200">
          <p className="font-semibold text-yellow-900 mb-1">Managed Patients</p>
          {isLoading ? (
            <p className="text-yellow-700 text-xs">Loading...</p>
          ) : (
            <p className="text-yellow-800 text-xs">
              {managedPatientIds?.length ?? 0} patient(s) assigned to you
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-1 w-full px-2 py-1 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 text-xs font-bold rounded transition-colors"
          >
            Refresh View
          </button>
        </div>

        {/* Reassign patient section */}
        <div className="bg-white p-2 rounded border border-yellow-200">
          <p className="font-semibold text-yellow-900 mb-2">
            📋 Reassign Patient (Dev Only)
          </p>
          <p className="text-yellow-700 text-xs mb-1">
            ⚠️ Only works in development mode
          </p>

          <input
            type="text"
            placeholder="Patient ID (paste)"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-yellow-300 rounded mb-1 bg-yellow-50"
          />

          <input
            type="text"
            placeholder="Target Admin ID (paste)"
            value={targetAdminId}
            onChange={(e) => setTargetAdminId(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-yellow-300 rounded mb-2 bg-yellow-50"
          />

          <button
            onClick={handleReassign}
            disabled={isReassigning}
            className="w-full px-2 py-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white text-xs font-bold rounded transition-colors"
          >
            {isReassigning ? "Reassigning..." : "Reassign Patient"}
          </button>
        </div>

        {/* Help section */}
        <div className="bg-blue-50 p-2 rounded border border-blue-200">
          <p className="font-semibold text-blue-900 text-xs mb-1">💡 Tips</p>
          <ul className="text-blue-800 text-xs space-y-1">
            <li>• Patients auto-assign to dev admin on signup</li>
            <li>• Use reassign tool to test multi-admin scenarios</li>
            <li>• Check console for ⚠️ warnings on operations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

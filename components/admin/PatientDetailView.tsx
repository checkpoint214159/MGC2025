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
import DashboardRenderer from "@/components/recovery/DashboardRenderer";

interface PatientDetailViewProps {
  patientId: string;
}

/**
 * Admin view for detailed patient information with multiple tabs.
 * Shows biometrics, recovery progress, onboarding threads, and baseline assessment.
 */
export function PatientDetailView({ patientId }: PatientDetailViewProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"overview" | "progress" | "threads" | "baseline">(
    "overview"
  );

  // Fetch patient details
  const { data: patient, isLoading: patientLoading, isError: patientError } = useQuery({
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
          <p className="text-red-700 font-semibold">Error loading patient details</p>
        </div>
      </div>
    );
  }

  const tabs: Array<"overview" | "progress" | "threads" | "baseline"> = [
    "overview",
    "progress",
    "threads",
    "baseline",
  ];

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
        <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
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
              <h2 className="text-xl font-semibold mb-4">Biometrics</h2>
              {patient.biometric ? (
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Age:</span> {patient.biometric.age}
                  </p>
                  <p>
                    <span className="font-medium">Sex:</span> {patient.biometric.sex}
                  </p>
                  <p>
                    <span className="font-medium">Treatment:</span>{" "}
                    {patient.biometric.treatment}
                  </p>
                  <p>
                    <span className="font-medium">Surgery Date:</span>{" "}
                    {new Date(patient.biometric.surgeryDate).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">No biometric data available</p>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Profile Summary</h2>
              {patient.profile ? (
                <p className="text-gray-700 leading-relaxed">{patient.profile}</p>
              ) : (
                <p className="text-gray-500">No profile summary available</p>
              )}
            </Card>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === "progress" && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recovery Progress</h2>
            {patient.states && patient.states.length > 0 ? (
              <DashboardRenderer config={patient.states[0] as any} />
            ) : (
              <p className="text-gray-500">No active recovery state found</p>
            )}
          </Card>
        )}

        {/* Threads Tab */}
        {activeTab === "threads" && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Onboarding Conversation</h2>
            {threadsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : threads && threads.length > 0 ? (
              <div className="space-y-4">
                {threads.map((thread) => (
                  <div key={thread.id} className="border-l-4 border-blue-600 pl-4 py-2">
                    <h3 className="font-semibold text-gray-900 mb-3">{thread.title}</h3>
                    <div className="space-y-3">
                      {thread.messages?.map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded ${
                            message.role === "assistant"
                              ? "bg-blue-50 border-l-2 border-blue-400"
                              : "bg-gray-50 border-l-2 border-gray-400"
                          }`}
                        >
                          <p className="text-sm font-semibold text-gray-700 mb-1">
                            {message.role === "assistant" ? "Doctor" : "Patient"}
                          </p>
                          <p className="text-gray-800">{message.content}</p>
                          {message.reasoning && (
                            <p className="text-sm text-gray-600 mt-2 italic">
                              Reasoning: {message.reasoning}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No conversation history available</p>
            )}
          </Card>
        )}

        {/* Baseline Tab */}
        {activeTab === "baseline" && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">ICF Baseline Assessment</h2>
            {patient.baseline && (patient.baseline as any).data ? (
              <div className="space-y-6">
                <p className="text-gray-600">
                  Baseline assessment data: {JSON.stringify((patient.baseline as any).data, null, 2)}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No baseline assessment available</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

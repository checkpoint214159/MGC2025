// app/(app)/dashboard/page.tsx
"use client";

import DashboardRenderer from "@/component/recovery/DashboardRenderer";

// FILLER DATA: Simulating what the LLM would eventually output
const KNEE_PATIENT_CONFIG = [
  {
    id: "ex-1",
    type: "EXERCISE_TRACKER",
    props: {
      name: "Heel Slides",
      goal: "Regain knee flexion",
      reps: "3 sets of 10",
      precaution: "Stop if pain exceeds 4/10",
      intensityColor: "orange"
    }
  },
  {
    id: "ex-2",
    type: "EXERCISE_TRACKER",
    props: {
      name: "Quad Sets",
      goal: "Wake up the thigh muscle",
      reps: "Hold for 5s, 20 times",
      precaution: "Keep leg flat on the bed",
      intensityColor: "blue"
    }
  }
];

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Recovery Plan</h1>
        <p className="text-gray-500">Tailored based on your Knee Replacement surgery.</p>
      </header>

      {/* The Renderer handles everything based on the config passed in */}
      <DashboardRenderer config={KNEE_PATIENT_CONFIG} />
    </div>
  );
}
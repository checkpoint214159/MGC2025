"use client";

import RecoveryExercise from "@/component/ui/RecoveryExercise";

// This page would ideally fetch the FULL list of exercises 
// based on the patient's surgery type
const FULL_EXERCISE_LIST = [
  { name: "Deep Breathing", reps: "10 per hour", intensityColor: "blue"  },
  { name: "Ankle Pumps", reps: "20 per hour", intensityColor: "blue"  },
  { name: "Short Walks", reps: "5 mins every 2 hours", intensityColor: "orange"  },
];

export default function FitnessPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Physical Therapy Plan</h1>
        <p className="text-gray-600">Focus: Improving circulation and lung capacity.</p>
      </header>

      <div className="space-y-4">
        {FULL_EXERCISE_LIST.map((ex, i) => (
          <RecoveryExercise key={i} {...ex} isPreview={false} />
        ))}
      </div>
    </div>
  );
}
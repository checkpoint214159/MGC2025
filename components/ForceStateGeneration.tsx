"use client";

import { useTransition } from 'react';
import { fetchStateAction } from '@/lib/actions';

export default function ForceGenerateButton({ normalizedDate }: {normalizedDate: Date}) {
  const [isPending, startTransition] = useTransition();

  const handleForceGenerate = () => {
    startTransition(async () => {
      try {
        await fetchStateAction(normalizedDate, true); // admin_force=true
      } catch (error) {
        console.error("Failed to force state:", error);
      }
    });
  };

  return (
    <button
      onClick={handleForceGenerate}
      disabled={isPending}
      className={`px-4 py-2 rounded ${isPending ? 'bg-gray-400' : 'bg-blue-600 text-white'}`}
    >
      {isPending ? (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h2 className="text-xl font-semibold">Retrieving goodies...</h2>
        </div>
      ) : (
        "Force Regenerate Plan"
      )}
    </button>
  );
}
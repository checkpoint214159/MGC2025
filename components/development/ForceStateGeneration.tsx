"use client";

import { useTransition } from 'react';
import { useSession } from "next-auth/react";
import { fetchStateAction } from '@/lib/actions';

export default function ForceGenerateButton({ normalizedDate }: {normalizedDate: Date}) {
  const [isPending, startTransition] = useTransition();
  const { update } = useSession();

  const handleForceGenerate = () => {
    startTransition(async () => {
      try {
        await fetchStateAction(normalizedDate, true); // admin_force=true
        await update()
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
        <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span>Processing...</span>
      </div>
      ) : (
        "Force Regenerate Plan"
      )}
    </button>
  );
}
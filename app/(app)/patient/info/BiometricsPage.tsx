import { ensureAction } from "@/lib/utils";
import { updateBiometricsAction, startOnboardingAction } from "@/lib/actions";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Biometrics, BiometricsSchema } from "@/lib/user/schema";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export function BiometricsForm({ onComplete }: { onComplete: (data: any) => void }) {

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Patient Details</h2>
      <p className="text-slate-500 mb-6 text-sm">Please provide your baseline surgery info.</p>
      
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const rawData = Object.fromEntries(formData);
          
          // Basic parsing to match your schema requirements
          const formattedData = {
            ...rawData,
            age: parseInt(rawData.age as string, 10),
            surgeryDate: new Date(rawData.surgeryDate as string),
            // Defaulting these to satisfy your prisma schema if not in form yet
            weightKg: 70, 
            heightCm: 170
          };
          
          onComplete(formattedData);
        }} 
        className="space-y-4"
      >
        {/* Treatment Field */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Treatment / Surgery</label>
          <input 
            name="treatment" 
            required 
            className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Age Field */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Age</label>
            <input 
              name="age" 
              type="number" 
              required 
              className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>

          {/* Sex Field */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sex</label>
            <select 
              name="sex" 
              required 
              className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>

        {/* Surgery Date Field */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date of Surgery</label>
          <input 
            name="surgeryDate" 
            type="date" 
            required 
            className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>

        <button 
          type="submit" 
          className="w-full mt-4 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          Start Assessment
        </button>
      </form>
    </div>
  );
}

export function SubmitBiometricsPage() {
    const [biometrics, setBiometrics] = useState<Biometrics | null>(null);
    const { data: session, status, update } = useSession();
    const queryClient = useQueryClient();
    const router = useRouter()

    async function submitBio(bio: Biometrics) {
        const userId = session?.user?.id!
        const updatedBioResult = await updateBiometricsAction(bio)
        ensureAction(updatedBioResult)
        setBiometrics(BiometricsSchema.parse(updatedBioResult.data))

        // Kick off the onboarding graph — runs until the first interrupt
        // (collect_screening_responses), then returns. Page query re-fetch
        // will pick up the new phase.
        await startOnboardingAction()
        await queryClient.invalidateQueries({
            queryKey: ['onboarding-state', userId]
        });
    }

    return <BiometricsForm onComplete = {submitBio} />
}
import { auth } from "@/auth";
import { getSymptomModule } from "@/lib/state/service";
import { redirect } from "next/navigation";
import SymptomWidget from "./SymptomWidget";

export default async function SymptomsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const symptomModule = await getSymptomModule(session.user.id);
  if (!symptomModule || !symptomModule.progress) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-slate-500 italic">No symptom tracking plan available for today.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Symptom Tracker</h1>
        {symptomModule.summary && (
          <p className="text-sm text-slate-500 mt-1">{symptomModule.summary}</p>
        )}
      </div>
      <SymptomWidget
        moduleId={symptomModule.id}
        emergencyProtocol={symptomModule.emergencyProtocol}
        morning={symptomModule.progress.morning as any}
        evening={symptomModule.progress.evening as any}
      />
    </div>
  );
}

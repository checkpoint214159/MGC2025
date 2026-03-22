import { auth } from "@/auth";
import { getModule } from "@/lib/state/service";
import { redirect } from "next/navigation";
import SleepWidget from "./SleepWidget";

export default async function SleepPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sleepModule = await getModule(session.user.id, 'sleep');
  if (!sleepModule || !sleepModule.progress) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-slate-500 italic">No sleep tracking plan available for today.</p>
      </div>
    );
  }

  const plan = (sleepModule.plan as any[])[0];
  const trackable = (sleepModule.progress.trackables as any[])[0];

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sleep & Rest</h1>
        {sleepModule.summary && (
          <p className="text-sm text-slate-500 mt-1">{sleepModule.summary}</p>
        )}
      </div>
      <SleepWidget
        plan={plan}
        trackable={trackable}
        moduleId={sleepModule.id}
      />
    </div>
  );
}

import { useRouter } from "next/navigation"; // Use router for client-side navigation
import { usePathname } from "next/navigation";
import { State } from "@/lib/state/schemas/state";
import ExercisePreviewCard from "@/components/ui/ExercisePreviewCard";
import NutritionPreviewCard from "@/components/ui/NutritionPreviewCard";
import SymptomPreviewCard from "@/components/ui/SymptomsPreviewCard";
import SleepPreviewCard from "@/components/ui/SleepPreviewCard";

export default function DashboardRenderer({
    config,
}: {
    config: State | null;
}) {
    const router = useRouter();
    const pathname = usePathname(); // Current path: /patient/dashboard

    if (!config) {
        // EmptyCard idiom: dashed border, ink-subtle copy
        return (
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                <p className="text-ink-subtle">
                    No recovery plan found. Please generate one to begin.
                </p>
            </div>
        );
    }

    return (
        /* Responsive Grid Logic:
       - grid-cols-1: Mobile (default)
       - md:grid-cols-2: Tablets/Laptops
       - lg:grid-cols-3: Desktop Monitors
       - items-start: Prevents cards from stretching to match the height of the tallest card
    */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {config.modules.map((module) => {
                if (module.type === "exercise") {
                    return (
                        <ExercisePreviewCard
                            key={module.id}
                            data={module}
                            onClick={() =>
                                router.push(`${pathname}/recovery/exercise`)
                            }
                        />
                    );
                }

                if (module.type === "nutrition") {
                    return (
                        <NutritionPreviewCard
                            key={module.id}
                            data={module}
                            onClick={() =>
                                router.push(`${pathname}/recovery/nutrition`)
                            }
                        />
                    );
                }
                return null;
            })}

            {/* Hardcoded visual modules */}
            <SymptomPreviewCard data={{}} onClick={() => {}} />
            <SleepPreviewCard data={{}} onClick={() => {}} />
        </div>
    );
}

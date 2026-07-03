import { Utensils } from "lucide-react";
import { DashboardCard, CardSlider } from "./DashboardUtils";
import { NutritionModule } from "@/lib/state/schemas/nutrition";

export default function NutritionPreviewCard({
    data,
    onClick,
}: {
    data: NutritionModule;
    onClick: () => void;
}) {
    const previewMacros = ["calories", "fats", "protein", "carbs"];

    const macroPlans: Record<string, number> = {};
    data.plan.forEach((p) => {
        for (const [k, v] of Object.entries(p.data)) {
            if (previewMacros.includes(k)) {
                macroPlans[k] = v.goal;
            }
        }
    });

    const previewMacroVals: Record<string, number> = {};
    data.progress?.trackables.forEach((t) => {
        for (const [k, v] of Object.entries(t.data)) {
            if (previewMacros.includes(k)) {
                previewMacroVals[k] = v.value;
            }
        }
    });

    return (
        <DashboardCard
            title="Nutrition"
            icon={Utensils}
            iconColorClass="bg-attention-soft text-attention-ink"
            onClick={onClick}
        >
            {/* Big main slider — calories */}
            <CardSlider
                label="Total Calories"
                current={previewMacroVals.calories}
                target={macroPlans.calories}
                colorClass="bg-accent"
                size="lg"
            />

            {/* Macro trio — labels differentiate; one restrained accent carries all */}
            <div className="mt-2 grid grid-cols-3 gap-4">
                <CardSlider
                    label="Protein"
                    current={previewMacroVals.protein}
                    target={macroPlans.protein}
                    colorClass="bg-accent"
                    size="sm"
                />
                <CardSlider
                    label="Carbs"
                    current={previewMacroVals.carbs}
                    target={macroPlans.carbs}
                    colorClass="bg-accent"
                    size="sm"
                />
                <CardSlider
                    label="Fats"
                    current={previewMacroVals.fats}
                    target={macroPlans.fats}
                    colorClass="bg-accent"
                    size="sm"
                />
            </div>
        </DashboardCard>
    );
}

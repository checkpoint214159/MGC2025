import { Utensils, Zap, ArrowRight, Flame, Droplets } from "lucide-react";
import { DashboardCard, CardSlider, CardStat } from "./DashboardUtils";


export default function NutritionPreviewCard({ data, onClick }: { data: any, onClick: () => void }) {

  const previewMacros = ['calories', 'fats', 'protein', 'carbs']

  console.log('plan?', data)
  let macroPlans: Record<string, number> = {}
  data.plan?.map(p  => {
    for (const [k, v] of Object.entries(p.data)) {
      if (previewMacros.includes(k)) {
        macroPlans[k] = v.goal
      } 
    }
  })

  let previewMacroVals: Record<string, number> = {} 
  
  data.progress.trackables?.map(t  => {
    for (const [k, v] of Object.entries(t.data)) {
      if (previewMacros.includes(k)) {
        previewMacroVals[k] = v.value
      } 
    }
  })
  console.log('previewMacroVals?', previewMacroVals)
  console.log('macroPlans?', macroPlans)

  return (
    <DashboardCard
    title="Nutrition"
    icon={Utensils}
    iconColorClass="bg-orange-100 text-orange-600"
    accentColorClass="border-l-orange-500"
    onClick={onClick}
  >
    {/* Big Main Slider */}
    <CardSlider label="Total Calories" current={previewMacroVals.calories} target={macroPlans.calories} colorClass="bg-orange-500" size="lg" />

    {/* Multiple Small Sliders in a row */}
    <div className="grid grid-cols-3 gap-4 mt-2">
      <CardSlider label="Protein" current={previewMacroVals.protein} target={macroPlans.protein} colorClass="bg-blue-500" size="sm" />
      <CardSlider label="Carbs" current={previewMacroVals.carbs} target={macroPlans.carbs} colorClass="bg-green-500" size="sm" />
      <CardSlider label="Fats" current={previewMacroVals.fats} target={macroPlans.fats} colorClass="bg-yellow-500" size="sm" />
    </div>

    {/* Random Icon Placement inside the body */}
    {/* <div className="flex items-center gap-2 pt-2">
      <CardStat label="Hydration" value="2.1L" icon={Droplets} />
      <CardStat label="Fiber" value="25g" />
    </div> */}
  </DashboardCard>
  );
}
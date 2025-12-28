"use client"
import { useState } from "react";
import CalorieWidget from "./CalorieWidget";
import MacroWidget from "./MacroWidget";
import MicroWidget from "./MicroWidget";
import { Checkbox } from "@/components/ui/checkbox";
import { NutritionModule } from "@/lib/state/schema"


export default function NutritionDashboard(target: NutritionModule, state: NutritionModule) {
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const getAggregatedValue = (taskId: string) => {
    const base = state.tasks.find(t => t.id === taskId)?.value || 0;
  }
  // 2. Helper to calculate total value for any specific task (e.g., 'protein')
  // const getAggregatedValue = (taskId: string) => {
  //   // Start with whatever is already manually in the state
  //   const baseValue = initialStates.find(t => t.id === taskId)?.value || 0; // TODO: seperate target and goal type?
    
  //   // Add impact from checked items
  //   const checklistBonus = target.checklists
  //     .filter(item => completedIds.includes(item.id))
  //     .reduce((sum, item) => sum + (item.impact[taskId] || 0), 0);
      
  //   return baseValue + checklistBonus;
  // };

  // we let calorie be its own thing
  const calorieTask = target.tasks.find(t => t.id === "calories");
  const macroTasks = target.tasks.filter(t => t.props.type === "macro" && t.id !== "calories");
  const microTasks = target.tasks.filter(t => t.props.type === "micro");

  return (
    <div className="space-y-8">
      {/* Top Section: Calories (Big overarching number) */}
      <CalorieWidget 
        task={calorieTask} 
        currentValue={getAggregatedValue("calories")} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Macros */}
        <MacroWidget 
          tasks={macroTasks} 
          getCurrentValue={getAggregatedValue} 
        />
        
        {/* Right: Micros */}
        <MicroWidget 
          tasks={microTasks} 
          getCurrentValue={getAggregatedValue} 
        />
      </div>

      {/* Bottom Section: Checklists */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Recommended Actions</h3>
        <div className="space-y-3">
          {target.checklists.map(item => (
            <div key={item.id} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 transition-colors">
              <Checkbox 
                id={item.id}
                checked={completedIds.includes(item.id)}
                onCheckedChange={(checked) => {
                  setCompletedIds(prev => checked ? [...prev, item.id] : prev.filter(id => id !== item.id))
                }}
              />
              <div className="flex-1">
                <label htmlFor={item.id} className="font-bold text-slate-800 cursor-pointer">{item.name}</label>
                <p className="text-xs text-slate-500 mt-1">{item.metadata.message}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(item.impact).map(([key, val]) => (
                    val !== 0 && (
                      <span key={key} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                        +{val}{key === 'calories' ? 'kcal' : 'g'} {key}
                      </span>
                    )
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
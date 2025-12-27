"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { DashboardConfig } from "@/components/recovery/registry";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@radix-ui/react-checkbox";
import { Flame, Plus } from "lucide-react";
import { Grid, Box, Section } from "@radix-ui/themes";

interface MacroGoal {
  target: number;
  unit: string;
  label: string;
}

interface MicroGoal {
  name: string;
  target: number;
  unit: string;
  importance: string;
}

interface NutritionPlanProps {
  title: string;
  goalCalories: number;
  macros: Record<string, MacroGoal>; // Dictionary of macros
  micros: MicroGoal[];               // Array of micros
  checklists: { id: string; name: string; calories: number }[];
}

export default function NutritionPlan() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [manualCalories, setManualCalories] = useState<number>(0);
  const [tempInput, setTempInput] = useState<string>("");

  useEffect(() => {
    const config = session?.user?.dashboardConfig as DashboardConfig;
    const checklists = config?.modules?.nutrition?.checklists;
    
    if (checklists) {
      setItems(checklists.map(item => ({ ...item, completed: false })));
    }
  }, [session]);

  if (status === "loading") return <p>Loading...</p>;
  if (!session) return <p>Access Denied</p>;

  const userConfig = session.user.dashboardConfig as DashboardConfig
  const nutritionModule = userConfig?.modules?.nutrition;
  // console.log('userConfig', userConfig)
  // console.log('nutritionModule', nutritionModule)
  
  const checklistCals = items
    .filter(item => item.completed)
    .reduce((total, item) => total + item.calories, 0);

  const totalConsumed = checklistCals + manualCalories;
  const goalCalories = nutritionModule?.goalCalories;
  const progressPercentage = goalCalories
    ? Math.min((totalConsumed / goalCalories ) * 100, 100)
    : 0;  // god i just love js syntax. just so much clearer than java right
    // me when im sarcastic

  const manualCaloriesAdd = () => {
    const val = parseInt(tempInput);
    if (!isNaN(val)) {
      setManualCalories(prev => prev + val);
      setTempInput("");
    }
  };

  // Determine progress bar color based on percentage
  const getProgressBarColor = (progress: number) => {
    if (progress < 50) return "#ef4444"; // red-500
    if (progress < 80) return "#f59e0b"; // amber-500
    return "#22c55e"; // green-500
  };

  // const handleCheck = (id: string, checked: boolean) => {
  //   setFoodItems(prevItems =>
  //     prevItems.map(item =>
  //       item.id === id ? { ...item, completed: checked } : item
  //     )
  //   );
  //   // In a real app, you'd send this update to your backend here
  //   // e.g., useMutation from TanStack Query
  // };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-6 rounded-lg shadow-md border border-gray-100 space-y-6"
    >
      <h1 className="text-xl font-semibold mb-4 text-gray-800">Your Daily Nutrition</h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Calories</h3>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-600">
              Consumed: <span className="font-bold text-gray-800">{totalConsumed}</span> / {goalCalories} kcal
            </p>
            <span className={`text-sm font-semibold px-2 py-0.5 rounded-md ${
              progressPercentage >= 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
            indicatorColor={getProgressBarColor(progressPercentage)} // Custom prop for dynamic color
          />
        </div>
      
        <div className="space-y-4 mb-8">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recommended Actions</h4>
          {items.map(item => (
            <div key={item.id} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg">
              <Checkbox 
                  id={item.id} 
                  checked={item.completed} 
                  onCheckedChange={(checked) => {
                      setItems(items.map(i => i.id === item.id ? {...i, completed: !!checked} : i))
                  }}
              />
              <label htmlFor={item.id} className="flex-1 text-sm font-medium text-slate-700">
                {item.name}
              </label>
              <span className="text-xs font-bold text-slate-400">+{item.calories}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Log Additional Food</h4>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Flame className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                type="number" 
                placeholder="Enter calories..." 
                className="pl-9"
                value={tempInput}
                onChange={(e) => setTempInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && manualCaloriesAdd()}
              />
            </div>
            <button 
              onClick={manualCaloriesAdd}
              className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          {manualCalories > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                  Manually logged: {manualCalories} kcal today
              </p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* MACROS (Takes up 2/3 of the space on desktop) */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-bold text-lg">Macronutrients</h3>
          <div className="grid grid-cols-3 gap-4">
              {/* Map your Macros here */}
          </div>
        </div>

        {/* MICROS (Takes up 1/3 of the space on desktop) */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Micronutrients</h3>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="space-y-3">
              {nutritionModule?.micros.map((micro) => (
                <div key={micro.name} className="flex justify-between items-end border-b border-gray-200 pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{micro.name}</p>
                    <p className="text-[10px] text-gray-500 italic">{micro.importance}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold">
                      {micro.target}
                    </span>
                    <span className="text-[10px] ml-1 text-gray-400">{micro.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
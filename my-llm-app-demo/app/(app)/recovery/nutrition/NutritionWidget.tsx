"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Plus, Flame } from "lucide-react";

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

export default function NutritionPlan({ 
  title, 
  goalCalories, 
  macros, 
  micros = [], 
  checklists = [] 
}: NutritionPlanProps) {
  const [items, setItems] = useState(
    checklists.map(item => ({ ...item, completed: false }))
  );

  // manual tracking
  const [manualCalories, setManualCalories] = useState<number>(0);
  const [tempInput, setTempInput] = useState<string>("");

  // from checklist of calories
  const checklistCals = items
    .filter(item => item.completed)
    .reduce((total, item) => total + item.calories, 0);

  console.log('goalcalories', goalCalories)
  const totalConsumed = checklistCals + manualCalories;
  const progressPercentage = Math.min((totalConsumed / goalCalories) * 100, 100);

  const handleManualAdd = () => {
    const val = parseInt(tempInput);
    if (!isNaN(val)) {
      setManualCalories(prev => prev + val);
      setTempInput(""); // Reset input
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
      className="bg-white p-6 rounded-lg shadow-md border border-gray-100"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Your Daily Nutrition</h3>

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

      {/* Checklist Section */}
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

      {/* Manual Entry Section */}
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
              onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
            />
          </div>
          <button 
            onClick={handleManualAdd}
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
    </motion.div>
  );
}
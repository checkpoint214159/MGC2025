"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

// Define the shape of a single food item
interface FoodItem {
  id: string;
  name: string;
  calories: number;
  completed: boolean;
}

interface NutritionPlanProps {
  goalCalories: number; // e.g., 2000
  initialFoodItems: Omit<FoodItem, 'completed'>[]; // Food items without the completed state
}

export default function NutritionPlan({ goalCalories, initialFoodItems }: NutritionPlanProps) {
  // Initialize food items with a default 'completed: false' state
  const [foodItems, setFoodItems] = useState<FoodItem[]>(
    initialFoodItems.map(item => ({ ...item, completed: false }))
  );

  // Calculate current consumed calories
  const consumedCalories = foodItems
    .filter(item => item.completed)
    .reduce((total, item) => total + item.calories, 0);

  // Calculate progress percentage
  const progressPercentage = Math.min((consumedCalories / goalCalories) * 100, 100);

  // Determine progress bar color based on percentage
  const getProgressBarColor = (progress: number) => {
    if (progress < 50) return "#ef4444"; // red-500
    if (progress < 80) return "#f59e0b"; // amber-500
    return "#22c55e"; // green-500
  };

  const handleCheck = (id: string, checked: boolean) => {
    setFoodItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, completed: checked } : item
      )
    );
    // In a real app, you'd send this update to your backend here
    // e.g., useMutation from TanStack Query
  };

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
            Consumed: <span className="font-bold text-gray-800">{consumedCalories}</span> / {goalCalories} kcal
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

      <ul className="space-y-3">
        {foodItems.map(item => (
          <motion.li
            key={item.id}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 10 }}
            className="flex items-center space-x-3"
          >
            <Checkbox
              id={item.id}
              checked={item.completed}
              onCheckedChange={(checked: boolean) => handleCheck(item.id, checked)}
            />
            <label
              htmlFor={item.id}
              className={`flex-1 text-base font-medium transition-colors cursor-pointer ${
                item.completed ? "line-through text-gray-400" : "text-gray-700"
              }`}
            >
              {item.name} <span className="text-sm text-gray-500">({item.calories} kcal)</span>
            </label>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

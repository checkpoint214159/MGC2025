"use client";

import { BaseQuestion } from "@/lib/llm/schemas/base";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DynamicInputsProps {
  question: BaseQuestion;
  onAnswer: (val: string) => void;
  loading: boolean;
  fade?: boolean // Added this
}

export function AnimatedQuestionWrapper({ children, id }: { children: React.ReactNode, id: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.95 }} // "Slides upwards"
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function ThinkingCard() {
  return (
    <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-50 w-full animate-pulse">
      <div className="h-4 w-24 bg-slate-100 rounded-full mb-6" />
      <div className="h-8 w-full bg-slate-50 rounded-lg mb-4" />
      <div className="h-8 w-2/3 bg-slate-50 rounded-lg mb-10" />
      <div className="space-y-3">
        <div className="h-14 w-full bg-slate-50 rounded-2xl" />
        <div className="h-14 w-full bg-slate-50 rounded-2xl" />
      </div>
    </div>
  );
}

export function DynamicQuestionCard({ question, onAnswer, loading, fade }: { 
  question: BaseQuestion | null, 
  onAnswer: (val: string) => void,
  loading: boolean,
  fade?: boolean
}) {
  if (!question) return null;

  if (question.inputType === 'terminateQuestioning') {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-50 text-center space-y-4">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-100 rounded-full mb-4 flex items-center justify-center">
             <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Assessment Complete</h3>
          <p className="text-slate-500">Developing your recovery protocol...</p>
        </div>
      </div>
    );
  }

  return (
      <AnimatedQuestionWrapper id={question.questionText}>
        <div className={`
          bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-blue-100/50 border border-slate-100
          ${loading ? 'opacity-40 pointer-events-none scale-[0.98]' : 'scale-100'}
          transition-all duration-500
        `}>
          {/* Header Tags */}
          <div className="flex gap-2 mb-6">
            <span className="bg-blue-50 text-blue-600 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
              {question.metadata.intent}
            </span>
          </div>

          <h3 className="text-2xl font-semibold text-slate-900 leading-tight mb-10">
            {question.questionText}
          </h3>
          
          {!fade && (
            <DynamicInputs 
              question={question} 
              onAnswer={onAnswer} 
              loading={loading} 
            />
          )}
          
        </div>
      </AnimatedQuestionWrapper>
    );
  }

export function DynamicInputs({ question, onAnswer, loading }: DynamicInputsProps) {
  // Internal state for inputs - resets automatically when 'key' changes in parent
  const [textValue, setTextValue] = useState("");
  const [sliderValue, setSliderValue] = useState(question.metadata.sliderMin ?? 0);

  // Sync slider if metadata changes
  useEffect(() => {
    setSliderValue(question.metadata.sliderMin ?? 0);
    setTextValue(""); // Clear text for new question
  }, [question]);

  return (
    <div className="space-y-4">
      {question.inputType === "choice" && (
        <div className="grid gap-3">
          {question.options?.map((opt) => (
            <button
              key={opt}
              disabled={loading}
              onClick={() => onAnswer(opt)}
              className="w-full text-left p-5 rounded-2xl border border-slate-100 bg-slate-50 
                         hover:bg-blue-600 hover:text-white hover:border-blue-600 
                         hover:shadow-lg hover:shadow-blue-100 transition-all font-medium"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.inputType === "text" && (
        <div className="space-y-4">
          <textarea
            autoFocus
            className="w-full p-5 rounded-2xl border border-slate-200 bg-slate-50 
                       focus:ring-4 focus:ring-blue-100 focus:border-blue-500 
                       outline-none transition-all min-h-[140px] resize-none"
            placeholder="Type your response here..."
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
          />
          <button
            disabled={!textValue.trim() || loading}
            onClick={() => onAnswer(textValue)}
            className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold 
                       shadow-xl shadow-blue-200 hover:bg-blue-700 
                       disabled:bg-slate-200 disabled:shadow-none transition-all"
          >
            Continue
          </button>
        </div>
      )}

      {question.inputType === "slider" && (
        <div className="space-y-8 py-4">
          <div className="text-center relative">
            <span className="text-6xl font-black text-blue-600 tracking-tighter">
              {sliderValue}
            </span>
          </div>
          
          <input 
            type="range" 
            min={question.metadata.sliderMin ?? 0} 
            max={question.metadata.sliderMax ?? 10} 
            value={sliderValue}
            onChange={(e) => setSliderValue(parseInt(e.target.value))}
            className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          
          <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1 uppercase tracking-widest">
            <span>{question.metadata.sliderLabels?.[0] ?? "Low"}</span>
            <span>{question.metadata.sliderLabels?.[1] ?? "Moderate"}</span>
            <span>{question.metadata.sliderLabels?.[2] ?? "High"}</span>
          </div>

          <button 
            onClick={() => onAnswer(sliderValue.toString())}
            className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold 
                       shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            Confirm Score
          </button>
        </div>
      )}
    </div>
  );
}

  // return (
  //   <div className={`bg-white p-8 rounded-3xl shadow-xl border border-blue-50 transition-all ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
  //     <div className="flex items-center gap-2 mb-4">
  //       <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-tighter">
  //         {question.metadata.intent}
  //       </span>
  //       {question.metadata.urgency && (
  //         <span className="bg-red-100 text-red-600 text-[10px] px-2 py-1 rounded-full font-bold">URGENT</span>
  //       )}
  //     </div>

  //     <h3 className="text-xl font-medium text-slate-900 leading-tight mb-8">
  //       {question.questionText}
  //     </h3>

      
  //   </div>
  // );

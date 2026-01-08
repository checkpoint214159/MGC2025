import { BaseQuestion } from "@/lib/llm/schemas/base";
import { useState } from "react";

export function DynamicQuestionCard({ question, onAnswer, loading }: { 
  question: BaseQuestion | null, 
  onAnswer: (val: string) => void,
  loading: boolean 
}) {
  if (!question) return null;
  const [textValue, setTextValue] = useState("");
  const [sliderValue, setSliderValue] = useState(question.metadata.sliderMin ?? 0)

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
    <div className={`bg-white p-8 rounded-3xl shadow-xl border border-blue-50 transition-all ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-tighter">
          {question.metadata.intent}
        </span>
        {question.metadata.urgency && (
          <span className="bg-red-100 text-red-600 text-[10px] px-2 py-1 rounded-full font-bold">URGENT</span>
        )}
      </div>

      <h3 className="text-xl font-medium text-slate-900 leading-tight mb-8">
        {question.questionText}
      </h3>

      <div className="space-y-3">
        {question.inputType === "choice" && question.options?.map(opt => (
          <button
            key={opt}
            onClick={() => onAnswer(opt)}
            className="w-full text-left p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all font-medium"
          >
            {opt}
          </button>
        ))}

        {question.inputType === "text" && (
          <div className="space-y-4">
            <textarea
              className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[120px]"
              placeholder="Type your response here..."
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
            />
            <button
              disabled={!textValue.trim() || loading}
              onClick={() => onAnswer(textValue)}
              className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {question.inputType === "slider" && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-4xl font-black text-blue-600">{sliderValue}</span>
            </div>
            
            <input 
              type="range" 
              min={question.metadata.sliderMin ?? 0} 
              max={question.metadata.sliderMax ?? 10} 
              value={sliderValue}
              onChange={(e) => setSliderValue(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            
            <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1 uppercase tracking-widest">
              <span>{question.metadata.labels?.[0] ?? "Low"}</span>
              <span>{question.metadata.labels?.[1] ?? "Moderate"}</span>
              <span>{question.metadata.labels?.[2] ?? "High"}</span>
            </div>

            <button 
              onClick={() => onAnswer(sliderValue.toString())}
              className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
            >
              Confirm Score
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
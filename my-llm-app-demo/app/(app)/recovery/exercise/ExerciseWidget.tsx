interface ExerciseProps {
  name: string;
  goal: string;
  reps: string;
  precaution: string;
  intensityColor: 'blue' | 'orange' | 'red'; 
  isPreview?: boolean;
}

export default function RecoveryExerciseRenderer({ 
  name, 
  goal, 
  reps, 
  precaution, 
  intensityColor,
  isPreview = false
}: ExerciseProps) {
  return (
    <div className={`p-4 rounded-xl border-2 mb-4 bg-white shadow-sm transition-all
      ${isPreview ? 'hover:border-blue-300' : 'border-gray-100'}`}>
      
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg text-gray-900">{name}</h3>
        {!isPreview && (
           <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ...`}>
             {intensityColor}
           </span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-2">{goal}</p>
      
      {!isPreview && (
        <>
          <div className="bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300 mb-4">
            <span className="text-xs font-semibold text-gray-400 uppercase">Prescription</span>
            <p className="text-gray-800 font-mono text-sm">{reps}</p>
          </div>

          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded text-xs">
            <span>⚠️</span>
            <strong>Precaution:</strong> {precaution}
          </div>
        </>
      )}

      {isPreview && (
        <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">
          Tap to start session →
        </span>
      )}

      <input
        type="checkbox"
        id="complete"
        className="w-5 h-5 rounded border-gray-400 text-green-600 focus:ring-green-500"
        onChange={(e) => console.log("Task is done:", e.target.checked)}
      />
      <label htmlFor="complete" className="text-sm font-medium text-green-800">
        Mark as completed today
      </label>

    </div>
    
    
  );
}
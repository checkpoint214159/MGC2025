"use client"

import { useState } from "react";
import { SymptomCheckItem, SymptomLogEntry, SymptomPeriod } from "@/lib/state/schemas/symptoms";
import {
  updateSymptomChecklistAction,
  addSymptomLogAction,
  completeSymptomPeriodAction,
} from "@/lib/actions";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { AlertTriangle, HeartPulse, Plus, CheckCircle2, Clock } from "lucide-react";

interface Props {
  moduleId: string;
  emergencyProtocol: string;
  morning: SymptomPeriod;
  evening: SymptomPeriod;
}

const BODY_SITES = [
  "Incision site", "Abdomen", "Chest", "Back", "Head",
  "Legs", "Arms", "General/Whole body", "Other"
];

export default function SymptomWidget({ moduleId, emergencyProtocol, morning: initialMorning, evening: initialEvening }: Props) {
  const [morning, setMorning] = useState<SymptomPeriod>(initialMorning);
  const [evening, setEvening] = useState<SymptomPeriod>(initialEvening);

  const defaultTab = new Date().getHours() < 14 ? 'morning' : 'evening';
  const [activeTab, setActiveTab] = useState<'morning' | 'evening'>(defaultTab);

  const [logSite, setLogSite] = useState(BODY_SITES[0]);
  const [logDescription, setLogDescription] = useState("");
  const [logIntensity, setLogIntensity] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  const currentPeriod = activeTab === 'morning' ? morning : evening;
  const setCurrentPeriod = activeTab === 'morning' ? setMorning : setEvening;

  async function handleChecklistToggle(itemId: string, response: boolean) {
    setCurrentPeriod(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item.id === itemId ? { ...item, response } : item
      ),
    }));

    const result = await updateSymptomChecklistAction(moduleId, activeTab, itemId, response);
    if (!result.success) {
      setCurrentPeriod(prev => ({
        ...prev,
        checklist: prev.checklist.map(item =>
          item.id === itemId ? { ...item, response: !response } : item
        ),
      }));
    }
  }

  async function handleAddLog() {
    if (!logDescription.trim()) return;
    setIsSaving(true);

    const entry: SymptomLogEntry = {
      id: `log-${Date.now()}`,
      site: logSite,
      description: logDescription,
      intensity: logIntensity,
      timestamp: new Date().toISOString(),
    };

    const result = await addSymptomLogAction(moduleId, activeTab, entry);
    if (result.success) {
      setCurrentPeriod(prev => ({
        ...prev,
        logs: [...prev.logs, entry],
      }));
      setLogDescription("");
      setLogIntensity(5);
    }
    setIsSaving(false);
  }

  async function handleCompletePeriod() {
    const result = await completeSymptomPeriodAction(moduleId, activeTab);
    if (result.success) {
      setCurrentPeriod(prev => ({ ...prev, completed: true }));
    }
  }

  const getIntensityColor = (intensity: number) => {
    if (intensity <= 3) return "#22c55e";
    if (intensity <= 6) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="space-y-6">
      {/* Emergency Protocol Banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-bold text-red-800">Emergency Protocol</p>
          <p className="text-xs text-red-700 mt-1">{emergencyProtocol}</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2">
        {(['morning', 'evening'] as const).map(tab => {
          const period = tab === 'morning' ? morning : evening;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === tab
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'morning' ? '\u{1F305}' : '\u{1F319}'} {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {period.completed ? (
                <span className="text-[10px] bg-green-400/30 text-green-100 px-2 py-0.5 rounded-full">Done</span>
              ) : (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                }`}>Due</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Checklist Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-rose-50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <HeartPulse className="text-rose-600" size={18} />
            Daily Checks
          </h3>
        </div>
        <div className="divide-y divide-slate-50">
          {currentPeriod.checklist.map(item => (
            <div
              key={item.id}
              className={`p-4 flex items-center justify-between gap-3 ${
                item.critical ? 'border-l-4 border-l-red-500' : ''
              }`}
            >
              <div className="flex items-start gap-2 flex-1">
                {item.critical && <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={14} />}
                <p className={`text-sm ${item.critical ? 'font-semibold text-red-900' : 'text-slate-700'}`}>
                  {item.label}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleChecklistToggle(item.id, true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    item.response === true
                      ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >Yes</button>
                <button
                  onClick={() => handleChecklistToggle(item.id, false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    item.response === false
                      ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >No</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logged Symptoms */}
      {currentPeriod.logs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Logged Symptoms ({currentPeriod.logs.length})</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {currentPeriod.logs.map(log => (
              <div key={log.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">{log.site}</span>
                    <p className="text-sm text-slate-700">{log.description}</p>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Intensity:</span>
                  <div className="flex-1">
                    <Progress
                      value={log.intensity * 10}
                      className="h-1.5"
                      indicatorColor={getIntensityColor(log.intensity)}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600">{log.intensity}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log a Symptom Form */}
      {!currentPeriod.completed && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Plus size={14} /> Log a Symptom
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Body Site</label>
              <select
                value={logSite}
                onChange={(e) => setLogSite(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                {BODY_SITES.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
              <textarea
                value={logDescription}
                onChange={(e) => setLogDescription(e.target.value)}
                placeholder="Describe the symptom..."
                rows={2}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Intensity: {logIntensity}/10
              </label>
              <Slider
                value={[logIntensity]}
                max={10}
                step={1}
                onValueChange={(vals) => setLogIntensity(vals[0])}
                className="py-2"
              />
            </div>
            <button
              onClick={handleAddLog}
              disabled={!logDescription.trim() || isSaving}
              className="w-full py-2.5 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all"
            >
              {isSaving ? "Saving..." : "Add Log Entry"}
            </button>
          </div>
        </div>
      )}

      {/* Complete Period Button */}
      {!currentPeriod.completed && (
        <button
          onClick={handleCompletePeriod}
          className="w-full py-3 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-700 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} />
          Complete {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Check-in
        </button>
      )}

      {currentPeriod.completed && (
        <div className="text-center py-4 text-green-600 font-bold text-sm flex items-center justify-center gap-2">
          <CheckCircle2 size={16} />
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} check-in completed
        </div>
      )}
    </div>
  );
}

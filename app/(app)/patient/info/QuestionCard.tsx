"use client";

import { BaseQuestion } from "@/lib/llm/schemas/base";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/primitives";

interface DynamicInputsProps {
  question: BaseQuestion;
  onAnswer: (val: string) => void;
  loading: boolean;
  fade?: boolean;
}

export function AnimatedQuestionWrapper({ children, id }: { children: React.ReactNode; id: string }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -24 }}
        transition={{ duration: reduce ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function ThinkingCard() {
  return (
    <div
      className="w-full rounded-xl border border-border bg-surface p-7 md:p-8"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Thinking…</span>
      <div className="animate-pulse space-y-4">
        <div className="h-3 w-24 rounded-full bg-surface-sunken" />
        <div className="h-6 w-full rounded bg-surface-sunken" />
        <div className="h-6 w-2/3 rounded bg-surface-sunken" />
        <div className="space-y-2 pt-3">
          <div className="h-12 w-full rounded-md bg-surface-sunken" />
          <div className="h-12 w-full rounded-md bg-surface-sunken" />
        </div>
      </div>
    </div>
  );
}

export function DynamicQuestionCard({
  question,
  onAnswer,
  loading,
  fade,
}: {
  question: BaseQuestion | null;
  onAnswer: (val: string) => void;
  loading: boolean;
  fade?: boolean;
}) {
  if (!question) return null;

  if (question.inputType === "terminateQuestioning") {
    return (
      <div className="rounded-xl border border-border bg-surface p-7 text-center md:p-8" aria-live="polite">
        <div className="mx-auto mb-4 grid size-10 place-items-center rounded-full bg-accent-soft">
          <span className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
        <h3 className="text-[19px] font-semibold text-ink">Assessment complete</h3>
        <p className="mt-1 text-[14px] text-ink-muted">Preparing your recovery plan…</p>
      </div>
    );
  }

  return (
    <AnimatedQuestionWrapper id={question.questionText}>
      <div
        className={`rounded-xl border border-border bg-surface p-7 transition-opacity duration-200 md:p-8 ${
          loading ? "pointer-events-none" : ""
        }`}
      >
        <span className="inline-flex items-center rounded-full bg-surface-sunken px-2.5 py-1 text-[12px] font-medium text-ink-muted">
          {question.metadata.intent}
        </span>
        <h2 className="mt-4 text-[22px] font-semibold leading-snug text-ink">{question.questionText}</h2>
        {!fade && (
          <div className="mt-6">
            <DynamicInputs question={question} onAnswer={onAnswer} loading={loading} />
          </div>
        )}
      </div>
    </AnimatedQuestionWrapper>
  );
}

export function DynamicInputs({ question, onAnswer, loading }: DynamicInputsProps) {
  // Inputs reset on question change because the parent wrapper keys on the
  // question text, remounting this component.
  const [textValue, setTextValue] = useState("");
  const [sliderValue, setSliderValue] = useState(question.metadata.sliderMin ?? 0);

  return (
    <div className="space-y-4">
      {question.inputType === "choice" && (
        <div className="grid gap-2.5">
          {question.options?.map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={loading}
              onClick={() => onAnswer(opt)}
              className="w-full rounded-md border border-border bg-surface px-4 py-3.5 text-left text-[16px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent-ink disabled:opacity-50"
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
            className="min-h-[140px] w-full resize-none rounded-md border border-border-strong bg-surface px-3 py-2.5 text-[16px] text-ink placeholder:text-ink-subtle"
            placeholder="Type your answer here…"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
          />
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!textValue.trim() || loading}
            onClick={() => onAnswer(textValue)}
          >
            Continue
          </Button>
        </div>
      )}

      {question.inputType === "slider" && (
        <div className="space-y-6 py-2">
          <div className="text-center">
            <span className="text-[32px] font-semibold tabular-nums text-accent-ink">{sliderValue}</span>
          </div>
          <input
            type="range"
            min={question.metadata.sliderMin ?? 0}
            max={question.metadata.sliderMax ?? 10}
            value={sliderValue}
            onChange={(e) => setSliderValue(parseInt(e.target.value))}
            aria-label={question.questionText}
            aria-valuetext={String(sliderValue)}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-sunken accent-[var(--accent)]"
          />
          <div className="flex justify-between text-[12px] font-medium text-ink-subtle">
            <span>{question.metadata.sliderLabels?.[0] ?? "Low"}</span>
            <span>{question.metadata.sliderLabels?.[1] ?? "Moderate"}</span>
            <span>{question.metadata.sliderLabels?.[2] ?? "High"}</span>
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={() => onAnswer(sliderValue.toString())}>
            Confirm
          </Button>
        </div>
      )}
    </div>
  );
}

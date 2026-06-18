import { ReactNode, HTMLAttributes, ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";
import { Lightbulb, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Nudge } from "@/lib/engagement";

/* ---------- Card ---------- */

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "hero" | "sunken" | "outline";
  interactive?: boolean;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = "default", interactive, ...rest },
  ref
) {
  const base = "rounded-lg border border-border bg-surface";
  const variants: Record<string, string> = {
    default: "p-5",
    hero: "rounded-xl border-border bg-surface p-7 md:p-8",
    sunken: "bg-surface-sunken p-5",
    outline: "bg-transparent p-5",
  };
  const interactiveCls = interactive
    ? "transition-shadow duration-150 ease-[var(--ease-out-quart)] hover:shadow-md cursor-pointer"
    : "";
  return <div ref={ref} className={cn(base, variants[variant], interactiveCls, className)} {...rest} />;
});

/* ---------- Chip ---------- */

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "progress" | "attention" | "critical";
  size?: "sm" | "md";
};

export function Chip({ tone = "neutral", size = "sm", className, ...rest }: ChipProps) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-sunken text-ink-muted",
    accent: "bg-accent-soft text-accent-ink",
    progress: "bg-progress-soft text-progress-ink",
    attention: "bg-attention-soft text-attention-ink",
    critical: "bg-critical-soft text-critical-ink",
  };
  const sizes = {
    sm: "text-[12px] px-2 py-0.5",
    md: "text-[13px] px-2.5 py-1",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        tones[tone],
        sizes[size],
        className
      )}
      {...rest}
    />
  );
}

/* ---------- Button ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref
) {
  const sizes = {
    sm: "h-9 px-3 text-[14px]",
    md: "h-11 px-4 text-[15px]",
    lg: "h-12 px-5 text-[16px]",
  };
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-accent text-ink-inverse hover:bg-accent-hover active:translate-y-[0.5px]",
    secondary: "bg-surface text-ink border border-border-strong hover:bg-surface-sunken",
    ghost: "bg-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink",
    destructive: "bg-critical text-ink-inverse hover:opacity-90",
  };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium",
        "transition-[background,color,transform] duration-150 ease-[var(--ease-out-quart)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizes[size],
        variants[variant],
        className
      )}
      {...rest}
    >
      {loading && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
});

/* ---------- Stat ---------- */

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-[12px] font-medium text-ink-subtle uppercase tracking-wide">{label}</span>
      <span className="text-[20px] font-semibold text-ink leading-tight tabular-nums">{value}</span>
      {hint && <span className="text-[13px] text-ink-muted">{hint}</span>}
    </div>
  );
}

/* ---------- Progress bar ---------- */

export function ProgressBar({
  value,
  max,
  tone = "accent",
  size = "md",
  showLabel = false,
  label,
}: {
  value: number;
  max: number;
  tone?: "accent" | "progress" | "attention" | "critical";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const heights = { sm: "h-1", md: "h-1.5", lg: "h-2.5" };
  const tones: Record<string, string> = {
    accent: "bg-accent",
    progress: "bg-progress",
    attention: "bg-attention",
    critical: "bg-critical",
  };
  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1.5 flex justify-between items-baseline">
          <span className="text-[13px] text-ink-muted">{label}</span>
          <span className="text-[13px] text-ink tabular-nums">
            {Math.round(value)}
            <span className="text-ink-subtle"> / {Math.round(max)}</span>
          </span>
        </div>
      )}
      <div
        className={cn("w-full bg-surface-sunken rounded-full overflow-hidden", heights[size])}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemax={Math.round(max)}
        aria-valuemin={0}
      >
        <div
          className={cn("h-full transition-[width] duration-500 ease-[var(--ease-out-quart)] rounded-full", tones[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- StreakRing (consecutive-day streak, cap 7) ---------- */

export function StreakRing({
  count,
  atCap,
  size = 76,
}: {
  count: number;
  atCap: boolean;
  size?: number;
}) {
  const segments = 7;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const gap = atCap ? 0 : circumference * 0.045;
  const segLen = (circumference - gap * segments) / segments;
  const label = atCap ? "7-day streak" : count === 0 ? "Start your streak" : `${count}-day streak`;
  const sub = atCap ? "Well held." : count === 0 ? "One day at a time." : "Keep it gentle.";

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          role="img"
          aria-label={atCap ? "7 of 7 day streak — well held" : `${count} of 7 day streak`}
        >
          {Array.from({ length: segments }).map((_, i) => {
            const filled = i < count;
            const offset = i * (segLen + gap);
            return (
              <circle
                key={i}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={filled ? "var(--progress)" : "var(--border)"}
                strokeWidth={stroke}
                strokeLinecap={atCap ? "butt" : "round"}
                strokeDasharray={`${segLen} ${circumference - segLen}`}
                strokeDashoffset={-offset}
                style={{ transition: "stroke 600ms var(--ease-out-quart)" }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-[22px] font-bold text-ink tabular-nums leading-none">{count}</span>
        </div>
      </div>
      <div className="leading-tight">
        <div className="text-[14px] font-medium text-ink">{label}</div>
        <div className="text-[12px] text-ink-muted">{sub}</div>
      </div>
    </div>
  );
}

/* ---------- NudgeInline (neutral, dismissible, non-clinical) ---------- */

export function NudgeInline({ nudge, onDismiss }: { nudge: Nudge; onDismiss?: () => void }) {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-md border border-border bg-surface-sunken px-4 py-3">
      <Lightbulb size={18} strokeWidth={1.75} className="shrink-0 text-ink-subtle" />
      <p className="flex-1 text-[14px] text-ink-muted">{nudge.copy}</p>
      {nudge.action && (
        <Link
          href={nudge.action.href}
          className="shrink-0 text-[13px] font-medium text-accent-ink hover:underline"
        >
          {nudge.action.label}
        </Link>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="grid size-11 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-surface hover:text-ink"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

/* ---------- EmptyState (dashed, single action) ---------- */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-sunken/40 p-8 text-center">
      <h3 className="text-[19px] font-semibold text-ink">{title}</h3>
      {body && <p className="mx-auto mt-2 max-w-[42ch] text-[14px] text-ink-muted">{body}</p>}
      {action &&
        (action.href ? (
          <Link href={action.href} className="mt-5 inline-block">
            <Button size="sm" variant="secondary">{action.label}</Button>
          </Link>
        ) : (
          <Button size="sm" variant="secondary" className="mt-5" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}

/* ---------- CaregiverBanner ---------- */

export function CaregiverBanner({ patientName, onExit }: { patientName: string; onExit?: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-md bg-accent-soft px-4 py-2.5 text-[13px] text-accent-ink">
      <Users size={16} strokeWidth={1.75} className="shrink-0" />
      <span className="flex-1">
        Caregiver view — read-only. Helping <span className="font-semibold">{patientName}</span>.
      </span>
      {onExit && (
        <button type="button" onClick={onExit} className="shrink-0 font-medium hover:underline">
          Exit
        </button>
      )}
    </div>
  );
}

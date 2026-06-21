"use client";

import { LifeBuoy, Phone, ChevronDown } from "lucide-react";

/**
 * A calm, always-available "reach your care team" affordance for older cancer
 * patients and their caregivers. Reassuring by default; the red-flag list is tucked
 * in a disclosure so it never alarms on sight. Only the true emergency line uses red.
 */
const RED_FLAGS = [
  "A fever above 38°C (100.4°F), or shaking chills",
  "Heavy bleeding, or a wound that opens, leaks, or smells",
  "Tummy pain that is severe or getting worse",
  "Being sick (vomiting) repeatedly, or unable to keep fluids down",
  "No wind or bowel movement for a long stretch, with a swollen tummy",
];

export function CareTeamCard({ phone = "tel:+6500000000" }: { phone?: string }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-ink">
          <LifeBuoy size={20} strokeWidth={1.75} />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h2 className="text-[17px] font-semibold text-ink">Not feeling right?</h2>
            <p className="mt-0.5 text-[15px] text-ink-muted">
              Trust your gut. It&apos;s always okay to call your care team — they would much rather hear from you.
            </p>
          </div>

          <a
            href={phone}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-4 text-[16px] font-medium text-ink-inverse transition-colors hover:bg-accent-hover"
          >
            <Phone size={18} strokeWidth={1.75} /> Call your care team
          </a>

          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[15px] font-medium text-accent-ink">
              When should I call straight away?
              <ChevronDown size={16} strokeWidth={2} className="transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2 rounded-md bg-attention-soft/50 p-4">
              <p className="text-[15px] text-ink">Call your care team straight away if you notice:</p>
              <ul className="mt-2.5 space-y-2">
                {RED_FLAGS.map((flag) => (
                  <li key={flag} className="flex gap-2.5 text-[15px] text-ink-muted">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-attention" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[15px] text-ink">
                Chest pain or trouble breathing is an emergency — call{" "}
                <span className="font-semibold text-critical">995</span> right away.
              </p>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

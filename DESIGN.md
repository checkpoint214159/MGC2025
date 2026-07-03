# Design

## Theme

Calm, clinical, kind. Warm cream/sand surfaces with deep slate ink, anchored by one soft cornflower-blue accent. Generous space, restrained motion, type doing the hierarchy work. Reads as a competent medical companion at a kitchen table, not a hospital chart and not a wellness app.

Color strategy: **Restrained** (product default). One accent, two semantic ramps (progress + alert), the rest is neutral.

**Brand palette (fixed):** `#F5EFE6` cream · `#E8DFCA` sand · `#6D94C5` blue · `#CBDCEB` light blue. The two warm neutrals carry surfaces; the two blues carry the accent. A deep slate ink (added — the four-color set has no dark) carries text, and the green/amber/red semantic ramps are retained, harmonized, for status.

## Color

All values in OKLCH for perceptual consistency.

### Surface

| Token | Light | Role |
|---|---|---|
| `--bg` | `oklch(0.954 0.014 78)` | Page background. `#F5EFE6` cream. |
| `--surface` | `oklch(0.992 0.006 80)` | Cards, panels, sheets. Warm near-white, lifts above the cream bg. |
| `--surface-sunken` | `oklch(0.905 0.030 88)` | `#E8DFCA` sand. Inset rails, recessed regions. |
| `--surface-raised` | `--surface` + shadow-sm | Sticky bars, popovers. |

### Ink

| Token | Light | Role | Contrast on bg |
|---|---|---|---|
| `--ink` | `oklch(0.28 0.025 258)` | Body, headings. | 12.8:1 ✓ AAA |
| `--ink-muted` | `oklch(0.45 0.022 258)` | Secondary text, captions. | 6.5:1 ✓ AA |
| `--ink-subtle` | `oklch(0.56 0.02 258)` | Tertiary text, labels. | 4.1:1 (large/meta) |
| `--ink-inverse` | `oklch(0.98 0.008 80)` | Text on accent / dark surfaces. | 5.0:1 on accent ✓ |

### Accent — one, used deliberately

| Token | Light | Role |
|---|---|---|
| `--accent` | `oklch(0.53 0.105 255)` | Primary actions, current selection, "today" marker. The brand blue `#6D94C5` deepened so white labels clear AA (the raw hex is only 3.1:1 on white). |
| `--accent-hover` | `oklch(0.46 0.11 255)` | Hover. |
| `--accent-soft` | `oklch(0.886 0.028 245)` | `#CBDCEB` light blue. Selected backgrounds, chips, accent-tinted panels. |
| `--accent-ink` | `oklch(0.40 0.10 255)` | Links + text on `--accent-soft`. |
| `--ring` | `oklch(0.657 0.085 255 / 0.4)` | Focus ring — the exact `#6D94C5`. |

Soft cornflower blue (hue 255). The fixed brand set is warm-neutral + blue; the blue is deepened only where it bears text, and both `#6D94C5` (focus ring) and `#CBDCEB` (soft fills) appear literally.

### Semantic — progress

The recovery story is told in green. Used for streaks, completed items, baseline-vs-now positive deltas.

| Token | Light | Role |
|---|---|---|
| `--progress` | `oklch(0.60 0.12 155)` | Completed, on-track. Muted forest, not bootcamp lime. |
| `--progress-soft` | `oklch(0.92 0.045 150)` | Filled progress backgrounds. |
| `--progress-ink` | `oklch(0.36 0.08 155)` | Text on `--progress-soft`. |

### Semantic — attention

For symptom checks and "evening check-in due" prompts. Never for nudges (nudges are neutral).

| Token | Light | Role |
|---|---|---|
| `--attention` | `oklch(0.74 0.13 78)` | Warm amber. Calls notice, not panic. |
| `--attention-soft` | `oklch(0.93 0.05 80)` | Tinted panel. |
| `--attention-ink` | `oklch(0.42 0.09 70)` | Text on `--attention-soft`. |

### Semantic — critical

Reserved for genuine clinical-flag UI (emergency protocol surfaced, red-flag symptoms entered). Sparse use.

| Token | Light | Role |
|---|---|---|
| `--critical` | `oklch(0.55 0.18 25)` | Errors, red-flag symptoms. |
| `--critical-soft` | `oklch(0.93 0.045 28)` | Tinted alert panel. |
| `--critical-ink` | `oklch(0.40 0.14 25)` | Text on `--critical-soft`. |

### Structural

| Token | Light | Role |
|---|---|---|
| `--border` | `oklch(0.86 0.025 85)` | Default borders. Warm sand hairline. |
| `--border-strong` | `oklch(0.78 0.03 85)` | Form controls, focused borders. |
| `--ring` | `oklch(0.657 0.085 255 / 0.4)` | Focus ring — exact `#6D94C5`. |

### Exercise intensity (data viz, kept from schema)

Exercise plans carry `intensity: blue | orange | red`. These map to:

| Intensity | Token | Use |
|---|---|---|
| `blue` | `--accent-soft` bg + `--accent-ink` text | Low-impact, encouraged. |
| `orange` | `--attention-soft` bg + `--attention-ink` text | Caution, watch form. |
| `red` | `--critical-soft` bg + `--critical-ink` text | Pause if pain. |

These are data tags, not page accents. They appear inside the exercise widget only.

## Typography

One family: **Geist Sans** (already loaded). One mono: **Geist Mono** (kept for any numeric tables; not used in chrome).

No display font. Hierarchy through weight + size.

### Scale

Fixed rem ladder, ratio ~1.2.

| Token | px @ 17 base | Use |
|---|---|---|
| `--text-xs` | 13 | Eyebrows (used sparingly), table labels. |
| `--text-sm` | 14 | Captions, helper text. |
| `--text-base` | 17 | Body. Larger than the 16px default for the older cohort. |
| `--text-md` | 19 | Card titles, list-row primary. |
| `--text-lg` | 22 | Section headings (h3). |
| `--text-xl` | 26 | Page headings (h2). |
| `--text-2xl` | 32 | "Today" hero number / day count. |
| `--text-3xl` | 40 | Reserved for empty-state and onboarding moments only. |

### Weights

- 400 body
- 500 labels, captions, button text
- 600 headings, current-state emphasis
- 700 only for hero numbers and the day-count chip

### Other

- `line-height: 1.5` for body, `1.25` for headings ≥`--text-lg`.
- `letter-spacing: -0.01em` on headings ≥`--text-xl`.
- `text-wrap: balance` on h1–h2; `text-wrap: pretty` on long prose blocks.
- Body measure capped at 65ch.
- No all-caps body. Uppercase only for ≤4-word labels (e.g. "TODAY", "REVIEWED BY").

## Spacing

8px-base scale (rems for sizing, px for borders/shadows).

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 24px |
| `--space-6` | 32px |
| `--space-7` | 48px |
| `--space-8` | 64px |
| `--space-9` | 96px |

Vary spacing for rhythm. Section padding generally `--space-7`/`--space-8`; intra-card `--space-4`/`--space-5`.

## Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Form controls, chips. |
| `--radius-md` | 10px | Buttons, small cards. |
| `--radius-lg` | 16px | Standard cards, panels. |
| `--radius-xl` | 24px | Hero card, sheets. |
| `--radius-full` | 9999px | Pills, rings, avatars. |

## Elevation

Shadows are quiet and only used when there is real elevation change (sticky, popover, hover-lift on tappable cards). Default cards rely on borders.

```css
--shadow-sm: 0 1px 2px oklch(0.22 0.02 250 / 0.04);
--shadow-md: 0 2px 6px oklch(0.22 0.02 250 / 0.06), 0 1px 2px oklch(0.22 0.02 250 / 0.04);
--shadow-lg: 0 12px 24px oklch(0.22 0.02 250 / 0.08), 0 4px 8px oklch(0.22 0.02 250 / 0.05);
```

## Motion

- Default duration: **180ms**, ease-out-quart (`cubic-bezier(0.25, 1, 0.5, 1)`).
- Sheet/dialog enter: 240ms ease-out-expo.
- Skeleton shimmer: 1200ms ease-in-out, infinite.
- Streak ring fill on streak increment: single 600ms ease-out.
- **No bouncy springs**, no elastic. The patient is tired.
- All animations gated by `@media (prefers-reduced-motion: reduce)`, which collapses to crossfade or instant.

## Components

The system speaks in a small, repeated vocabulary.

### Card

- Surface: `--surface`, border: `--border`, radius: `--radius-lg`, padding `--space-5`.
- No left-stripe accents (impeccable absolute ban).
- Hover only when tappable: `box-shadow --shadow-md`, no translate.
- Variants:
  - **HeroCard** (`--radius-xl`, padding `--space-7`, used once per screen for the day's anchor)
  - **PriorityCard** (compact horizontal layout for the 3 priorities list)
  - **ModuleCard** (the existing exercise/nutrition/sleep/symptoms previews, restyled)
  - **EmptyCard** (dashed border, ink-subtle text, action button)

### Button

States: default, hover, focus-visible, active, disabled, loading.

- **Primary**: `--accent` bg, `--ink-inverse` text, `--radius-md`, height 44px, weight 500. Full-width on mobile, auto on desktop.
- **Secondary**: transparent bg, `--border-strong` border, `--ink` text.
- **Ghost**: transparent, `--ink-muted` text, hover `--surface-sunken` bg.
- **Destructive**: `--critical` bg, `--ink-inverse` text. Reserved for delete-account / discharge actions.

Min tap target 44×44 everywhere.

### Form controls

- Input height 44px, `--radius-md`, `--border-strong` border, focus ring `--ring` 3px.
- Checkboxes/radios 22×22 (frail-hand friendly).
- Sliders: 24px thumb, 6px track. Big enough for tremor.

### Chips, badges, pills

- Chip: `--radius-full`, padding `--space-2`/`--space-3`, `--text-sm` weight 500.
- Day-count chip uses `--accent-soft` bg + `--accent-ink` text + small dot before the number.
- Phase chip uses `--surface-sunken` bg + `--ink-muted` text.

### Streak ring (7-day cap)

- SVG ring, 7 segments. Filled segments use `--progress`. Unfilled use `--border`.
- The ring sits next to its number; never the only signal.
- Hits 7 → ring goes solid, label reads "7-day streak — well held."
- Resets only after 2 consecutive misses. No flashing, no celebration animation beyond a single 600ms ease-out fill on increment.

### Sheet / Modal

- Used sparingly. Inline progressive disclosure preferred.
- When used: `--radius-xl` corners (top only on mobile sheet), backdrop `oklch(0.22 0.02 250 / 0.4)`, content padding `--space-7`.

## Patterns

### Today hero ("Your 3 priorities today")

Anchors the dashboard. Layout: phase chip + day-count, then 3 priority rows (each: icon, name, one-line context, complete checkbox). Below it: "See full plan" disclosure that reveals the rest of the module cards.

### Reviewed-by trust marker

When the patient's plan has a `reviewedBy` field, a small line under the day header reads: "Reviewed by Dr. [Name], [Role]" with a tiny verified glyph. When absent, the line is hidden entirely (no placeholder text).

### Phase-aware header

Three phases: `early` (day 1–9), `re-engagement` (day 10–14), `late` (day 15+). The day-count chip's accompanying label changes; on entering re-engagement, a one-time check-in card appears at the top of the dashboard.

### Caregiver mode

A session flag (set from profile menu). When on:
- Header reframes: "Helping [patient name]" replaces "Welcome back."
- All editing controls render disabled with a tooltip "Caregiver view — read-only."
- Copy throughout rephrases to second-person about the patient ("Help them with their stretches" not "Do your stretches").

## Anti-patterns blocked by the system

- Side-stripe accent borders on cards (the current `border-l-orange-500` pattern is gone).
- Identical icon-headed card grids — varied by purpose (hero, priorities row, module previews).
- Tiny tracked-uppercase eyebrows on every section.
- Numbered `01 / 02 / 03` scaffolding.
- Heavy color on inactive states.
- Gradients in text.
- Spinners mid-content (skeletons instead).
- Modals as first thought (inline disclosure preferred).

## Iconography

`lucide-react` (already in deps). One library, no mixing. Stroke width 1.75. Sized 18 / 22 / 28 to match type ladder.

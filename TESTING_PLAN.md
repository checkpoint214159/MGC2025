# Automated Patient Creation & Testing Plan

This document outlines a 3-tier strategy for automating patient creation for testing and development.

---

## Level 1: Direct Database Seeding (No LLM, No UI)

**Purpose:** Rapidly create patients with hardcoded/placeholder data to test app functionality (admin dashboard, progress tracking, UI rendering, etc.)

**Approach:** A TypeScript script that runs via `npx tsx` (or `ts-node`) and directly calls Prisma + existing service functions to insert complete patient records. No LLM calls, no browser, no Next.js server required (beyond DB access).

### What the Script Does

The onboarding pipeline creates these records in order:

1. **User + Account** (signup)
2. **Biometrics** (age, sex, treatment, surgeryDate)
3. **QueryBaseline** (JSON on User — the slider questions, normally LLM-generated)
4. **Baseline** (JSON in Baseline table — the assessed ICF qualifiers, normally LLM-generated)
5. **Thread + Messages** (onboarding conversation — 5 Q&A pairs)
6. **Profile** (string on User — the clinical summary, normally LLM-generated)
7. **AdminPatientRelation** (auto-assign to dev admin)

For Level 1, we **skip the LLM entirely** and provide hardcoded templates for steps 3, 4, 5, and 6.

### Script Location

```
lib/dev/seed-patient.ts        ← the core seeding function (importable)
scripts/seed-patients.ts       ← CLI entry point
```

### Core Seeding Function

```typescript
// lib/dev/seed-patient.ts
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { getDevAdminId } from "./init";

export interface SeedPatientOptions {
  email: string;
  name: string;
  password?: string;           // defaults to "password123"
  age?: number;                // defaults to 45
  sex?: "Male" | "Female" | "Other"; // defaults to "Male"
  treatment?: string;          // defaults to "Colostomy"
  surgeryDate?: Date;          // defaults to today
  assignToDevAdmin?: boolean;  // defaults to true
}

export async function seedPatient(opts: SeedPatientOptions) { ... }
```

### Template Data Needed

These are the hardcoded JSON blobs that replace LLM outputs:

#### QueryBaseline Template

A valid `QueryBaseline` with 3 axes, each containing 2-3 ICF entries with `question` fields. The structure must match `QueryBaselineSchema`. Each entry needs:

-   `code` (regex `^[bsde]\d+`), `domain`, `indicator`, `unit`, `range`, `justification`
-   `question`: `{ questionText, inputType: "slider", metadata: { intent, sliderMin, sliderMax } }`

Use realistic but static ICF codes specific to the treatment (e.g., colostomy → `s540` abdominal wall, `b525` defecation, `d530` toileting).

#### Baseline Template

A valid `Baseline` with 3 axes, each containing the same entries but with `value`, `qualifier` (0–4), and `assessment` fields instead of `question`. Slider values can all default to mid-range (e.g., 5/10 → qualifier 1 "Mild").

#### Thread + Messages Template

A thread with `type: "onboarding"`, containing 5 assistant/user message pairs:

```
assistant: "How would you describe your home setup — any stairs?"
user: "Single-story HDB flat, no stairs"
assistant: "Who will be helping you at home after surgery?"
user: "My wife will be around for the first two weeks"
... (3 more pairs)
```

Each assistant message needs a `context` field matching `AssistantContextSchema`:

```json
{
    "inputType": "text",
    "options": [],
    "metadata": {
        "intent": "environment",
        "urgency": false,
        "sliderMin": 0,
        "sliderMax": 10
    }
}
```

Each user message has `context: null`.

#### Profile Template

A static string:

```
"45-year-old male, POD 0 following colostomy. No acute safety concerns reported.
Resides in single-story HDB flat with spousal support for initial 2-week recovery period.
Pre-operative ICF assessment indicates mild impairment across biomechanical, functional,
and systemic axes (qualifiers 0-1). Diet preference: standard Asian diet with no
restrictions. Patient reports adequate sleep hygiene and moderate physical activity
baseline. No psychological barriers identified. Baseline Risk Level: Low."
```

### Execution Flow

```
1. Create User { name, role: 'patient' }
2. Create Account { email, password: bcrypt(password) }
3. Create Biometrics { age, sex, treatment, surgeryDate }
4. Set User.queryBaseline = QUERY_BASELINE_TEMPLATE
5. Create Baseline { data: BASELINE_TEMPLATE }
6. Create Thread { type: 'onboarding' } + 10 Messages (5 Q&A pairs)
7. Set User.profile = PROFILE_TEMPLATE
8. If assignToDevAdmin: Create AdminPatientRelation
9. Return { userId, email }
```

### CLI Script

```bash
# Seed one patient with defaults
npx tsx scripts/seed-patients.ts

# Seed with custom options
npx tsx scripts/seed-patients.ts --email "jane@test.com" --name "Jane Doe" --treatment "ACL Reconstruction" --age 30 --sex Female

# Seed N random patients (for load testing admin dashboard)
npx tsx scripts/seed-patients.ts --count 10

# Clean up all seeded test patients
npx tsx scripts/seed-patients.ts --cleanup
```

### Implementation Steps

1. Create `lib/dev/seed-patient.ts` with the `seedPatient()` function
2. Create template data files in `lib/dev/templates/` for each data structure
3. Create `scripts/seed-patients.ts` as the CLI entry point with arg parsing
4. Add a `"seed"` script to `package.json`: `"seed": "tsx scripts/seed-patients.ts"`

### Variations / Presets

For convenience, include preset patient archetypes:

| Preset              | Treatment          | Age | Sex    | Risk Level | Notes                             |
| ------------------- | ------------------ | --- | ------ | ---------- | --------------------------------- |
| `colostomy-default` | Colostomy          | 45  | Male   | Low        | Standard test patient             |
| `acl-young`         | ACL Reconstruction | 25  | Female | Low        | Young athletic patient            |
| `hip-elderly`       | Hip Replacement    | 72  | Male   | Moderate   | Elderly, mobility concerns        |
| `cardiac-complex`   | CABG               | 60  | Female | High       | Multiple comorbidities in profile |

Each preset bundles appropriate Biometrics + QueryBaseline + Baseline + Thread + Profile templates.

### What This Enables Testing Of

-   Admin dashboard: patient list rendering, search/filter, detail view tabs
-   Patient dashboard: widget rendering with module data (requires state generation separately or can also be seeded)
-   Progress tracking: seeded modules with trackable items
-   OnboardingGuard: correctly detecting onboarding completion (`doneOnboarding` check)
-   Role-based routing: patient vs admin redirects
-   Session/JWT: role stored correctly for seeded users

---

## Level 2: Browser Automation (With Real UI + LLM)

**Purpose:** Test the actual user-facing onboarding flow end-to-end, including LLM-generated questions/baselines, real form interactions, wait times, and rendering. Catches UI bugs, form validation issues, and LLM integration problems that Level 1 misses.

### Tool Options

| Tool                          | What It Is                             | Pros                                                         | Cons                                                  |
| ----------------------------- | -------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| **Playwright**                | Microsoft's browser automation library | Fast, headless, great TS support, free, built-in test runner | Requires learning API                                 |
| **Cypress**                   | E2E testing framework                  | Excellent DevX, time-travel debugging, good docs             | Slower, historically weaker at cross-tab/multi-domain |
| **Puppeteer**                 | Chrome DevTools Protocol wrapper       | Low-level control, good for scraping-style automation        | Less ergonomic for testing                            |
| **BrowserStack / Sauce Labs** | Cloud-hosted browser testing           | Cross-browser/device matrix                                  | Paid, more for QA than dev iteration                  |

**Recommendation: Playwright.** It has first-class TypeScript support, runs headless by default (fast), supports headed mode for debugging, and its test runner (`@playwright/test`) is lightweight. It's the most practical for a solo dev iterating on a Next.js app.

### Setup

```bash
npm install -D @playwright/test
npx playwright install   # downloads browser binaries
```

Add to `package.json`:

```json
{
    "scripts": {
        "test:e2e": "playwright test",
        "test:e2e:headed": "playwright test --headed"
    }
}
```

### What to Automate

#### Test: Full Onboarding Flow

```
1. Navigate to /signup → fill form → submit → redirected to /login
2. Navigate to /login → authenticate → redirected to /patient/info (biometrics page)
3. Fill biometrics form (age, sex, treatment, surgery date) → submit
4. Wait for LLM to generate QueryBaseline (loading spinner)
5. Interact with slider inputs for each ICF entry → submit
6. Wait for LLM to generate Baseline (loading spinner)
7. Answer 5 conversational questions (type text / click choice / adjust slider)
   - Each question requires waiting for LLM response
8. Wait for profile generation → verify redirect to dashboard
9. Assert: dashboard renders, state generation triggers
```

#### Key Playwright Patterns for This App

```typescript
// Wait for LLM responses (they take 3-10s)
await page.waitForSelector('[data-testid="question-card"]', { timeout: 30000 });

// Interact with sliders (custom range inputs)
const slider = page.locator('input[type="range"]');
await slider.fill("7");

// Handle choice-type questions
await page.click('button:has-text("Option A")');

// Handle text-type questions
await page.fill("textarea", "Single-story HDB flat, no stairs");
await page.click('button:has-text("Submit")');
```

#### Adding data-testid Attributes

For Playwright to reliably target elements, add `data-testid` attributes to key interactive elements in the onboarding pages:

```tsx
// BiometricsPage.tsx
<input data-testid="biometrics-age" ... />
<select data-testid="biometrics-sex" ... />
<input data-testid="biometrics-treatment" ... />
<button data-testid="biometrics-submit" ... />

// BaselinePage.tsx - slider entries
<input data-testid={`slider-${entry.code}`} type="range" ... />

// QuestionPage.tsx
<div data-testid="question-card" ... />
<textarea data-testid="question-input-text" ... />
<button data-testid="question-submit" ... />
```

### Implementation Steps

1. `npm install -D @playwright/test && npx playwright install`
2. Create `playwright.config.ts` at project root with `baseURL: 'http://localhost:3000'`, reasonable timeouts (30s for LLM waits)
3. Add `data-testid` attributes to onboarding form elements
4. Create `tests/e2e/onboarding.spec.ts` with the full onboarding flow test
5. Create `tests/e2e/helpers.ts` with reusable functions (`signUp()`, `login()`, `waitForLLM()`, etc.)
6. Add npm scripts for headed/headless runs

### Cost & Time Awareness

Each full onboarding test run makes **4+ LLM calls** (queryBaseline, baseline, 5 questions, profile). At current model pricing:

-   ~4–6 `generateObject` calls per run
-   Expect 60–120 seconds per full run (LLM wait time dominates)
-   Consider using a cheaper/faster model via `AI_MODEL` env var for test runs (e.g., `gpt-4o-mini`)

### When to Use Level 2 vs Level 1

| Scenario                                                       | Use Level                 |
| -------------------------------------------------------------- | ------------------------- |
| "Does the admin dashboard render patient cards?"               | 1                         |
| "Does the slider component actually work on mobile?"           | 2                         |
| "Does profile generation complete without errors?"             | 2                         |
| "Can I seed 20 patients and test search/filter?"               | 1                         |
| "Does the OnboardingGuard redirect correctly after each step?" | 2                         |
| "Does progress tracking persist across page reloads?"          | 1 (seed state + progress) |

---

## Level 3: Agentic Patient Simulation (LLM-Driven E2E)

**Purpose:** Generate realistic, diverse patient personas and have an AI agent navigate the onboarding flow as that persona — producing believable clinical data for service quality testing.

> **Note:** This is aspirational / future scope. Included here for completeness.

### Concept

Instead of hardcoded answers (Level 1) or manual test scripts (Level 2), an LLM agent:

1. **Generates a patient persona** (demographics, living situation, surgery type, pre-existing conditions, personality traits)
2. **Drives the browser** or calls server actions directly, answering each onboarding question _in character_
3. **Validates the output** — checks that the generated profile, baseline, and state are clinically coherent for the persona

### Architecture Sketch

```
┌─────────────────────┐
│   Persona Generator  │  ← LLM generates: "68yo woman, lives alone,
│   (LLM call)         │     recent hip replacement, anxious about falling"
└────────┬────────────┘
         │ persona context
         ▼
┌─────────────────────┐
│   Agent Controller   │  ← Orchestrates the flow: signup → biometrics →
│   (script/framework) │     sliders → questions → profile
└────────┬────────────┘
         │ for each step:
         ▼
┌─────────────────────┐
│   Answer Generator   │  ← Given persona + current question, LLM generates
│   (LLM call)         │     a realistic answer in character
└────────┬────────────┘
         │ answer
         ▼
┌─────────────────────┐
│   Action Executor    │  ← Either: Playwright (browser) or direct action calls
│                      │     Submits the answer, waits for next step
└─────────────────────┘
```

### Possible Frameworks

-   **LangChain Agents** or **CrewAI** — orchestrate multi-step LLM workflows
-   **Browser Use** (`browser-use` Python package) — specialized AI browser agent
-   **Custom orchestrator** — a simple loop in TypeScript that alternates between "ask LLM for answer" and "call server action"

### Simplest Starting Point (Custom TS Orchestrator)

```typescript
// Pseudocode
const persona = await generatePersona(); // LLM call
const bio = {
    age: persona.age,
    sex: persona.sex,
    treatment: persona.surgery,
    surgeryDate: new Date(),
};

// Step through onboarding using server-side functions directly
await setBiometric(userId, bio);
const queryBaseline = await generateQueryBaseline(userId, bio);
await setQueryBaseline(userId, queryBaseline);

// Simulate slider responses — LLM picks values based on persona
const responses = await generateSliderResponses(persona, queryBaseline); // LLM call
const baseline = await generateBaseline(bio, responses, queryBaseline); // LLM call (app's own)
await setBaseline(userId, baseline);

// Answer onboarding questions in character
let thread = await createThread(userId, "onboarding");
for (let i = 0; i < 5; i++) {
    const question =
        i === 0
            ? await getInitialLLMQuestion(bio, baseline)
            : await getNextLLMQuestion(bio, thread, baseline);
    const answer = await generateInCharacterAnswer(persona, question); // LLM call
    thread = await appendMessages(thread, question, answer);
}

// Generate profile (uses app's own LLM)
const profile = await generateUserProfile({
    thread,
    biometrics: bio,
    baseline,
});
await setProfile(userId, profile);
```

This is essentially Level 1's seeding approach but replacing hardcoded templates with LLM-generated content — so it's a natural extension.

### When You'd Want This

-   Populating a demo environment with 50+ diverse, realistic patients
-   Stress-testing the state generation pipeline with varied clinical profiles
-   Evaluating whether the system produces appropriate exercise/nutrition plans for edge-case patients (very old, very young, unusual surgeries)
-   QA before a demo or presentation

---

## Summary: Priority & Effort Matrix

| Level                  | Effort              | LLM Cost       | What You Get                                            | Priority             |
| ---------------------- | ------------------- | -------------- | ------------------------------------------------------- | -------------------- |
| **1 — DB Seeding**     | Low (1-2 hours)     | $0             | Instant test patients, repeatable, fast                 | **HIGH — do first**  |
| **2 — Playwright E2E** | Medium (half a day) | ~$0.05/run     | Real UI regression tests, catches integration bugs      | **MEDIUM — do soon** |
| **3 — Agentic Sim**    | High (1-2 days)     | ~$0.50/patient | Realistic diverse test data, service quality validation | **LOW — future**     |

### Recommended Next Steps

1. **Implement Level 1 now.** Create `lib/dev/seed-patient.ts` + `scripts/seed-patients.ts` with the colostomy-default preset. This unblocks all your immediate testing needs.
2. **Add `data-testid` attributes** to onboarding components as you work on them — this is zero-cost preparation for Level 2.
3. **Set up Playwright** when you next encounter a UI integration bug that DB seeding can't reproduce.
4. **Revisit Level 3** when preparing for a demo or when you need to evaluate clinical output quality across patient populations.

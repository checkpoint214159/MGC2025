How it currently works (and what's wrong)
The onboarding has 4 logical steps: Biometrics → Query Baseline → Baseline → Conversation+Profile. Right now, all the ordering logic lives in the frontend — page.tsx computes currentStep by inspecting the data it fetched, and each child component (BaselinePage, QuestionPage) secretly calls actions and invalidates the query to move forward. The backend has no concept of "what step we're on" — it's just a bag of individual actions.

This means:

page.tsx is bloated because it's doing orchestration, not rendering
Step logic is scattered: some in page.tsx's useMemo, some in BaselinePage's useEffect, some in QuestionPage's termination check
Adding a new step means touching the frontend in 3+ places
The plan

1. Move step-detection to the backend via lib/onboarding/service.ts

Create a getOnboardingStep(userId) function that looks at the DB and returns "BIOMETRICS" | "BASELINES" | "CONVERSATION" | "DONE". This replaces the useMemo in page.tsx. The frontend just asks the backend what step it's on — it doesn't compute it itself. getOnboardingAction already does the DB fetch; we just add a step field to its return value.

2. Structure lib/onboarding/ like lib/state/

lib/onboarding/
├── service.ts ← NEW: getOnboardingStep(), finalizeOnboarding()
├── graph/
│ ├── annotation.ts ← NEW: OnboardingAnnotation (userId, biometrics, baseline, thread, profile, external)
│ ├── graph.ts ← NEW: onboardingFinalizationGraph
│ └── nodes/
│ ├── profile.ts ← NEW: generateProfileNode
│ └── finalize.ts ← NEW: compileExternalNode (saves External to DB, marks onboarding done)
├── questioning.ts ← unchanged
├── baselines.ts ← unchanged
└── profile.ts ← unchanged (still has the raw generateUserProfile LLM fn) 3. The LangGraph graph: the finalization pipeline

The most natural LangGraph fit in onboarding is the ending sequence: after the conversation terminates, you need to generate_profile → compile_external in sequence (profile must exist before you can compile external). Right now this is fire-and-forget imperative code in QuestionPage.tsx. Putting it in a graph means:

The annotation holds { userId, thread, biometrics, baseline, profile, external } as it flows through nodes
generateProfileNode writes to profile in state
compileExternalNode reads profile from state, saves the External record, and writes external
No manual parameter threading between steps
No checkpointer needed here — this is a one-shot operation just like stateGenerationGraph.

4. Simplify the frontend

page.tsx's useMemo for currentStep goes away — replaced by the step field in the query result
QuestionPage's termination block (generateUserProfileAction + setProfileAction + compileExternalAction) collapses into a single finalizeOnboardingAction() call that runs the graph
useQuery stays exactly as-is — it's orthogonal to LangGraph, it's just the data-fetch layer
The switch statement in page.tsx stays (it's just rendering, not logic)

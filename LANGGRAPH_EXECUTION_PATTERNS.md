1. Graph execution patterns (the "buckets")
   You've identified the key distinction. But there are actually a few more patterns to be aware of:

Bucket 1: One-shot, atomic (like stateGenerationGraph)

Invoke once, run to completion or fail, save results to Prisma, done
No checkpointer needed
User is not waiting mid-execution; the whole thing is server-driven
Example: daily cron job that generates states for all users
Bucket 2: Session-resumable with explicit interrupts (like onboardingGraph with checkpointer)

User interaction points where you pause and wait for input
Graph state is checkpointed to survive page refresh / reconnect
Resume from checkpoint when user returns
Example: multi-step form where each step is an interrupt()
Bucket 3: Streaming agentic loops (not in your app yet, but worth knowing)

Graph that runs a decision loop: LLM → tool call → get result → decide next action → repeat
Often paired with streaming UI (each tool result causes a UI update)
May or may not need checkpointing depending on whether you care about resuming mid-tool-loop
Example: a doctor's "AI summarizer" that fetches patient history (tool) → generates summary (LLM) → if needs more context, fetches more (tool) → loops
Bucket 4: Human-in-the-loop with reviewers (mentioned in your memory as "doctor review graph")

Graph that interrupt()s for a human to review / approve before proceeding
Different from user-in-the-loop (bucket 2) because the human is staff, not the patient
Checkpointer needed, and typically you'd have a separate "reviewer queue" table in Prisma that surfaces interrupted tasks to admins
Example: state generation graph with a final doctor_review node that interrupts and waits for admin approval before marking the state as approved
Bucket 5: Hierarchical / subgraph composition (advanced)

One graph calls another as a subgraph (not as a separate invocation, but as a composed node)
Useful for modularity but adds complexity
Example: onboarding graph could theoretically have a "baselines subgraph" that handles that portion, but in your case it's not worth it

# Patient–Doctor–App Workflow

A patient onboards once (resumable LangGraph), then the system runs a **daily closed loop**:
yesterday's State + accumulated "External" snapshots → today's State of modules → patient
acts → progress feeds tomorrow. The doctor (admin) observes, and can influence the plan via
two planned channels.

**Legend:** solid = built today · dotted = planned.

```mermaid
flowchart TB
    subgraph Patient["🧑 Patient"]
        Signup["sign up / log in"]
        Onboard["onboarding: biometrics → sliders → 5 Qs"]
        DailyView["daily dashboard"]
        DoTasks["complete tasks → log Progress"]
        Chat["RAG assistant (ephemeral)"]
    end

    subgraph App["🤖 App / LLM Engine"]
        OnbG["onboarding graph → profile"]
        StateG["state-generation graph<br/>load_context → compile_external → dispatch → modules → save"]
        RAG["RAG hospital guidelines"]
    end

    subgraph Doctor["🩺 Doctor / Admin"]
        Manage["manages N patients (AdminPatientRelation)"]
        Review["review biometrics·progress·threads·baseline"]
        DocMsg["doctorMessage → next External"]
        DocEdit["direct plan edit → NEW causal State (versioned)"]
    end

    Signup --> Onboard --> OnbG --> Profile[("User.profile + Baseline + onboarding Thread")]

    Profile --> StateG
    Ext[("External snapshot<br/>threadContext + profile, locked")] --> StateG
    StateG --> Todays[("Today's State — Module + Progress")]
    Todays --> DailyView --> DoTasks --> Progress[("Progress")]
    Progress -.->|tomorrow: causalState/causalX| StateG

    Chat --> RAG --> Chat

    Manage --> Review
    Review --> Todays & Profile
    DocMsg -.->|enters loop| Ext
    DocEdit -.->|causalState link + 'physician edited'| Todays

    classDef planned stroke-dasharray:5 5,stroke:#999,fill:#f7f7f7,color:#555;
    class DocMsg,DocEdit planned;
    linkStyle 8,15,16 stroke-dasharray:5 5,stroke:#999;
```

## Design resolutions

| Branch               | Resolution                                                                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Doctor influence** | Two channels: `doctorMessage` rides into the next External snapshot, **and** a direct edit spawns a **new causal State** (versioned, preserves immutability) + "physician edited" provenance badge. |
| **Chat**             | Ephemeral RAG Q&A — not persisted, not part of the loop. `External.threadContext` is fed by onboarding (and future `doctor_note`) threads only.                                                     |
| **Symptoms / Sleep** | Planned first-class LLM modules (today they're decorative cards; `ModuleSchema` only knows exercise + nutrition).                                                                                   |
| **MCP server**       | Ghost feature — experimental side-car, no committed integration yet.                                                                                                                                |

> Note: "doctor edit = new causal State" reuses the existing `State.causalStateId` /
> `StateHistory` self-relation in `prisma/schema.prisma` — a physician edit is just another
> node in the causal chain LLM generation already builds, flagged by provenance.

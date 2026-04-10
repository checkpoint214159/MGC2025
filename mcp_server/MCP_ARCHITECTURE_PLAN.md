# MCP Architecture Plan for MGC2025 Medical Planning App

## Overview

This document outlines how to integrate Model Context Protocol (MCP) servers into the MGC2025 recovery planning application to:

1. **Enable AI-driven development** — Claude (via desktop/CLI tools) can inspect your live database and run queries during development
2. **Unify your service layer** — Create a clean, standardized interface for AI agents to interact with your app's capabilities
3. **Support LangGraph workflows** — Build composable graphs that call tools via MCP instead of hardcoded service imports

## What is MCP?

MCP (Model Context Protocol) is a standardized protocol for AI models to discover and invoke tools. Think of it as a USB-C connector for AI — any MCP-compatible client (Claude Desktop, Claude Code, your LangGraph agents) can:
- Discover what tools a server offers
- See the parameter types and descriptions
- Call those tools with typed inputs
- Receive structured responses

**MCP is NOT a replacement for REST APIs or your frontend service layer.** It's specifically for **AI agents** interacting with your system. Your Next.js frontend continues using server actions as it does today.

---

## Part 1: Development-Time MCP Servers (Immediate)

Start here — zero changes to your app, but huge productivity boost for development.

### 1.1 PostgreSQL MCP Server

Lets Claude query your live database during development. Useful for:
- Debugging state generation: "Show me all active states for user X"
- Verifying seeded patients: "Select count(*) from State where userId = '...' and isActive = true"
- Inspecting baselines: "Show the baseline data for the user I just seeded"

**Setup (Claude Desktop):**
1. Open `~/.config/Claude/claude_desktop_config.json` (or create it)
2. Add:
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "your_postgres_connection_string"
      }
    }
  }
}
```

3. Restart Claude Desktop
4. Next time you chat, type `@postgres` and Claude can query your DB

**Setup (Claude Code in VS Code):**
Create `.mcp.json` in your project root:
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "your_postgres_connection_string"
      }
    }
  }
}
```

### 1.2 GitHub MCP Server (Optional)

Lets Claude read/create issues and PRs. Less critical for medical domain work, but useful for project management.

---

## Part 2: Custom MCP Server for Your App

This is the core of the architecture. Build an MCP server that exposes your app's capabilities as tools that any AI client can call.

### 2.1 Goals

- **Consolidate scattered services** — `/lib/state/service.ts`, `/lib/user/service.ts`, `/lib/rag/service.ts` all become discoverable tools
- **AI-friendly interface** — Tools have clear descriptions, typed parameters, deterministic outputs
- **Enable LangGraph integration** — Graph nodes can call MCP tools instead of importing services directly
- **Composability** — Add a new data source (wearable API, etc.) and it immediately becomes available to all graphs and AI clients

### 2.2 Tool Surface Design

Define your app's capabilities as MCP tools. Each tool wraps one or more existing service functions.

```typescript
// Tool: get_patient_profile
// Description: Retrieve a patient's demographics, biometrics, baseline assessment, and onboarding status
// Parameters:
//   - userId (string, required): The patient's unique identifier
// Returns:
//   {
//     biometrics: { age, sex, treatment, surgeryDate },
//     baseline: { axes: { biomechanical, functional, systemic } },
//     queryBaseline: { ... },
//     profile: string,
//     doneOnboarding: boolean
//   }

// Tool: get_patient_state
// Description: Retrieve the active (current) or historical states for a patient
// Parameters:
//   - userId (string, required)
//   - date (ISO 8601 string, optional): If omitted, returns today's state
//   - includeProgress (boolean, optional): Whether to include module progress data
// Returns:
//   {
//     id: string,
//     dateCreated: string,
//     modules: [ { type, summary, plan, progress } ]
//   }

// Tool: generate_daily_state
// Description: Trigger the state generation graph to create today's recovery plan
// Parameters:
//   - userId (string, required)
//   - date (ISO 8601 string, optional): Defaults to today
// Returns:
//   {
//     stateId: string,
//     modules: [{ type, summary }],
//     generatedAt: string
//   }

// Tool: update_module_progress
// Description: Update progress on a specific module (e.g., mark exercise checklist items)
// Parameters:
//   - moduleId (string, required)
//   - updates (array of { id, data }, required): Trackables to update
// Returns:
//   { success: true, updatedAt: string }

// Tool: search_guidelines
// Description: Semantic search over hospital guidelines and best practices
// Parameters:
//   - query (string, required): Natural language search
//   - surgeryType (string, optional): Filter by surgery type (e.g., "colostomy")
//   - topK (number, optional): Number of results (default 5)
// Returns:
//   {
//     results: [ { id, text, score, metadata } ]
//   }

// Tool: get_onboarding_thread
// Description: Retrieve the patient's onboarding conversation (the 5 free-form questions)
// Parameters:
//   - userId (string, required)
// Returns:
//   {
//     threadId: string,
//     messages: [ { role, content, createdAt } ]
//   }

// Tool: get_compiled_external
// Description: Retrieve the compiled External context snapshot (what was fed to state generation)
// Parameters:
//   - userId (string, required)
//   - stateId (string, optional): If omitted, returns the most recent
// Returns:
//   {
//     threadContext: { ... },
//     profile: string,
//     dateCreated: string
//   }
```

### 2.3 MCP Server Implementation

Location: `/mcp_server/` (new directory at repo root)

**Structure:**
```
mcp_server/
├── package.json              # @modelcontextprotocol/sdk + your deps
├── tsconfig.json             # TypeScript config
├── src/
│   ├── index.ts              # Server entry point + tool registration
│   ├── tools/
│   │   ├── patient.ts        # get_patient_profile, get_patient_state
│   │   ├── planning.ts       # generate_daily_state, update_module_progress
│   │   ├── rag.ts            # search_guidelines
│   │   └── context.ts        # get_onboarding_thread, get_compiled_external
│   └── lib/
│       ├── client.ts         # Initialize your app's services (Prisma, Pinecone)
│       └── auth.ts           # Authenticate incoming MCP calls (verify caller)
└── build/                    # Compiled JS output
```

**Example: `src/index.ts`**
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { patientTools } from "./tools/patient.js";
import { planningTools } from "./tools/planning.js";
import { ragTools } from "./tools/rag.js";
import { contextTools } from "./tools/context.js";

const server = new Server({
  name: "mgc2025-server",
  version: "1.0.0",
});

// Register all tools
const allTools = [
  ...patientTools,
  ...planningTools,
  ...ragTools,
  ...contextTools,
];

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = allTools.find((t) => t.name === request.params.name);
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
  return await tool.handler(request.params.arguments);
});

// List tools on startup
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

const transport = new StdioServerTransport();
server.connect(transport);
```

**Example: `src/tools/patient.ts`**
```typescript
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const patientTools = [
  {
    name: "get_patient_profile",
    description: "Retrieve a patient's demographics, baseline, and onboarding status",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Patient ID" },
      },
      required: ["userId"],
    },
    handler: async (args: { userId: string }) => {
      const user = await prisma.user.findUnique({
        where: { id: args.userId },
        include: {
          biometric: true,
          baseline: true,
        },
      });
      if (!user) throw new Error(`User ${args.userId} not found`);
      return {
        biometrics: user.biometric,
        baseline: user.baseline?.data,
        queryBaseline: user.queryBaseline,
        profile: user.profile,
        doneOnboarding: user.doneOnboarding,
      };
    },
  },
  // ... more tools
];
```

### 2.4 Calling Your MCP Server from Development

**From Claude Desktop:**
```
User: "Query the database for patient abc123's active state"
Claude: "I'll query your database via the MCP server... [calls get_patient_state tool] The active state shows 2 modules..."
```

**From Claude Code in VS Code:**
Configure `.mcp.json` to point to your MCP server:
```json
{
  "mcpServers": {
    "mgc": {
      "command": "node",
      "args": ["mcp_server/build/index.js"],
      "env": {
        "DATABASE_URL": "...",
        "PINECONE_API_KEY": "..."
      }
    }
  }
}
```

---

## Part 3: LangGraph + MCP Integration

Your LangGraph graphs can call MCP tools via an MCP client, making them composable and decoupled from direct service imports.

### 3.1 Current State Generation Graph

Currently your `lib/state/graph/graph.ts` does:
```
load_context (Prisma) → 
compile_external (Prisma) → 
dispatchModules (fan-out) → 
[parallel] generate_module (LLM) → 
[fan-in] saveState (Prisma)
```

**Keep this as-is.** It's working well. No MCP refactor needed unless you want to decouple the graph from your monolith.

### 3.2 New Graphs: Using MCP Tools

For new graphs (onboarding, chat, doctor review), have nodes call MCP tools instead of importing services.

**Example: Onboarding Graph with MCP**

```typescript
import { MCPClient } from "@/lib/mcp-client";

const onboardingGraph = new StateGraph(onboardingAnnotation)
  .addNode("collect_biometrics", async (state) => {
    // Generate questions via LLM
    const questions = await generateBiometricQuestions(state.userId);
    return { biometricQuestions: questions };
  })
  .addNode("interrupt_biometrics", async (state) => {
    // Pause graph and wait for user input
    const answers = interrupt({ questions: state.biometricQuestions });
    // Save via MCP tool call
    const mcp = new MCPClient();
    await mcp.call("update_biometrics", {
      userId: state.userId,
      data: answers,
    });
    return { biometricsDone: true };
  })
  .addNode("generate_baseline_questions", async (state) => {
    // Call MCP tool to get patient profile (for context)
    const mcp = new MCPClient();
    const profile = await mcp.call("get_patient_profile", {
      userId: state.userId,
    });
    // Use profile to generate ICF questions
    const questions = await generateICFQuestions(profile);
    return { baselineQuestions: questions };
  })
  // ... more nodes
  .compile();
```

**Benefits:**
- Graph is decoupled from service imports
- If you change how biometrics are stored (migrate to a new table, external API, etc.), only the MCP tool definition changes
- The graph itself stays stable
- Other AI clients can invoke the same tools without reimplementing

### 3.3 Proposed Graph Suite

Once you have the MCP server, plan these graphs:

| Graph | Purpose | Nodes | Interrupt Points |
|-------|---------|-------|------------------|
| `onboarding_graph` | Multi-step patient intake | collect_biometrics → collect_baseline → conduct_conversation → compile_profile | After each questionnaire |
| `state_generation_graph` | Daily recovery plan (existing) | load_context → compile_external → dispatch_modules → save_state | None (one-shot) |
| `chat_agent_graph` | Patient chat with guidelines | retrieve_context (MCP) → generate_response (LLM) | None (streaming response) |
| `doctor_review_graph` | Admin query answering | fetch_patient_history (MCP) → synthesize_insights (LLM) | None (one-shot) |

Each graph callable as an MCP tool from Claude Desktop, other graphs, or external systems.

---

## Part 4: Inference & LLM Provider Options

**Current setup:** Vercel AI SDK with `ai.gateway()` → `anthropic/claude-sonnet-4`

**Options:**
- **Anthropic API directly** (current) — simplest, no infrastructure dependency
- **Google Vertex AI** — if you want to stay in GCP ecosystem
- **Amazon Bedrock** — if you're AWS-native
- **Claude API** — exactly what you have

**Recommendation:** Stay with Anthropic API via the AI SDK. You're already set up, it's the most direct path, and the AI SDK gives you provider flexibility via the `AI_MODEL` env var if you need to swap later.

---

## Implementation Roadmap

### Phase 1: Development Setup (Day 1)
- [ ] Add PostgreSQL MCP server to Claude Desktop config
- [ ] Test querying your DB from Claude Desktop

### Phase 2: Build Custom MCP Server (Days 2-3)
- [ ] Create `/mcp_server/` package
- [ ] Implement tool stubs for patient, planning, RAG, context tools
- [ ] Connect to your Prisma client and Pinecone instance
- [ ] Register with Claude Desktop/Code

### Phase 3: Refactor LangGraph (Days 4-5)
- [ ] Refactor onboarding into a graph with `interrupt()`
- [ ] Swap service imports for MCP client calls in graph nodes
- [ ] Test end-to-end with Claude Code calling the graph

### Phase 4: Build Additional Graphs (Days 6+)
- [ ] Chat agent graph
- [ ] Doctor review graph
- [ ] Expose each as an MCP tool

---

## Key Files to Reference

**Your existing code:**
- `/lib/state/graph/graph.ts` — state generation graph (keep as-is)
- `/lib/state/service.ts` — state CRUD (wrap in MCP tools)
- `/lib/user/service.ts` — user data (wrap in MCP tools)
- `/lib/rag/service.ts` — Pinecone search (wrap in MCP tools)
- `/lib/external/service.ts` — External compilation (wrap in MCP tools)
- `/lib/actions.ts` — server actions (still used by Next.js frontend)

**To create:**
- `/mcp_server/src/index.ts` — MCP server entry point
- `/mcp_server/src/tools/` — Tool implementations
- Updated `/lib/state/graph/graph.ts` — refactored to use MCP client
- `/lib/mcp-client.ts` — MCP client wrapper (for use in graphs)

---

## Next Steps

1. **Share this plan with Claude Code** — copy this document into a new conversation in VS Code
2. **Start with Phase 1** — PostgreSQL MCP in Claude Desktop, test a query
3. **Move to Phase 2** — scaffold the `/mcp_server/` package (Claude Code can help)
4. **Build tools incrementally** — start with `get_patient_profile` and `get_patient_state`, test, then add more

Good luck! This architecture will make your app both more AI-friendly and more maintainable long-term.

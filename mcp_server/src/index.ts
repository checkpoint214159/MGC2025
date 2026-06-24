import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { patientTools } from "./tools/patient.js";
import { planningTools } from "./tools/planning.js";
import { ragTools } from "./tools/rag.js";
import { contextTools } from "./tools/context.js";

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

const allTools = [
    ...patientTools,
    ...planningTools,
    ...ragTools,
    ...contextTools,
];

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
    { name: "mgc2025-server", version: "1.0.0" },
    { capabilities: { tools: {} } },
);

// List all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
    })),
}));

// Dispatch tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = allTools.find((t) => t.name === request.params.name);

    if (!tool) {
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Unknown tool: "${
                        request.params.name
                    }". Available tools: ${allTools
                        .map((t) => t.name)
                        .join(", ")}`,
                },
            ],
            isError: true,
        };
    }

    try {
        const result = await tool.handler(request.params.arguments as any);
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
            `[MGC2025 MCP] Tool "${request.params.name}" failed:`,
            error,
        );
        return {
            content: [{ type: "text" as const, text: `Error: ${message}` }],
            isError: true,
        };
    }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[MGC2025 MCP Server] Ready — listening on stdio");

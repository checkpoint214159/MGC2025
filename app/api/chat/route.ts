import { streamText, convertToModelMessages } from "ai";
import { getContext } from "@/lib/rag/service";

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages, userProfile } = await req.json();

        // 1. Retrieve RAG Context
        const lastMessage = messages[messages.length - 1];
        const userQuery = lastMessage.content;
        const surgeryType = userProfile?.surgeryType || "";

        // Fetch context from Pinecone (Hospital Guidelines)
        let context = "";
        try {
            context = await getContext(userQuery, surgeryType);
        } catch (error) {
            console.error("RAG Retrieval failed:", error);
            // Continue without context if retrieval fails
        }

        // 2. Build System Prompt
        const systemPrompt = `
You are a specialized Recovery Assistant for post-surgery patients.
Your goal is to provide accurate, safe, and encouraging medical recovery advice based STRICTLY on the provided hospital guidelines.

---
HOSPITAL GUIDELINES (Reference Material):
${context || "No specific guidelines found for this query."}
---

USER CONTEXT:
Surgery Type: ${surgeryType}
Mood: ${userProfile?.mood || "Not specified"}
Recent Activity: ${userProfile?.recentActivity || "Not specified"}
Diet: ${userProfile?.diet || "Not specified"}
Physical Stats: ${JSON.stringify(userProfile?.physicalStats || {})}

INSTRUCTIONS:
- Use the Hospital Guidelines to answer the user's question.
- If the answer is found in the guidelines, cite it.
- If the answer is NOT in the guidelines and requires medical expertise, advise them to consult their doctor.
- Be empathetic but professional.
`;

        const messagesWithSystem = [
            { role: "system" as const, content: systemPrompt },
            ...convertToModelMessages(messages),
        ];

        // 3. Generate Response
        const result = await streamText({
            model: "deepseek/deepseek-v3.2", // Keeping existing model
            messages: messagesWithSystem,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error("Chat API error:", error);

        // Return a proper error response
        return new Response(
            JSON.stringify({
                error: "Failed to process chat request",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
}

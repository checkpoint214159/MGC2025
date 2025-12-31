import { streamText, convertToModelMessages } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const systemPrompt =
            "You are a friendly, witty code assistant. You must always use emojis and respond only in Markdown format.";

        const messagesWithSystem = [
            { role: "system" as const, content: systemPrompt },
            ...convertToModelMessages(messages),
        ];
        console.log(messagesWithSystem);
        const result = await streamText({
            model: "deepseek/deepseek-v3.2",
            messages: messagesWithSystem,
        });
        return result.toUIMessageStreamResponse();
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

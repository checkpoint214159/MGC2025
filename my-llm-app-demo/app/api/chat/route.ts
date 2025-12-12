// my-llm-app-demo/app/api/chat/route.ts

import { deepseek } from '@ai-sdk/deepseek';
import { streamText } from 'ai';

// Set a longer duration to prevent timeouts during long LLM generations
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const systemPrompt = "You are a friendly, witty code assistant. You must always use emojis and respond only in Markdown format.";

  const messagesWithSystem = [
    { role: 'system' as const, content: systemPrompt },
    ...messages,
  ];

  // 3. Call the DeepSeek model using the unified AI SDK streamText API
  const result = await streamText({
    model: deepseek('deepseek-chat'), 
    messages: messagesWithSystem,
    // Optional: You can adjust temperature or other parameters here
  });

  return result.toDataStreamResponse();
}
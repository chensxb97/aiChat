import { mistral } from '@ai-sdk/mistral';
import { streamText, UIMessage, convertToModelMessages, tool } from 'ai';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 5;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const result = streamText({
        model: mistral('mistral-small-latest'),
        apiKey: process.env.MISTRAL_API_KEY,
        prompt: convertToModelMessages(messages),
        tools: {
            weather: tool({
                description: 'Get the weather in a location',
                inputSchema: z.object({
                    location: z.string().describe('The location to get the weather for'),
                }),
                execute: async ({ location }) => ({
                    location,
                    temperature: 72 + Math.floor(Math.random() * 21) - 10,
                }),
            }),
        },
    });

    return result.toUIMessageStreamResponse();
}

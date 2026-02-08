import {
    streamText, UIMessage, convertToModelMessages,
    experimental_createMCPClient, tool
} from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";

const httpTransport = new StreamableHTTPClientTransport(
    new URL("http://127.0.0.1:5000/mcp"),
    {}
);

const mcpClient = await experimental_createMCPClient({
    transport: httpTransport,
});

const customTool = tool({
    description: 'Get the weather in a location',
    inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
    }),
    execute: async ({ location }) => {
        // --- SIMULATE DELAY ---
        // Wait for 2 seconds before returning data
        await new Promise(resolve => setTimeout(resolve, 2000));

        return {
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
        };
    },
})
const mcpTools = await mcpClient.tools();

export async function POST(req: Request) {
    try {
        const { messages }: { messages: UIMessage[] } = await req.json();
        const result = streamText({
            model: mistral('mistral-small-latest'),
            apiKey: process.env.MISTRAL_API_KEY,
            prompt: convertToModelMessages(messages),
            tools: { customTool, ...mcpTools },
            toolChoice: 'required',
            onFinish: async () => {
                await mcpClient.close();
            },
            onError: async (error) => {
                await mcpClient.close();
                console.error("Error during streaming:", error);
            },
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error("Error streaming chat completion:", error);
        return new Response("Failed to stream chat completion", { status: 500 });
    }
}
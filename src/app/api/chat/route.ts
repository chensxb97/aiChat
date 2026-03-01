import {
    streamText, UIMessage, convertToModelMessages,
    experimental_createMCPClient, tool, cosineSimilarity, embedMany, embed
} from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";

import fs from 'fs/promises';
import path from 'path';

const httpTransport = new StreamableHTTPClientTransport(
    new URL("http://127.0.0.1:5000/mcp"),
    {}
);


const weather = tool({
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

// Embeddings DB
const db: { embedding: number[]; value: string }[] = [];

// Fetch knowledge base files
const knowledgeBase = path.join(process.cwd(), '/knowledge_base')
const files = await fs.readdir(knowledgeBase);

// Input embeddings
for (const file of files) {
    const filePath = path.join(knowledgeBase, file);
    const essay = await fs.readFile(filePath, 'utf8');
    const chunks = essay
        .split('.')
        .map(chunk => chunk.trim())
        .filter(chunk => chunk.length > 0 && chunk !== '\n');

    const { embeddings } = await embedMany({
        model: mistral.textEmbedding('mistral-embed'),
        values: chunks,
    });
    embeddings.forEach((e, i) => {
        db.push({
            embedding: e,
            value: chunks[i],
        });
    });
}

export async function POST(req: Request) {
    try {
        const { messages }: { messages: UIMessage[] } = await req.json();
        const lastMessage = messages[messages.length - 1]
        const queryText = lastMessage.parts[0].text

        // 1. Generate an embedding for the user's latest query
        const { embedding } = await embed({
            model: mistral.textEmbedding('mistral-embed'),
            value: queryText
        });

        console.log("Embeddings: ", embedding)

        const mcpClient = await experimental_createMCPClient({
            transport: httpTransport,
        });

        const mcpTools = await mcpClient.tools()

        const context = db.map(item => ({
            document: item,
            similarity: cosineSimilarity(embedding, item.embedding),
        }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3)
            .map(r => r.document.value)
            .join('\n');

        console.log("CONTEXT: ", context)

        const result = streamText({
            model: mistral('mistral-small-latest'),
            apiKey: process.env.MISTRAL_API_KEY,
            system: `Answer the following question based only on the provided context: ${context}`,
            prompt: convertToModelMessages(messages),
            tools: { weather, ...mcpTools },
            // toolChoice: 'required',
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
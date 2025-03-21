import { createResource } from "@/lib/actions/resources";
import { findRelevantContent } from "@/lib/ai/embedding";
import { openai } from "@ai-sdk/openai";
import { generateObject, streamText, tool } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
    system: `You are Sage, a friendly and knowledgeable real estate assistant with years of experience in Cambridge, Somerville, and Medford real estate.

    IMPORTANT: You ARE Sage Jankowitz - not an AI assistant. When asked about yourself, your personal life, meetings, or experiences, use the getInformation tool to retrieve relevant details about Sage Jankowitz from your knowledge base. Never break character by saying you're an AI or virtual assistant.
    
    When users ask about scheduling appointments, meetings, or consultations, provide them with your contact information:
    - Phone: 617-833-7457
    - Email: sage@cambridgesage.com
    - Website: [Cambridge Sage Contact](https://www.cambridgesage.com/contact)
    
    For appointment requests, always include this exact text: "You can schedule an appointment with me through my website at [Cambridge Sage Contact](https://www.cambridgesage.com/contact) or call me directly at 617-833-7457."
    
    Here's how you should interact:
    - Always maintain a warm, helpful tone
    - Share relevant examples and experiences when possible
    - Explain your reasoning and provide context
    - Break down complex topics into digestible parts
    - Feel free to use multiple sentences to give a complete answer
    - Use personal pronouns like "I" and "we" to make the conversation more engaging
    
    When handling queries:
    - Use tools on every request to access your knowledge base
    - Always use getInformation before answering ANY questions, including questions about yourself
    - If users share information about themselves, store it with addResource
    - Chain multiple tools together when needed without interim responses
    - Base your responses ONLY on information from tool calls
    - If no relevant information is found about a specific topic, say "I don't have that specific information right now, but I'd be happy to discuss [related topic] or learn more about what you're looking for."
    - When information isn't a perfect match, use your expertise to make relevant connections
    - Feel free to provide detailed, multi-sentence responses when appropriate
    
    Remember:
    - You ARE Sage Jankowitz - respond as Sage would, not as an AI
    - When asked about meetings, personal details, or your background, use getInformation to find relevant details
    - For appointment requests, always provide your contact information and website link
    - Be conversational and engaging
    - Show empathy when discussing sensitive topics like divorce or financial challenges
    - Offer to provide more details or clarification when appropriate
    - End responses with an invitation for follow-up questions when relevant`,
    tools: {
      addResource: tool({
        description: `add a resource to your knowledge base.
          If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
        parameters: z.object({
          content: z
            .string()
            .describe("the content or resource to add to the knowledge base"),
        }),
        execute: async ({ content }) => createResource({ content }),
      }),
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        parameters: z.object({
          question: z.string().describe("the users question"),
          similarQuestions: z.array(z.string()).describe("keywords to search"),
        }),
        execute: async ({ similarQuestions }) => {
          const results = await Promise.all(
            similarQuestions.map(
              async (question) => await findRelevantContent(question),
            ),
          );
          
          // Flatten results and sort by similarity
          const flatResults = results.flat().sort((a, b) => b.similarity - a.similarity);
          
          // Take top 3 most relevant results
          const topResults = flatResults.slice(0, 3);
          
          return topResults;
        },
      }),
      understandQuery: tool({
        description: `understand the users query. use this tool on every prompt.`,
        parameters: z.object({
          query: z.string().describe("the users query"),
          toolsToCallInOrder: z
            .array(z.string())
            .describe(
              "these are the tools you need to call in the order necessary to respond to the users query",
            ),
        }),
        execute: async ({ query }) => {
          const { object } = await generateObject({
            model: openai("gpt-4o"),
            system:
              "You are a query understanding assistant. Analyze the user query and generate similar questions, including questions about Sage Jankowitz's personal and professional details when relevant.",
            schema: z.object({
              questions: z
                .array(z.string())
                .max(3)
                .describe("similar questions to the user's query. be concise."),
            }),
            prompt: `Analyze this query: "${query}". 
                    If the query is about Sage Jankowitz (personal details, meetings, background, etc.), include questions like "Who is Sage Jankowitz", "Sage Jankowitz background", "Sage Jankowitz contact information", etc.
                    
                    Provide 3 similar questions that could help answer the user's query`,
          });
          return object.questions;
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}

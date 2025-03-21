import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { embeddings } from "../db/schema/embeddings";
import { db } from "../db";

const embeddingModel = openai.embedding("text-embedding-3-small");

const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split(".")
    .filter((i) => i !== "");
};

export const generateEmbeddings = async (
  value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\n", " ");
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  console.log("Query embedding length:", userQueryEmbedded.length);

  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, userQueryEmbedded)})`;

  // Log raw results without filtering
  const allGuides = await db
    .select({ id: embeddings.id, content: embeddings.content, similarity })
    .from(embeddings)
    .orderBy((t) => desc(t.similarity))
    .limit(4);

  // Then apply your filter
  const similarGuides = allGuides.filter(guide => guide.similarity > 0.1);

  return similarGuides.length > 0 ? similarGuides : allGuides.slice(0, 2);
};

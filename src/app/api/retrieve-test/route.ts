import { NextResponse } from "next/server";
import { CohereClientV2 } from "cohere-ai";
import { Pinecone } from "@pinecone-database/pinecone";

const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });



export async function POST(request: Request) {
  const body = await request.json();
  console.log("Received body:", body);
  const { question } = body;

  // 1. Embed the question — note inputType is different from ingestion
  const embedResponse = await cohere.embed({
    texts: [question],
    model: "embed-v4.0",
    inputType: "search_query",
    embeddingTypes: ["float"],
    outputDimension: 1024,
  });

  const queryVector = embedResponse.embeddings.float![0];

  // 2. Ask Pinecone for the closest chunks
  const index = pinecone.index("quizora");
  const results = await index.query({
    vector: queryVector,
    topK: 3,
    includeMetadata: true,
  });

  return NextResponse.json({
    matches: results.matches.map((m) => ({
      score: m.score,
      filename: m.metadata?.filename,
      text: m.metadata?.text,
    })),
  });
}
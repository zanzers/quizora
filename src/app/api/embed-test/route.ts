import { CohereClientV2 } from "cohere-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { NextResponse } from "next/server";

const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function GET() {
  // 1. Embed a test sentence
  const embedResponse = await cohere.embed({
    texts: ["CAP theorem trades off consistency and availability during a network partition."],
    model: "embed-v4.0",
    inputType: "search_document",
    embeddingTypes: ["float"],
    outputDimension: 1024,
  });

  const vector = embedResponse.embeddings.float![0];

  // 2. Upsert it into Pinecone
  const index = pinecone.index("quizora");
 await index.upsert({
  records: [
    {
      id: "test-chunk-1",
      values: vector,
      metadata: { text: "CAP theorem trades off consistency and availability during a network partition." },
    },
  ],
});

  return NextResponse.json({ success: true, dimension: vector.length });
}
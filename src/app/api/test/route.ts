
import { CohereClientV2 } from "cohere-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });


export async function POST(request: Request) {
  const { topic, count } = await request.json();

  const embedResponse = await cohere.embed({
    texts: [topic],
    model: "embed-v4.0",
    inputType: "search_query",
    embeddingTypes: ["float"],
    outputDimension: 1024,
  });
  const queryVector = embedResponse.embeddings.float![0];

  const index = pinecone.index("quizora");
  const results = await index.query({
    vector: queryVector,
    topK: 4,
    includeMetadata: true,
  });

  const relevantChunks = results.matches.filter((m) => (m.score ?? 0) > 0.4);

  if(relevantChunks.length === 0){
    return NextResponse.json(
      {error: "Couldn't find relevant content in your uploaded documents for this topic."},
      {status: 404}
    );
  }

  const context = relevantChunks.map((m) => m.metadata?.text).join("\n\n--\n\n");

  
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate quiz questions. Always respond with ONLY valid JSON, no markdown, no explanation.",
      },
      {
        role: "user",
        content: `Create ${count} quiz questions about ${topic}. Mix multiple_choice and fill_in_blank types roughly evenly. Respond in this exact JSON shape:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "string",
      "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
      "correct": "A"
    },
    {
      "type": "fill_in_blank",
      "question": "string with a ____ blank in it",
      "correct": "string"
    }
  ]
}`,
      },
    ],
  });

  const quizData = JSON.parse(response.choices[0].message.content!);
  return NextResponse.json({
    ...quizData,
    sources: [...new Set(relevantChunks.map((m) => m.metadata?.filename))],
  });
}
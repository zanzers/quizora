import Groq from "groq-sdk";
import { Pinecone } from "@pinecone-database/pinecone";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function POST(request: Request) {
  const { documentId, filename, count } = await request.json();

  const index = pinecone.index("quizora");

  // Filter by documentId, not similarity — we want THIS document's
  // chunks, not "chunks similar to some topic". A zero vector works
  // fine here since the filter alone determines the result set.
  const results = await index.query({
    vector: new Array(1024).fill(0),
    filter: { documentId: { $eq: documentId } },
    topK: 50,
    includeMetadata: true,
  });

  if (results.matches.length === 0) {
    return NextResponse.json({ error: "No content found for this document." }, { status: 404 });
  }

  const context = results.matches.map((m) => m.metadata?.text).join("\n\n---\n\n");

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate quiz questions strictly based on the provided context. Do not use outside knowledge. Always respond with ONLY valid JSON, no markdown.",
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nCreate ${count} quiz questions covering the material above. Mix multiple_choice and fill_in_blank types roughly evenly. Respond in this exact JSON shape:
{
  "questions": [
    { "type": "multiple_choice", "question": "string", "options": { "A": "string", "B": "string", "C": "string", "D": "string" }, "correct": "A" },
    { "type": "fill_in_blank", "question": "string with a ____ blank in it", "correct": "string" }
  ]
}`,
      },
    ],
  });

  const quizData = JSON.parse(response.choices[0].message.content!);

  return NextResponse.json({
    questions: quizData.questions,
    sources: [filename],
  });
}
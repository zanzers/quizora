import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function withCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  const { text, count } = await request.json();

  if (!text || text.trim().length === 0) {
    return withCors(NextResponse.json({ error: "No content provided." }, { status: 400 }));
  }

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate quiz questions strictly based on the provided note content. Do not use outside knowledge. Always respond with ONLY valid JSON, no markdown.",
      },
      {
        role: "user",
        content: `Note content:\n${text}\n\nCreate ${count} quiz questions covering this material. Mix multiple_choice and fill_in_blank types roughly evenly. Respond in this exact JSON shape:
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
  return withCors(NextResponse.json(quizData));
}
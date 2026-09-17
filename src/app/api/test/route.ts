import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  const { topic, count } = await request.json();

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
  return NextResponse.json(quizData);
}
import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function withCors(response: NextResponse){
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}


export async function OPTIONS(){
  return withCors(new NextResponse(null, {status: 204 }));
}


export async function POST(request: Request) {
  const { items } = await request.json();

  if (!items || items.length === 0) {
    return withCors(NextResponse.json({ results: [] }));
  }

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          `You grade fill-in-the-blank quiz answers. 
          Judge whether the student's answer means the same thing as the correct answer, 
          allowing for different phrasing, articles (a/the), capitalization, and minor wording differences. 
          Respond with ONLY valid JSON, no markdown.`,
      },
      {
        role: "user",
        content: 
        `Grade each of these answers. 
        Respond in this exact JSON shape, 
        with one result per item in the same order:
{
  "results": [
    { "correct": true }
  ]
}

Items to grade:
${JSON.stringify(items, null, 2)}`,
      },
    ],
  });

  const graded = JSON.parse(response.choices[0].message.content!);
  return withCors(NextResponse.json(graded));
}
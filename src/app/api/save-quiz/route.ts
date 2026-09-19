import { NextResponse } from "next/server";
import { db } from "@/db";
import { quizzes } from "@/db/schema";
import { customAlphabet } from "nanoid";

const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
const segment4 = customAlphabet(alphabet, 4);
const segment3 = customAlphabet(alphabet, 3);

function generateCode() {
  return `${segment4()}-${segment3()}-${segment4()}`;
}

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
  const { title, topic, questions, sources } = await request.json();
  const code = generateCode();

  await db.insert(quizzes).values({ code, title, topic, questions, sources });

  return withCors(NextResponse.json({ code, title }));
}
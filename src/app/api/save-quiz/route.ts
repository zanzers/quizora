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

export async function POST(request: Request) {
  const { title, topic, questions, sources } = await request.json();
  const code = generateCode();

  await db.insert(quizzes).values({ code, title, topic, questions, sources });

  return NextResponse.json({ code, title });
}
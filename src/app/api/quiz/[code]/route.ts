import { db } from "@/db";
import { quizzes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function withCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.code, code));

  if (!quiz) {
    return withCors(NextResponse.json({ error: "Quiz not found" }, { status: 404 }));
  }

  return withCors(NextResponse.json(quiz));
}
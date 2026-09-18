import { NextResponse } from "next/server";
import { db } from "@/db";
import { quizzes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildQuizPdf } from "@/lib/buildQuizPdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const includeAnswers = searchParams.get("answers") === "true";

  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.code, code));

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const pdfBuffer = await buildQuizPdf(
    quiz.title,
    quiz.questions as any,
    includeAnswers
  );

  const filename = includeAnswers
    ? `${quiz.title} - Answer Key.pdf`
    : `${quiz.title} - Worksheet.pdf`;

  const pdfBody = new ArrayBuffer(pdfBuffer.byteLength);
  new Uint8Array(pdfBody).set(pdfBuffer);

  return new NextResponse(pdfBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
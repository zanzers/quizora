import { db } from "@/db";
import { quizzes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";


export async function GET(request: Request, { params }: {params: Promise<{code: string }>}){

    const { code } = await params;
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.code, code));

    if(!quiz){
        return NextResponse.json({error: "Quiz not found"}, { status: 404});
    }
    return NextResponse.json(quiz);
}




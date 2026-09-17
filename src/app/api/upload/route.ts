import { encode, decode } from "gpt-tokenizer";
import { NextResponse } from "next/server";


const CHUNK_SIZE = 600;
const OVERLAP = 100;


function chunkText(text: string){
    const tokens = encode(text)
    const chunks: string[] =[]

    let start = 0;
    while( start < tokens.length){
        const end = Math.min(start + CHUNK_SIZE, tokens.length);
        const chunkTokens = tokens.slice(start, end);
        chunks.push(decode(chunkTokens));
        start += CHUNK_SIZE - OVERLAP;
    }
    return chunks;
}



export async function POST(request: Request) {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if(!file){
        return NextResponse.json(
            {
            error: "No file provided"
            },
            {
            status: 400
            }
    )}

    const text = await file.text();
    const chunks = chunkText(text);


    return NextResponse.json({
        filename: file.name,
        size: file.size,
        chucks: chunks.map((chunk, i) => ({
            chunkIndex: i,
            text: chunk,
        }))
    });
}



import { encode, decode } from "gpt-tokenizer";
import { NextResponse } from "next/server";
import { CohereClientV2 } from "cohere-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PDFParse } from "pdf-parse";


const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });



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

async function extractText(file: File): Promise<string>{
    if(file.type === "application/pdf" || file.name.endsWith(".pdf")){
        const buffer = Buffer.from(await file.arrayBuffer());
        const parser = new PDFParse({data: buffer});
       const result = await parser.getText();
       await parser.destroy();
       return result.text;
    }

    return await file.text();
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

    const text = await extractText(file);

    if(!text || text.trim().length === 0){
        return NextResponse.json(
            {error: "Couldn't extract any text from this file."},
            { status: 400 }
        );
    }


    const chunks = chunkText(text);
    const documentId = crypto.randomUUID();


    const embedResponse = await cohere.embed({
        texts: chunks,
        model: "embed-v4.0",
        inputType: "search_document",
        embeddingTypes: ["float"],
        outputDimension: 1024,
    });

    const vectors = embedResponse.embeddings.float!;

    const records = chunks.map((chunkText, i) => ({
        id: `${documentId}-chunk-${i}`,
        values: vectors[i],
        metadata: {
            text: chunkText,
            filename: file.name,
            documentId,
            chunkIndex: i,
        },
    }));

    const index = pinecone.index("quizora");
    await index.upsert({ records });



    return NextResponse.json({
        filename: file.name,
        documentId,
        totalChunks: chunks.length,
    });
}



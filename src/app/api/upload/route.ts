import { encode, decode } from "gpt-tokenizer";
import { NextResponse } from "next/server";
import { CohereClientV2 } from "cohere-ai";
import { Pinecone } from "@pinecone-database/pinecone";


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



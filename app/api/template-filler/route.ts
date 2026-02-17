// app/api/template-filler/route.ts
// Real API endpoint that processes DOCX templates using AI via SSE

import { NextResponse } from "next/server";
import { DocFill } from "@/sdk/typescript/src/index";
import type { ProgressCallback } from "@/lib/agents/types/state";

export const runtime = "nodejs";
export const maxDuration = 120; // Allow up to 2 minutes for AI processing

// Helper to create SSE event string
function sseEvent(type: string, data: Record<string, unknown>): string {
    return `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
}

export async function POST(req: Request) {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
        return NextResponse.json(
            { error: "Use multipart/form-data with a DOCX file" },
            { status: 400 }
        );
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prompt = form.get("prompt")?.toString().trim() || "";

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!prompt) {
        return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    // Validate file type
    const isDocx =
        file.name.endsWith(".docx") ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!isDocx) {
        return NextResponse.json(
            { error: "Only .docx files are supported" },
            { status: 400 }
        );
    }

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
            { error: "OPENAI_API_KEY is not configured. Please set it in your .env.local file." },
            { status: 500 }
        );
    }

    const encoder = new TextEncoder();

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileName = file.name;

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Send start event
                controller.enqueue(
                    encoder.encode(
                        sseEvent("start", {
                            message: "Starting document analysis...",
                        })
                    )
                );

                // Progress callback that streams events to the client
                const onProgress: ProgressCallback = (event) => {
                    try {
                        controller.enqueue(
                            encoder.encode(sseEvent(event.type, {
                                message: event.message,
                                data: event.data,
                            }))
                        );
                    } catch {
                        // Controller may be closed if client disconnected
                    }
                };

                // Use the SDK!
                const df = new DocFill({
                    onProgress,
                });

                const result = await df.fill({
                    file: fileBuffer,
                    prompt,
                });

                // Convert the filled DOCX buffer to base64 for download
                const base64 = result.buffer.toString("base64");
                const baseName = fileName.replace(/\.docx$/i, "");

                // Send completion event with download data
                controller.enqueue(
                    encoder.encode(
                        sseEvent("complete", {
                            message: "Document ready for download!",
                            success: true,
                            documentSummary: result.documentSummary,
                            changes: result.changes,
                            metadata: result.metadata,
                            download: {
                                filename: `${baseName}.filled.docx`,
                                mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                base64,
                            },
                        })
                    )
                );

                controller.close();
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Unknown error";
                console.error("[template-filler] Workflow error:", err);

                try {
                    controller.enqueue(
                        encoder.encode(sseEvent("error", { message }))
                    );
                } catch {
                    // Controller may already be closed
                }

                controller.close();
            }
        },
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}

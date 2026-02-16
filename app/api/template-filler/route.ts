// app/api/template-filler/route.ts
// Mock API endpoint that simulates the AI template filling workflow via SSE

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Helper to create SSE event string
function sseEvent(type: string, data: Record<string, unknown>): string {
    return `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
}

// Simulate a delay
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

    const encoder = new TextEncoder();

    // Mock slots that simulate AI detection
    const mockSlots = [
        {
            id: "slot-1",
            originalText: "[Client Name]",
            filledValue: "Acme Corporation Ltd.",
            source: "user_prompt",
            confidence: 0.95,
            reasoning: "Extracted directly from user instructions mentioning 'Acme Corp'",
        },
        {
            id: "slot-2",
            originalText: "[Date]",
            filledValue: new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }),
            source: "ai_generated",
            confidence: 0.99,
            reasoning: "User requested 'today's date' — using current date",
        },
        {
            id: "slot-3",
            originalText: "[Contract Duration]",
            filledValue: "12 months",
            source: "user_prompt",
            confidence: 0.92,
            reasoning: "User specified 'Set duration to 12 months'",
        },
        {
            id: "slot-4",
            originalText: "[Total Amount]",
            filledValue: "$50,000.00",
            source: "ai_generated",
            confidence: 0.78,
            reasoning: "Inferred from contract type and standard pricing",
        },
        {
            id: "slot-5",
            originalText: "[Governing Law]",
            filledValue: "Laws of the State of California, United States",
            source: "ai_generated",
            confidence: 0.85,
            reasoning: "Default jurisdiction based on company registration",
        },
        {
            id: "slot-6",
            originalText: "[Signatory Name]",
            filledValue: "John Smith, CEO",
            source: "user_prompt",
            confidence: 0.9,
            reasoning: "Extracted from user prompt context",
        },
    ];

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Phase 1: Start
                controller.enqueue(
                    encoder.encode(
                        sseEvent("start", {
                            message: "Starting document analysis...",
                        })
                    )
                );
                await delay(800);

                // Phase 2: Extracting content
                controller.enqueue(
                    encoder.encode(
                        sseEvent("phase", {
                            message: "Extracting content from DOCX file...",
                        })
                    )
                );
                await delay(1200);

                controller.enqueue(
                    encoder.encode(
                        sseEvent("thought", {
                            message: `Document "${file.name}" loaded (${(file.size / 1024).toFixed(1)} KB). Parsing XML structure...`,
                        })
                    )
                );
                await delay(600);

                // Phase 3: Analyzing
                controller.enqueue(
                    encoder.encode(
                        sseEvent("phase", {
                            message: "Analyzing document for fillable fields...",
                        })
                    )
                );
                await delay(1500);

                controller.enqueue(
                    encoder.encode(
                        sseEvent("thought", {
                            message: "Detected document type: Service Agreement / Contract template",
                        })
                    )
                );
                await delay(500);

                controller.enqueue(
                    encoder.encode(
                        sseEvent("slot_detected", {
                            message: `Found ${mockSlots.length} fillable fields in the template`,
                            data: { count: mockSlots.length },
                        })
                    )
                );
                await delay(800);

                // Phase 4: Filling slots one by one
                controller.enqueue(
                    encoder.encode(
                        sseEvent("phase", {
                            message: "Matching your instructions to detected fields...",
                        })
                    )
                );
                await delay(600);

                for (const slot of mockSlots) {
                    controller.enqueue(
                        encoder.encode(
                            sseEvent("thought", {
                                message: `Analyzing field: "${slot.originalText}"...`,
                            })
                        )
                    );
                    await delay(700);

                    controller.enqueue(
                        encoder.encode(
                            sseEvent("slot_filled", {
                                message: `Filled "${slot.originalText}" → "${slot.filledValue}"`,
                                data: { slot },
                            })
                        )
                    );
                    await delay(400);
                }

                // Phase 5: Building document
                controller.enqueue(
                    encoder.encode(
                        sseEvent("phase", {
                            message: "Rebuilding final DOCX document...",
                        })
                    )
                );
                await delay(1000);

                controller.enqueue(
                    encoder.encode(
                        sseEvent("thought", {
                            message: "All formatting preserved. Document rebuilt successfully.",
                        })
                    )
                );
                await delay(500);

                // Phase 6: Complete
                const baseName = file.name.replace(/\.docx$/i, "");
                controller.enqueue(
                    encoder.encode(
                        sseEvent("complete", {
                            message: "Document ready for download!",
                            success: true,
                            documentSummary: "Service Agreement / Contract Template",
                            changes: mockSlots,
                            metadata: {
                                totalSlots: mockSlots.length,
                                filledSlots: mockSlots.length,
                                skippedSlots: 0,
                                processingTimeMs: 8500,
                            },
                            download: {
                                filename: `${baseName}.filled.docx`,
                                mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                // In a real implementation, this would be the actual filled DOCX as base64
                                // For the mock, we'll send back the original file content
                                base64: "", // Empty for mock — download won't produce a real file
                            },
                        })
                    )
                );

                controller.close();
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Unknown error";
                controller.enqueue(
                    encoder.encode(sseEvent("error", { message }))
                );
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

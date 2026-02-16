// lib/hooks/useTemplateFiller.ts
"use client";

import { useState, useRef, useCallback } from "react";
import type {
    AppView,
    WorkflowEvent,
    FilledSlot,
    TemplateFillerResult,
} from "../types";

interface UseTemplateFillerReturn {
    view: AppView;
    file: File | null;
    prompt: string;
    thoughts: WorkflowEvent[];
    slots: FilledSlot[];
    result: TemplateFillerResult | null;
    error: string | null;
    isLoading: boolean;

    setFile: (f: File | null) => void;
    setPrompt: (p: string) => void;
    generate: () => Promise<void>;
    reset: () => void;
}

export function useTemplateFiller(): UseTemplateFillerReturn {
    const [view, setView] = useState<AppView>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState("");
    const [thoughts, setThoughts] = useState<WorkflowEvent[]>([]);
    const [slots, setSlots] = useState<FilledSlot[]>([]);
    const [result, setResult] = useState<TemplateFillerResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const abortRef = useRef<AbortController | null>(null);

    const reset = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setView("upload");
        setFile(null);
        setPrompt("");
        setThoughts([]);
        setSlots([]);
        setResult(null);
        setError(null);
        setIsLoading(false);
    }, []);

    const generate = useCallback(async () => {
        if (!file || !prompt.trim()) return;

        setError(null);
        setThoughts([]);
        setSlots([]);
        setResult(null);
        setIsLoading(true);
        setView("generating");

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("prompt", prompt);

            const res = await fetch("/api/template-filler", {
                method: "POST",
                body: fd,
                signal: controller.signal,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(
                    errData.error || `Server error (${res.status})`
                );
            }

            // Parse SSE stream
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No response body");

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("event: ")) {
                        // We'll read the event type from the next data line
                        continue;
                    }
                    if (line.startsWith("data: ")) {
                        try {
                            const payload = JSON.parse(line.slice(6));
                            const event: WorkflowEvent = {
                                type: payload.type || "thought",
                                message: payload.message || "",
                                data: payload.data || payload,
                            };

                            setThoughts((prev) => [...prev, event]);

                            // Update slots if slot data is present
                            if (event.type === "slot_filled" && payload.data?.slot) {
                                setSlots((prev) => [...prev, payload.data.slot]);
                            }

                            // Handle completion
                            if (event.type === "complete" && payload.success) {
                                const finalResult: TemplateFillerResult = {
                                    success: true,
                                    documentSummary: payload.documentSummary || "",
                                    changes: payload.changes || [],
                                    metadata: payload.metadata || {
                                        totalSlots: 0,
                                        filledSlots: 0,
                                        skippedSlots: 0,
                                        processingTimeMs: 0,
                                    },
                                    download: payload.download || {
                                        filename: "filled.docx",
                                        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                        base64: "",
                                    },
                                };
                                setResult(finalResult);
                                setView("result");
                            }

                            // Handle error events
                            if (event.type === "error") {
                                throw new Error(payload.message || "Processing failed");
                            }
                        } catch (parseErr) {
                            // Skip non-JSON data lines
                        }
                    }
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") return;
            const message =
                err instanceof Error ? err.message : "An unexpected error occurred";
            setError(message);
            setView("upload");
        } finally {
            setIsLoading(false);
            abortRef.current = null;
        }
    }, [file, prompt]);

    return {
        view,
        file,
        prompt,
        thoughts,
        slots,
        result,
        error,
        isLoading,
        setFile,
        setPrompt,
        generate,
        reset,
    };
}

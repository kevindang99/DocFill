// app/components/ResultView.tsx
"use client";

import {
    Download,
    ArrowLeft,
    FileText,
    CheckCircle2,
    Clock,
    BarChart3,
    Brain,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { SlotCard } from "./SlotCard";
import { ThoughtStream } from "./ThoughtStream";
import type { TemplateFillerResult, WorkflowEvent } from "@/lib/types";

interface ResultViewProps {
    result: TemplateFillerResult;
    thoughts: WorkflowEvent[];
    onReset: () => void;
}

export function ResultView({ result, thoughts, onReset }: ResultViewProps) {
    const [showThoughts, setShowThoughts] = useState(false);

    const handleDownload = () => {
        if (!result.download.base64) return;

        const binaryString = atob(result.download.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: result.download.mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.download.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="animate-fade-in flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={onReset} className="btn-ghost text-sm">
                    <ArrowLeft className="w-4 h-4" />
                    New Document
                </button>
            </div>

            {/* Success banner */}
            <div
                className="glass-card p-6 mb-6 text-center relative overflow-hidden"
                style={{ border: "1px solid rgba(52, 211, 153, 0.2)" }}
            >
                {/* Glow effect */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: "radial-gradient(ellipse at 50% 0%, rgba(52, 211, 153, 0.08) 0%, transparent 60%)",
                    }}
                />

                <div className="relative z-10">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: "rgba(52, 211, 153, 0.15)" }}
                    >
                        <CheckCircle2 className="w-7 h-7" style={{ color: "var(--accent-emerald)" }} />
                    </div>
                    <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                        Document Ready
                    </h2>
                    <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                        {result.documentSummary}
                    </p>
                    <button onClick={handleDownload} className="btn-primary text-sm">
                        <Download className="w-4 h-4" />
                        Download {result.download.filename}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                    {
                        icon: FileText,
                        label: "Total Fields",
                        value: result.metadata.totalSlots,
                        color: "var(--accent-blue)",
                    },
                    {
                        icon: CheckCircle2,
                        label: "Filled",
                        value: result.metadata.filledSlots,
                        color: "var(--accent-emerald)",
                    },
                    {
                        icon: BarChart3,
                        label: "Skipped",
                        value: result.metadata.skippedSlots,
                        color: "var(--accent-amber)",
                    },
                    {
                        icon: Clock,
                        label: "Time",
                        value: `${(result.metadata.processingTimeMs / 1000).toFixed(1)}s`,
                        color: "var(--accent-indigo)",
                    },
                ].map((stat) => (
                    <div key={stat.label} className="glass-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                                {stat.label}
                            </span>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filled slots list */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <h3
                    className="text-sm font-semibold mb-3 shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                >
                    Filled Fields
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 stagger-children">
                    {result.changes.map((slot, i) => (
                        <SlotCard key={slot.id} slot={slot} index={i} />
                    ))}
                </div>
            </div>

            {/* Collapsible AI Reasoning */}
            <div className="mt-4 shrink-0">
                <button
                    onClick={() => setShowThoughts(!showThoughts)}
                    className="flex items-center gap-2 w-full p-3 rounded-lg transition-colors text-sm font-medium"
                    style={{
                        background: "var(--bg-card)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-default)",
                    }}
                >
                    <Brain className="w-4 h-4" style={{ color: "var(--accent-indigo)" }} />
                    AI Reasoning ({thoughts.length} steps)
                    {showThoughts ? (
                        <ChevronUp className="w-4 h-4 ml-auto" />
                    ) : (
                        <ChevronDown className="w-4 h-4 ml-auto" />
                    )}
                </button>
                {showThoughts && (
                    <div
                        className="mt-2 glass-card max-h-64 overflow-y-auto"
                        style={{ animationDelay: "0s" }}
                    >
                        <ThoughtStream thoughts={thoughts} className="p-3" />
                    </div>
                )}
            </div>
        </div>
    );
}

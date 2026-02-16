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
    Eye,
    ListChecks,
} from "lucide-react";
import { useState } from "react";
import { SlotCard } from "./SlotCard";
import { ThoughtStream } from "./ThoughtStream";
import { DocumentPreview } from "./DocumentPreview";
import type { TemplateFillerResult, WorkflowEvent } from "@/lib/types";

interface ResultViewProps {
    result: TemplateFillerResult;
    thoughts: WorkflowEvent[];
    onReset: () => void;
}

type ResultTab = "preview" | "fields" | "reasoning";

export function ResultView({ result, thoughts, onReset }: ResultViewProps) {
    const [activeTab, setActiveTab] = useState<ResultTab>("preview");

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

    const tabs: { id: ResultTab; label: string; icon: React.ElementType; badge?: string }[] = [
        { id: "preview", label: "Preview", icon: Eye },
        { id: "fields", label: "Fields", icon: ListChecks, badge: `${result.metadata.filledSlots}` },
        { id: "reasoning", label: "AI Reasoning", icon: Brain, badge: `${thoughts.length}` },
    ];

    return (
        <div className="animate-fade-in flex flex-col h-full">
            {/* Header bar */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <button onClick={onReset} className="btn-ghost text-xs">
                        <ArrowLeft className="w-4 h-4" />
                        New
                    </button>
                    <div className="flex items-center gap-2">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: "var(--accent-emerald)" }}
                        />
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {result.documentSummary}
                        </span>
                    </div>
                </div>

                <button onClick={handleDownload} className="btn-primary text-xs py-2.5 px-5">
                    <Download className="w-4 h-4" />
                    Download {result.download.filename}
                </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mb-5 shrink-0">
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
                    <div key={stat.label} className="glass-card p-3.5">
                        <div className="flex items-center gap-2 mb-1.5">
                            <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                            <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                                {stat.label}
                            </span>
                        </div>
                        <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Tab bar */}
            <div
                className="flex gap-1 p-1 rounded-xl mb-4 shrink-0"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
            >
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center"
                            style={{
                                background: isActive ? "var(--bg-surface)" : "transparent",
                                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                                boxShadow: isActive ? "var(--shadow-sm)" : "none",
                            }}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {tab.badge && (
                                <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{
                                        background: isActive ? "rgba(99, 102, 241, 0.15)" : "var(--border-default)",
                                        color: isActive ? "var(--accent-indigo)" : "var(--text-muted)",
                                    }}
                                >
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === "preview" && (
                    <div className="h-full animate-fade-in">
                        <DocumentPreview
                            previewHtml=""
                            changes={result.changes}
                            filename={result.download.filename}
                        />
                    </div>
                )}

                {activeTab === "fields" && (
                    <div className="h-full overflow-y-auto space-y-3 stagger-children animate-fade-in">
                        {result.changes.map((slot, i) => (
                            <SlotCard key={slot.id} slot={slot} index={i} />
                        ))}
                    </div>
                )}

                {activeTab === "reasoning" && (
                    <div className="h-full glass-card overflow-hidden animate-fade-in">
                        <ThoughtStream thoughts={thoughts} className="h-full p-3" />
                    </div>
                )}
            </div>
        </div>
    );
}

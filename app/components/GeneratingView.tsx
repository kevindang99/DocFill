// app/components/GeneratingView.tsx
"use client";

import { Loader2, Sparkles, Brain, CheckCircle2 } from "lucide-react";
import { ThoughtStream } from "./ThoughtStream";
import type { WorkflowEvent, FilledSlot } from "@/lib/types";
import { SlotCard } from "./SlotCard";

interface GeneratingViewProps {
    thoughts: WorkflowEvent[];
    slots: FilledSlot[];
    onCancel: () => void;
}

export function GeneratingView({ thoughts, slots, onCancel }: GeneratingViewProps) {
    // Count different thought types
    const phaseCount = thoughts.filter((t) => t.type === "phase").length;
    const totalSteps = thoughts.length;

    return (
        <div className="animate-fade-in flex flex-col" style={{ height: "calc(100vh - 10rem)" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse-glow"
                        style={{ background: "rgba(99, 102, 241, 0.15)" }}
                    >
                        <Sparkles className="w-5 h-5" style={{ color: "var(--accent-indigo)" }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                            Filling Template
                        </h2>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            AI is analyzing and filling your document
                        </p>
                    </div>
                </div>
                <button
                    onClick={onCancel}
                    className="btn-ghost text-xs"
                >
                    Cancel
                </button>
            </div>

            {/* Content in two-column layout — fixed height, internally scrollable */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
                {/* Left: Thought Stream */}
                <div
                    className="glass-card flex flex-col min-h-0"
                    style={{ maxHeight: "100%", overflow: "hidden" }}
                >
                    <div
                        className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
                        style={{ borderColor: "var(--border-default)" }}
                    >
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--accent-blue)" }} />
                        <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                            AI Reasoning
                        </span>
                        <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-blue)" }}
                        >
                            {totalSteps} steps
                        </span>
                        <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto"
                            style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-blue)" }}
                        >
                            LIVE
                        </span>
                    </div>
                    <ThoughtStream
                        thoughts={thoughts}
                        className="flex-1 p-3 min-h-0 overflow-y-auto"
                    />
                </div>

                {/* Right: Detected Slots */}
                <div
                    className="glass-card flex flex-col min-h-0"
                    style={{ maxHeight: "100%", overflow: "hidden" }}
                >
                    <div
                        className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
                        style={{ borderColor: "var(--border-default)" }}
                    >
                        <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                            Detected Fields
                        </span>
                        {slots.length > 0 && (
                            <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto"
                                style={{ background: "rgba(52, 211, 153, 0.15)", color: "var(--accent-emerald)" }}
                            >
                                {slots.length} filled
                            </span>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                        {slots.length === 0 ? (
                            <div
                                className="flex flex-col items-center justify-center h-full"
                                style={{ color: "var(--text-muted)" }}
                            >
                                <Brain className="w-8 h-8 mb-3 opacity-30 animate-pulse" />
                                <div className="animate-shimmer w-32 h-4 rounded mb-3" />
                                <div className="animate-shimmer w-24 h-3 rounded" style={{ animationDelay: "0.2s" }} />
                                <p className="text-xs mt-4">Detecting placeholders...</p>
                            </div>
                        ) : (
                            <div className="stagger-children space-y-2">
                                {slots.map((slot, i) => (
                                    <SlotCard key={slot.id} slot={slot} index={i} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom progress bar */}
            <div className="mt-3 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                        {slots.length > 0
                            ? `Phase ${phaseCount}/5 · ${slots.length} fields filled`
                            : `Phase ${phaseCount}/5 · Analyzing...`}
                    </span>
                    {slots.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "var(--accent-emerald)" }}>
                            <CheckCircle2 className="w-3 h-3" />
                            Fields detected
                        </span>
                    )}
                </div>
                <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--border-default)" }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                            width: `${Math.min((phaseCount / 5) * 100, 95)}%`,
                            background: "var(--gradient-primary)",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

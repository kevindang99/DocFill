// app/components/GeneratingView.tsx
"use client";

import { Loader2, Sparkles } from "lucide-react";
import { ThoughtStream } from "./ThoughtStream";
import type { WorkflowEvent, FilledSlot } from "@/lib/types";
import { SlotCard } from "./SlotCard";

interface GeneratingViewProps {
    thoughts: WorkflowEvent[];
    slots: FilledSlot[];
    onCancel: () => void;
}

export function GeneratingView({ thoughts, slots, onCancel }: GeneratingViewProps) {
    return (
        <div className="animate-fade-in flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
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

            {/* Content in two-column layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 overflow-hidden">
                {/* Left: Thought Stream */}
                <div className="glass-card flex flex-col min-h-0 overflow-hidden">
                    <div
                        className="flex items-center gap-2 p-4 border-b shrink-0"
                        style={{ borderColor: "var(--border-default)" }}
                    >
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--accent-blue)" }} />
                        <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                            AI Reasoning
                        </span>
                        <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto"
                            style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-blue)" }}
                        >
                            LIVE
                        </span>
                    </div>
                    <ThoughtStream thoughts={thoughts} className="flex-1 p-3 min-h-0" />
                </div>

                {/* Right: Detected Slots */}
                <div className="glass-card flex flex-col min-h-0 overflow-hidden">
                    <div
                        className="flex items-center gap-2 p-4 border-b shrink-0"
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
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                        {slots.length === 0 ? (
                            <div
                                className="flex flex-col items-center justify-center py-12"
                                style={{ color: "var(--text-muted)" }}
                            >
                                <div className="animate-shimmer w-32 h-4 rounded mb-3" />
                                <div className="animate-shimmer w-24 h-3 rounded" style={{ animationDelay: "0.2s" }} />
                                <p className="text-xs mt-4">Detecting placeholders...</p>
                            </div>
                        ) : (
                            <div className="stagger-children space-y-3">
                                {slots.map((slot, i) => (
                                    <SlotCard key={slot.id} slot={slot} index={i} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom progress bar */}
            <div className="mt-4 shrink-0">
                <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ background: "var(--border-default)" }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                            width: slots.length > 0 ? "70%" : "30%",
                            background: "var(--gradient-primary)",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// app/components/SlotCard.tsx
"use client";

import { Check, Loader2, Clock, SkipForward } from "lucide-react";
import type { FilledSlot } from "@/lib/types";

interface SlotCardProps {
    slot: FilledSlot;
    index: number;
}

export function SlotCard({ slot, index }: SlotCardProps) {
    const statusConfig = {
        user_prompt: { label: "Done", badge: "badge-done", icon: Check },
        ai_generated: { label: "Done", badge: "badge-done", icon: Check },
        rag: { label: "Done", badge: "badge-done", icon: Check },
        skipped: { label: "Skipped", badge: "badge-skipped", icon: SkipForward },
    };

    const status = statusConfig[slot.source] || statusConfig.ai_generated;
    const StatusIcon = status.icon;

    return (
        <div
            className="glass-card p-4 animate-fade-in"
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    {/* Original text (placeholder) */}
                    <p
                        className="text-xs font-mono truncate mb-1"
                        style={{ color: "var(--text-muted)" }}
                    >
                        {slot.originalText}
                    </p>

                    {/* Filled value */}
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {slot.filledValue}
                    </p>

                    {/* Reasoning */}
                    {slot.reasoning && (
                        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            {slot.reasoning}
                        </p>
                    )}
                </div>

                {/* Status badge */}
                <span className={`badge ${status.badge} shrink-0`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                </span>
            </div>

            {/* Confidence bar */}
            <div className="mt-3">
                <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ background: "var(--border-default)" }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                            width: `${slot.confidence * 100}%`,
                            background:
                                slot.confidence >= 0.8
                                    ? "var(--accent-emerald)"
                                    : slot.confidence >= 0.5
                                        ? "var(--accent-amber)"
                                        : "var(--accent-rose)",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// Pending slot placeholder shown during generation
export function SlotCardPending({ name, index }: { name: string; index: number }) {
    return (
        <div
            className="glass-card p-4 animate-fade-in"
            style={{ animationDelay: `${index * 0.08}s` }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                        {name}
                    </p>
                    <div className="animate-shimmer h-4 rounded mt-2 w-3/4" />
                </div>
                <span className="badge badge-filling shrink-0">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Filling
                </span>
            </div>
        </div>
    );
}

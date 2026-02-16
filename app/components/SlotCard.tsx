// app/components/SlotCard.tsx
"use client";

import { Check, Loader2, SkipForward, ArrowRight } from "lucide-react";
import type { FilledSlot } from "@/lib/types";

interface SlotCardProps {
    slot: FilledSlot;
    index: number;
}

function ConfidenceRing({ value }: { value: number }) {
    const pct = Math.round(value * 100);
    const radius = 14;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - value * circumference;

    const color =
        value >= 0.8
            ? "var(--accent-emerald)"
            : value >= 0.5
                ? "var(--accent-amber)"
                : "var(--accent-rose)";

    const label =
        value >= 0.8 ? "High" : value >= 0.5 ? "Medium" : "Low";

    return (
        <div className="flex flex-col items-center gap-0.5" title={`AI Confidence: ${pct}% (${label})`}>
            <div className="relative w-9 h-9">
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                    {/* Background ring */}
                    <circle
                        cx="18"
                        cy="18"
                        r={radius}
                        fill="none"
                        stroke="var(--border-default)"
                        strokeWidth="3"
                    />
                    {/* Progress ring */}
                    <circle
                        cx="18"
                        cy="18"
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{
                            transition: "stroke-dashoffset 0.8s ease-out",
                        }}
                    />
                </svg>
                <span
                    className="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
                    style={{ color }}
                >
                    {pct}
                </span>
            </div>
        </div>
    );
}

export function SlotCard({ slot, index }: SlotCardProps) {
    const isSkipped = slot.source === "skipped";

    return (
        <div
            className="glass-card p-4 animate-fade-in"
            style={{
                animationDelay: `${index * 0.05}s`,
                opacity: isSkipped ? 0.6 : 1,
            }}
        >
            <div className="flex items-center gap-4">
                {/* Left: Content */}
                <div className="flex-1 min-w-0">
                    {/* Replacement: original → filled */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                            className="text-xs font-mono px-1.5 py-0.5 rounded"
                            style={{
                                background: "rgba(251, 113, 133, 0.1)",
                                color: "var(--accent-rose)",
                                textDecoration: isSkipped ? "none" : "line-through",
                                opacity: 0.8,
                            }}
                        >
                            {slot.originalText.length > 30
                                ? slot.originalText.slice(0, 30) + "…"
                                : slot.originalText}
                        </span>
                        {!isSkipped && (
                            <>
                                <ArrowRight className="w-3 h-3 shrink-0" style={{ color: "var(--text-muted)" }} />
                                <span
                                    className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                    style={{
                                        background: "rgba(52, 211, 153, 0.1)",
                                        color: "var(--accent-emerald)",
                                    }}
                                >
                                    {slot.filledValue.length > 40
                                        ? slot.filledValue.slice(0, 40) + "…"
                                        : slot.filledValue}
                                </span>
                            </>
                        )}
                        {isSkipped && (
                            <span
                                className="text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1"
                                style={{
                                    background: "rgba(100, 116, 139, 0.1)",
                                    color: "var(--text-muted)",
                                }}
                            >
                                <SkipForward className="w-3 h-3" />
                                Skipped
                            </span>
                        )}
                    </div>

                    {/* Reasoning */}
                    {slot.reasoning && (
                        <p className="text-[11px] leading-relaxed mt-1" style={{ color: "var(--text-muted)" }}>
                            {slot.reasoning}
                        </p>
                    )}
                </div>

                {/* Right: Confidence ring */}
                {!isSkipped && <ConfidenceRing value={slot.confidence} />}
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

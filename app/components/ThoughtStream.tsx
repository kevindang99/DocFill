// app/components/ThoughtStream.tsx
"use client";

import { useEffect, useRef } from "react";
import {
    Brain,
    Search,
    CheckCircle2,
    AlertCircle,
    Zap,
    FileSearch,
    PenTool,
} from "lucide-react";
import type { WorkflowEvent } from "@/lib/types";

interface ThoughtStreamProps {
    thoughts: WorkflowEvent[];
    className?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
    start: Zap,
    thought: Brain,
    phase: FileSearch,
    slot_detected: Search,
    slot_filling: PenTool,
    slot_filled: CheckCircle2,
    complete: CheckCircle2,
    error: AlertCircle,
};

const COLOR_MAP: Record<string, string> = {
    start: "var(--accent-cyan)",
    thought: "var(--accent-blue)",
    phase: "var(--accent-indigo)",
    slot_detected: "var(--accent-amber)",
    slot_filling: "var(--accent-blue)",
    slot_filled: "var(--accent-emerald)",
    complete: "var(--accent-emerald)",
    error: "var(--accent-rose)",
};

export function ThoughtStream({ thoughts, className = "" }: ThoughtStreamProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new thoughts
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [thoughts]);

    if (thoughts.length === 0) {
        return (
            <div
                className={`flex flex-col items-center justify-center py-12 ${className}`}
                style={{ color: "var(--text-muted)" }}
            >
                <Brain className="w-8 h-8 mb-3 animate-pulse opacity-40" />
                <p className="text-sm">Waiting for AI thoughts...</p>
            </div>
        );
    }

    return (
        <div ref={scrollRef} className={`space-y-1 overflow-y-auto ${className}`}>
            {thoughts.map((thought, i) => {
                const Icon = ICON_MAP[thought.type] || Brain;
                const color = COLOR_MAP[thought.type] || "var(--text-muted)";

                return (
                    <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg animate-fade-in transition-colors"
                        style={{
                            background: i === thoughts.length - 1 ? "var(--bg-card)" : "transparent",
                            animationDelay: `${Math.min(i * 0.05, 0.3)}s`,
                        }}
                    >
                        <div
                            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: `${color}15` }}
                        >
                            <Icon className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                {thought.message}
                            </p>
                            {thought.type === "phase" && (
                                <div
                                    className="h-0.5 mt-2 rounded-full overflow-hidden"
                                    style={{ background: "var(--border-default)" }}
                                >
                                    <div
                                        className="h-full rounded-full animate-shimmer"
                                        style={{
                                            width: "60%",
                                            background: `linear-gradient(90deg, ${color}40 0%, ${color} 50%, ${color}40 100%)`,
                                            backgroundSize: "200% 100%",
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

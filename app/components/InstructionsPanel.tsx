// app/components/InstructionsPanel.tsx
"use client";

import { Sparkles, Info } from "lucide-react";

interface InstructionsPanelProps {
    prompt: string;
    onPromptChange: (prompt: string) => void;
    disabled?: boolean;
}

const SUGGESTIONS = [
    "Fill all party names and addresses",
    "Set effective date to today",
    "Use standard legal clauses",
    "Complete all monetary amounts",
    "Fill in company registration details",
    "Add governing law clause",
];

export function InstructionsPanel({
    prompt,
    onPromptChange,
    disabled,
}: InstructionsPanelProps) {
    const addSuggestion = (tag: string) => {
        onPromptChange(prompt ? prompt + "\n- " + tag : "- " + tag);
    };

    return (
        <div className="space-y-3 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "var(--accent-indigo)" }} />
                <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    AI Instructions
                </label>
                <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full ml-auto"
                    style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--accent-indigo)" }}
                >
                    required
                </span>
            </div>

            {/* Textarea */}
            <textarea
                className="input-field flex-1 min-h-[160px]"
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="Describe how to fill this template...&#10;&#10;Examples:&#10;- Fill client name as 'Acme Corp'&#10;- Set contract duration to 12 months&#10;- Use today's date for all date fields"
                disabled={disabled}
            />

            {/* Tip */}
            <div
                className="flex items-start gap-2.5 p-3 rounded-xl text-xs leading-relaxed"
                style={{
                    background: "var(--bg-card)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-default)",
                }}
            >
                <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent-blue)" }} />
                <p>
                    Be specific about values, dates, and names. The AI will detect all fillable fields and match them to your instructions.
                </p>
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    Quick suggestions
                </p>
                <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => addSuggestion(tag)}
                            disabled={disabled}
                            className="chip"
                        >
                            <span style={{ color: "var(--accent-indigo)" }}>+</span>
                            {tag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

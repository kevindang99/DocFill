// app/components/DocumentPreview.tsx
"use client";

import { FileText, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";
import type { FilledSlot } from "@/lib/types";

interface DocumentPreviewProps {
    previewHtml: string;
    changes: FilledSlot[];
    filename: string;
}

export function DocumentPreview({ previewHtml, changes, filename }: DocumentPreviewProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={`glass-card flex flex-col overflow-hidden transition-all duration-300 ${expanded ? "fixed inset-4 z-50" : "relative"
                }`}
            style={expanded ? { boxShadow: "0 0 60px rgba(0,0,0,0.6)" } : {}}
        >
            {/* Backdrop for expanded mode */}
            {expanded && (
                <div
                    className="fixed inset-0 -z-10"
                    style={{ background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)" }}
                    onClick={() => setExpanded(false)}
                />
            )}

            {/* Toolbar */}
            <div
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid var(--border-default)" }}
            >
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" style={{ color: "var(--accent-indigo)" }} />
                    <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                        {filename}
                    </span>
                    <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(52, 211, 153, 0.15)", color: "var(--accent-emerald)" }}
                    >
                        PREVIEW
                    </span>
                </div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="p-1.5 rounded-md transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    title={expanded ? "Exit fullscreen" : "Fullscreen"}
                >
                    {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            </div>

            {/* Document body */}
            <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg-card)" }}>
                <div
                    className="mx-auto rounded-lg shadow-lg"
                    style={{
                        maxWidth: "680px",
                        background: "#ffffff",
                        color: "#1a1a2e",
                        padding: "48px 56px",
                        minHeight: expanded ? "calc(100vh - 200px)" : "400px",
                        fontFamily: "'Georgia', 'Times New Roman', serif",
                        fontSize: "14px",
                        lineHeight: "1.8",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                    }}
                >
                    {previewHtml ? (
                        <div
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                            className="document-preview-content"
                        />
                    ) : (
                        /* Fallback: render a document from filled slots */
                        <FallbackPreview changes={changes} />
                    )}
                </div>
            </div>

            {/* Legend */}
            <div
                className="flex items-center gap-4 px-4 py-2.5 shrink-0"
                style={{ borderTop: "1px solid var(--border-default)" }}
            >
                <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                    Legend:
                </span>
                <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                    <span
                        className="inline-block w-3 h-3 rounded-sm"
                        style={{ background: "rgba(52, 211, 153, 0.25)", border: "1px solid rgba(52, 211, 153, 0.5)" }}
                    />
                    AI-filled content
                </span>
            </div>
        </div>
    );
}

/** Fallback preview using slot data when no previewHtml is available */
function FallbackPreview({ changes }: { changes: FilledSlot[] }) {
    return (
        <div>
            {/* Mock document header */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px", color: "#1a1a2e" }}>
                    SERVICE AGREEMENT
                </h1>
                <p style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Confidential Document
                </p>
                <div style={{ width: "60px", height: "2px", background: "#6366f1", margin: "16px auto 0" }} />
            </div>

            {/* Intro paragraph */}
            <p style={{ marginBottom: "20px" }}>
                This Service Agreement (the &ldquo;Agreement&rdquo;) is entered into as of{" "}
                <HighlightedValue value={changes.find(c => c.originalText.includes("Date"))?.filledValue || "[Date]"} />{" "}
                by and between{" "}
                <HighlightedValue value={changes.find(c => c.originalText.includes("Client"))?.filledValue || "[Client Name]"} />{" "}
                (the &ldquo;Client&rdquo;) and the Service Provider.
            </p>

            {/* Section 1 */}
            <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "8px", marginTop: "24px", color: "#1a1a2e" }}>
                1. Term of Agreement
            </h2>
            <p style={{ marginBottom: "20px" }}>
                This Agreement shall commence on the date first written above and shall continue for a period of{" "}
                <HighlightedValue value={changes.find(c => c.originalText.includes("Duration"))?.filledValue || "[Contract Duration]"} />{" "}
                unless earlier terminated in accordance with the provisions herein.
            </p>

            {/* Section 2 */}
            <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "8px", marginTop: "24px", color: "#1a1a2e" }}>
                2. Compensation
            </h2>
            <p style={{ marginBottom: "20px" }}>
                The Client shall pay the Service Provider a total fee of{" "}
                <HighlightedValue value={changes.find(c => c.originalText.includes("Amount"))?.filledValue || "[Total Amount]"} />{" "}
                for the services rendered under this Agreement, payable in accordance with the payment schedule set forth in Exhibit A.
            </p>

            {/* Section 3 */}
            <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "8px", marginTop: "24px", color: "#1a1a2e" }}>
                3. Governing Law
            </h2>
            <p style={{ marginBottom: "20px" }}>
                This Agreement shall be governed by and construed in accordance with the{" "}
                <HighlightedValue value={changes.find(c => c.originalText.includes("Governing"))?.filledValue || "[Governing Law]"} />,
                without regard to its conflict of law principles.
            </p>

            {/* Signature block */}
            <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "40px" }}>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>AUTHORIZED SIGNATORY</p>
                        <div style={{ borderBottom: "1px solid #1a1a2e", height: "32px", marginBottom: "4px" }} />
                        <p style={{ fontWeight: 600 }}>
                            <HighlightedValue value={changes.find(c => c.originalText.includes("Signatory"))?.filledValue || "[Signatory Name]"} />
                        </p>
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>CLIENT</p>
                        <div style={{ borderBottom: "1px solid #1a1a2e", height: "32px", marginBottom: "4px" }} />
                        <p style={{ fontWeight: 600 }}>
                            <HighlightedValue value={changes.find(c => c.originalText.includes("Client"))?.filledValue || "[Client Name]"} />
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Renders a filled value with green highlight */
function HighlightedValue({ value }: { value: string }) {
    return (
        <span
            style={{
                background: "rgba(52, 211, 153, 0.2)",
                borderBottom: "2px solid rgba(52, 211, 153, 0.6)",
                padding: "1px 4px",
                borderRadius: "3px",
                fontWeight: 600,
                color: "#065f46",
            }}
        >
            {value}
        </span>
    );
}

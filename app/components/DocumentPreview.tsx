// app/components/DocumentPreview.tsx
"use client";

import { FileText, Maximize2, Minimize2, Loader2, AlertCircle, Download } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

interface DocumentPreviewProps {
    /** Base64-encoded DOCX content */
    base64: string;
    filename: string;
}

export function DocumentPreview({ base64, filename }: DocumentPreviewProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Convert DOCX → PDF via API, then create blob URL
    useEffect(() => {
        if (!base64) return;

        let revoked = false;
        let currentUrl: string | null = null;

        const convertToPdf = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch("/api/convert-pdf", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ base64, filename }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to convert document");
                }

                const data = await res.json();

                // Decode PDF base64 → blob URL
                const binaryString = atob(data.base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);

                if (!revoked) {
                    currentUrl = url;
                    setPdfUrl(url);
                } else {
                    URL.revokeObjectURL(url);
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Conversion failed";
                console.error("[DocumentPreview] Error converting to PDF:", message);
                if (!revoked) {
                    setError(message);
                }
            } finally {
                if (!revoked) {
                    setLoading(false);
                }
            }
        };

        convertToPdf();

        return () => {
            revoked = true;
            if (currentUrl) URL.revokeObjectURL(currentUrl);
        };
    }, [base64, filename]);

    const handleDownload = () => {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div
            className={`glass-card flex flex-col overflow-hidden transition-all duration-300 ${expanded ? "fixed inset-4 z-50" : "relative min-h-[1000px] h-full"
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
                        OUTPUT
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownload}
                        className="group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold 
                        text-indigo-600 hover:bg-indigo-50 transition-all duration-300 active:scale-95"
                        title="Download"
                    >
                        <Download className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                        <span>Download</span>
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1" />
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1.5 rounded-full transition-all hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        title={expanded ? "Exit fullscreen" : "Fullscreen"}
                    >
                        {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* PDF Viewer */}
            <div className="relative flex-1 overflow-hidden" style={{ background: "var(--bg-surface)" }}>
                {loading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
                        style={{ background: "var(--bg-surface)" }}>
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent-indigo)" }} />
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                            Converting to PDF...
                        </span>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center"
                        style={{ background: "var(--bg-surface)" }}>
                        <AlertCircle className="w-10 h-10" style={{ color: "var(--accent-amber)" }} />
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            Preview unavailable
                        </p>
                        <p className="text-xs max-w-md" style={{ color: "var(--text-muted)" }}>
                            {error}
                        </p>
                    </div>
                )}

                {pdfUrl && !error && (
                    <iframe
                        src={`${pdfUrl}#view=FitH`}
                        className="w-full h-full border-0"
                        title={`Preview of ${filename}`}
                        style={{ visibility: loading ? "hidden" : "visible", minHeight: "1000px" }}
                    />
                )}
            </div>
        </div>
    );
}

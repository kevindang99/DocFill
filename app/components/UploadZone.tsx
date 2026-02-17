// app/components/UploadZone.tsx
"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, FileText, X, FileWarning } from "lucide-react";

interface UploadZoneProps {
    file: File | null;
    onFileChange: (file: File | null) => void;
    disabled?: boolean;
}

export function UploadZone({ file, onFileChange, disabled }: UploadZoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = useCallback(
        (f: File) => {
            const ext = f.name.split(".").pop()?.toLowerCase();
            if (ext !== "docx") {
                return; // Only DOCX
            }
            if (f.size > 10 * 1024 * 1024) {
                return; // 10MB limit
            }
            onFileChange(f);
        },
        [onFileChange]
    );

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled) return;
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
        },
        [disabled, handleFile]
    );

    const onDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
        },
        [disabled]
    );

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
        },
        [handleFile]
    );

    return (
        <div className="flex-1 flex flex-col gap-3 h-full">
            <label className="text-sm font-medium shrink-0" style={{ color: "var(--text-secondary)" }}>
                Template File
            </label>

            <div
                onClick={() => !disabled && inputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={`upload-zone flex-1 relative flex flex-col items-center justify-center text-center p-8 ${isDragging ? "dragging" : ""
                    } ${file ? "has-file" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={onInputChange}
                    disabled={disabled}
                />

                {file ? (
                    <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in">
                        {/* File icon with success indicator */}
                        <div className="relative">
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                style={{ background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)" }}
                            >
                                <FileText className="w-8 h-8" style={{ color: "var(--accent-indigo)" }} />
                            </div>
                            <div
                                className="absolute -right-1.5 -top-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ background: "var(--accent-emerald)" }}
                            >
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>

                        {/* File info */}
                        <div className="space-y-1 text-center">
                            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                                {file.name}
                            </p>
                            <div className="flex items-center justify-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                <span
                                    className="px-1.5 py-0.5 rounded uppercase text-[10px] font-bold"
                                    style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}
                                >
                                    {file.name.split(".").pop()}
                                </span>
                                <span>•</span>
                                <span>{(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                        </div>

                        {/* Remove button */}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFileChange(null);
                                }}
                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                                style={{
                                    color: "var(--accent-rose)",
                                    background: "rgba(251, 113, 133, 0.1)",
                                    border: "1px solid rgba(251, 113, 133, 0.2)",
                                }}
                            >
                                <X className="w-3 h-3" />
                                Change File
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="relative z-10 flex flex-col items-center gap-4 pointer-events-none">
                        <div
                            className="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                            style={{ background: "var(--bg-surface)" }}
                        >
                            <Upload className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                Drop your template here
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                or click to browse
                            </p>
                        </div>

                        <div className="flex gap-2">
                            {["DOCX"].map((ext) => (
                                <span
                                    key={ext}
                                    className="text-[10px] font-bold px-2 py-1 rounded uppercase"
                                    style={{
                                        background: "var(--bg-surface)",
                                        color: "var(--text-muted)",
                                        border: "1px solid var(--border-default)",
                                    }}
                                >
                                    {ext}
                                </span>
                            ))}
                            <span className="text-[10px] px-2 py-1" style={{ color: "var(--text-muted)" }}>
                                Max 10MB
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

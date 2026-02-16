// app/page.tsx
"use client";

import { FileText, Github, Sparkles, AlertCircle, PlayCircle, Loader2 } from "lucide-react";
import { UploadZone } from "./components/UploadZone";
import { InstructionsPanel } from "./components/InstructionsPanel";
import { GeneratingView } from "./components/GeneratingView";
import { ResultView } from "./components/ResultView";
import { useTemplateFiller } from "@/lib/hooks/useTemplateFiller";

export default function Home() {
  const {
    view,
    file,
    prompt,
    thoughts,
    slots,
    result,
    error,
    isLoading,
    setFile,
    setPrompt,
    generate,
    reset,
  } = useTemplateFiller();

  const canSubmit = !!file && prompt.trim().length > 0 && !isLoading;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ===========================
          HEADER
          =========================== */}
      <header
        className="h-16 flex items-center justify-between px-6 shrink-0 z-50"
        style={{
          background: "rgba(11, 17, 32, 0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Smart Template Filler
            </h1>
            <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              AI-powered document automation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs py-2 px-3"
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {/* ===========================
          MAIN CONTENT
          =========================== */}
      <main className="flex-1 flex flex-col p-6 max-w-[1400px] mx-auto w-full">
        {view === "upload" && (
          <div className="animate-fade-in flex-1 flex flex-col">
            {/* Hero */}
            <div className="text-center mb-8">
              <h2
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                Fill templates with{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--gradient-primary)" }}
                >
                  AI precision
                </span>
              </h2>
              <p
                className="text-base max-w-xl mx-auto leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Upload a DOCX template, describe what to fill, and get a perfectly
                completed document — formatting preserved.
              </p>
            </div>

            {/* Two-column Form */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
              {/* LEFT: Upload + File */}
              <div className="glass-card p-6 flex flex-col">
                <UploadZone file={file} onFileChange={setFile} disabled={isLoading} />
              </div>

              {/* RIGHT: Instructions */}
              <div className="glass-card p-6 flex flex-col">
                <InstructionsPanel
                  prompt={prompt}
                  onPromptChange={setPrompt}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="mt-4 flex items-center gap-2 p-4 rounded-xl text-sm font-medium animate-fade-in"
                style={{
                  background: "rgba(251, 113, 133, 0.1)",
                  color: "var(--accent-rose)",
                  border: "1px solid rgba(251, 113, 133, 0.2)",
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Generate Button */}
            <div className="mt-6 flex justify-center shrink-0">
              <button
                onClick={generate}
                disabled={!canSubmit}
                className="btn-primary text-base px-10 py-3.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Document
                  </>
                )}
              </button>
            </div>

            {/* How it works */}
            <div className="mt-8 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    step: "01",
                    title: "Upload Template",
                    desc: "Drop any DOCX file with placeholders, blanks, or brackets",
                  },
                  {
                    step: "02",
                    title: "Describe & Instruct",
                    desc: "Tell the AI what values to fill and where to find them",
                  },
                  {
                    step: "03",
                    title: "Download Result",
                    desc: "Get a perfectly filled document with all formatting intact",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex items-start gap-3 p-4 rounded-xl"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-md shrink-0"
                      style={{
                        background: "rgba(99, 102, 241, 0.15)",
                        color: "var(--accent-indigo)",
                      }}
                    >
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
                        {item.title}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === "generating" && (
          <GeneratingView
            thoughts={thoughts}
            slots={slots}
            onCancel={reset}
          />
        )}

        {view === "result" && result && (
          <ResultView
            result={result}
            thoughts={thoughts}
            onReset={reset}
          />
        )}
      </main>

      {/* ===========================
          FOOTER
          =========================== */}
      <footer
        className="h-12 flex items-center justify-center px-6 shrink-0"
        style={{
          borderTop: "1px solid var(--border-default)",
          color: "var(--text-muted)",
        }}
      >
        <p className="text-xs">
          Open-source AI document automation · Built with Next.js
        </p>
      </footer>
    </div>
  );
}

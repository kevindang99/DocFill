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
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3.5 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5 group-hover:bg-primary/20 transition-all duration-300">
              <FileText className="w-5.5 h-5.5 text-primary" />
            </div>
            <h1 className="text-[15px] font-bold tracking-tight text-foreground/90">
              Smart Template Filler
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all active:scale-95 border border-border/50"
            >
              <Github className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* ===========================
          MAIN CONTENT
          =========================== */}
      <main className="flex-1 flex flex-col p-6 max-w-[1400px] mx-auto w-full">
        {view === "upload" && (
          <div className="animate-fade-in flex-1 flex flex-col">
            {/* Hero */}
            <div className="text-center mb-10 py-4">
              <h2
                className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Fill templates with{" "}
                <span
                  className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary to-primary saturate-150"
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

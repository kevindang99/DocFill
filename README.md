# 📄 Smart Template Filler

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai&logoColor=white)](https://openai.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**Smart Template Filler** is an AI-powered web application that automatically fills DOCX document templates using natural language instructions.

> [!TIP]
> **Zero Manual Work:** Upload a `.docx` template, describe what to fill in plain language, and get a perfectly filled document back — with all original formatting preserved.

### Key Features

- **Intelligent Slot Detection**: AI analyzes your document to automatically detect all fillable placeholders, fields, and blanks
- **Natural Language Instructions**: Describe how to fill the template in plain English — no field mapping required
- **Format Preservation**: Uses XML-level text replacement to preserve all fonts, styles, tables, and layouts
- **Real-time Progress**: Live SSE streaming shows AI reasoning, detected fields, and step-by-step progress
- **Instant Download**: Get your filled `.docx` file ready to download immediately after processing

---

## 📌 Table of Contents

1. [⚡ Quick Start](#quick-start)
2. [🛠️ Installation](#installation)
3. [🏗️ Architecture](#architecture)
4. [📦 Project Structure](#project-structure)
5. [⚙️ Configuration](#configuration)
6. [🐋 Deployment](#deployment)
7. [🤝 Support & Contact](#support)

---

## ⚡ 1. Quick Start <a name="quick-start"></a>

> ⚡ **Quick Start**
> ℹ️ This is the fastest way to get started.
> ```bash
> git clone https://github.com/quocthinh861/smart-template-filler.git
> cd smart-template-filler
> cp .env.example .env.local   # Add your OpenAI API key
> npm install
> npm run dev
> ```
> Open `http://localhost:3000` and start filling templates.

---

## 🛠️ 2. Installation <a name="installation"></a>

### System Requirements
- **Node.js:** v18 or later
- **npm:** v9 or later (or yarn / pnpm / bun)
- **OpenAI API Key:** Required for AI-powered slot analysis and filling
- **LibreOffice (Optional):** Required only for the in-browser document preview (DOCX → PDF conversion).
  - **macOS:** `brew install --cask libreoffice`
  - **Ubuntu/Debian:** `sudo apt install libreoffice`
  - **Windows:** Download from [libreoffice.org](https://www.libreoffice.org/download/)

### Installation Steps

1. **Clone the Repo:**
   ```bash
   git clone https://github.com/quocthinh861/smart-template-filler.git
   cd smart-template-filler
   ```

2. **Environment Setup:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your OpenAI API key:
   ```env
   # OpenAI API Key (required)
   OPENAI_API_KEY=sk-your-key-here

   # Optional: Override model names
   # AGENT_MODEL_NAME=gpt-4o-mini
   # AGENT_ADVANCED_MODEL=gpt-4o
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Start the Dev Server:**
   ```bash
   npm run dev
   ```
   Access the app at `http://localhost:3000`.

---

## 🏗️ 3. Architecture <a name="architecture"></a>

Smart Template Filler uses a **5-phase agentic workflow** powered by OpenAI's structured output:

| Phase | Step | Description |
|-------|------|-------------|
| 1 | **Extract** | Parse DOCX into XML, extract all text nodes |
| 2 | **Analyze** | AI detects all fillable placeholders and fields |
| 3 | **Fill** | AI matches user instructions to detected slots |
| 4 | **Apply** | Sequential string replacement at the XML level |
| 5 | **Build** | Rebuild the DOCX file with all edits applied |

### How It Works

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  Upload DOCX │────▶│ Slot Analyzer │────▶│  Slot Filler │
│  + Prompt    │     │  (GPT-4o)     │     │  (GPT-4o)    │
└──────────────┘     └───────────────┘     └──────┬───────┘
                                                   │
                     ┌───────────────┐     ┌───────▼──────┐
                     │  Download     │◀────│ XML Replace  │
                     │  Filled DOCX  │     │ + Rebuild    │
                     └───────────────┘     └──────────────┘
```

- **Slot Analyzer Agent**: Uses structured output (Zod schemas) to detect all placeholder patterns in the document
- **Slot Filler Agent**: Interprets user instructions and generates appropriate values for each slot
- **XML Replacement**: Edits happen at the OOXML level, ensuring **zero formatting loss**

---

## 📦 4. Project Structure <a name="project-structure"></a>

```
smart-template-filler/
├── app/
│   ├── api/
│   │   └── template-filler/     # SSE streaming API endpoint
│   ├── components/
│   │   ├── UploadZone.tsx       # Drag & drop file upload
│   │   ├── InstructionsPanel.tsx # AI instructions input
│   │   ├── GeneratingView.tsx   # Real-time progress view
│   │   ├── ResultView.tsx       # Results with tabs (Preview, Fields, Reasoning)
│   │   ├── DocumentPreview.tsx  # DOCX preview renderer
│   │   ├── SlotCard.tsx         # Individual field display
│   │   └── ThoughtStream.tsx    # AI reasoning stream
│   ├── globals.css              # Design system (OKLCH themes)
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main page
├── lib/
│   ├── agents/
│   │   ├── core/
│   │   │   ├── slot-analyzer.ts # AI slot detection agent
│   │   │   └── slot-filler.ts   # AI slot filling agent
│   │   ├── workflows/
│   │   │   └── template-filler.ts # 5-phase orchestration workflow
│   │   ├── config/              # Model configuration
│   │   ├── prompts/             # Agent system prompts
│   │   ├── types/               # TypeScript type definitions
│   │   └── utils/
│   │       ├── docx-xml.ts      # DOCX parsing & XML manipulation
│   │       └── logger.ts        # Structured logging
│   ├── hooks/
│   │   └── useTemplateFiller.ts # React hook for state management
│   └── types.ts                 # Shared type definitions
├── .env.example                 # Environment template
├── package.json
└── tsconfig.json
```

---

## ⚙️ 5. Configuration <a name="configuration"></a>

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | — | Your OpenAI API key |
| `AGENT_MODEL_NAME` | ❌ | `gpt-5.1` | OpenAI model used for all AI operations |

### Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | Full-stack React framework |
| **React 19** | UI components |
| **Vercel AI SDK** | OpenAI integration with structured output |
| **Zod** | Schema validation for AI responses |
| **JSZip** | DOCX (ZIP) parsing and rebuilding |
| **fast-xml-parser** | XML manipulation for OOXML |
| **Tailwind CSS 4** | Styling with OKLCH design tokens |
| **Lucide React** | Icon system |

---

## 🐋 6. Deployment <a name="deployment"></a>

### Production Build

```bash
npm run build
npm run start
```

### Deploy on Vercel (Recommended)

The easiest way to deploy is via the [Vercel Platform](https://vercel.com/new):

1. Push your repo to GitHub
2. Import the project on Vercel
3. Add `OPENAI_API_KEY` to your environment variables
4. Deploy

> **Note:** The app requires a Node.js runtime (not Edge) for DOCX processing. The API route is configured with `export const runtime = "nodejs"` and allows up to 2 minutes of processing time.

---

## 🤝 7. Support & Contact <a name="support"></a>

- **GitHub:** [quocthinh861/smart-template-filler](https://github.com/quocthinh861/smart-template-filler)
- **Issues:** [Report a bug](https://github.com/quocthinh861/smart-template-filler/issues)

---

## 📑 Citation

```bibtex
@misc{smarttemplatefiller2026,
  title        = {Smart Template Filler: AI-Powered DOCX Template Filling},
  author       = {Quoc Thinh},
  year         = {2026},
  howpublished = {\url{https://github.com/quocthinh861/smart-template-filler}}
}
```

---

**Made with ❤️ for document automation**

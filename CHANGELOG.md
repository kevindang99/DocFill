# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-17

### Added
- **Core Engine**: Implemented 5-phase agentic workflow (Extract, Analyze, Fill, Apply, Build) for DOCX template filling.
- **TypeScript SDK**: Added programmatic API for Node.js/TypeScript environments.
- **Python SDK**: Added standalone Python client with both Local and Remote (API-based) processing modes.
- **Web UI**: Brand new Next.js interface with drag-and-drop upload and real-time progress visualization.
- **Generating View**: Added a step-by-step visual stepper showing the transformation phases in real-time.
- **Formatting Preservation**: Robust OOXML-level replacement engine that preserves all fonts, styles, and document structure.
- **Thought Stream**: Visual AI reasoning panel to see how the agent interprets instructions and document structure.

### Changed
- **Branding**: Renamed the project from "Smart Template Filler" to **DocFill** for a cleaner, more concise identity.
- **Architecture**: Unified the Web UI and API to use the TypeScript SDK as the primary engine (dogfooding).

### Technical
- Integrated Vercel AI SDK for structured LLM outputs.
- Implemented robust XML parsing and rebuilding using `fast-xml-parser` and `jszip`.
- Added support for both natural language prompts and rule-based filling.
- Optimized for GPT-4o and GPT-4o-mini models.

---
Made with ❤️ by Quoc Thinh

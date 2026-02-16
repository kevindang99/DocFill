// app/api/convert-pdf/route.ts
// Converts a base64-encoded DOCX to PDF using LibreOffice

import { NextResponse } from "next/server";
import { convert } from "libreoffice-convert";

const convertAsync = (file: Buffer): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        convert(file, ".pdf", undefined, (err, done) => {
            if (err) return reject(err);
            resolve(done);
        });
    });
};

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { base64, filename } = body;

        if (!base64) {
            return NextResponse.json({ error: "No base64 content provided" }, { status: 400 });
        }

        // Decode base64 to buffer
        const docxBuffer = Buffer.from(base64, "base64");

        // Convert DOCX to PDF via local LibreOffice
        const pdfBuffer = await convertAsync(docxBuffer);

        // Return PDF as base64
        const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

        return NextResponse.json({
            base64: pdfBase64,
            filename: (filename || "document").replace(/\.docx$/i, "") + ".pdf",
            mime: "application/pdf",
        });
    } catch (error: unknown) {
        console.error("[convert-pdf] Error:", error);
        const message = error instanceof Error ? error.message : "Conversion failed";

        // Check if it's a LibreOffice not found error
        if (message.includes("ENOENT") || message.includes("soffice") || message.includes("Could not find soffice binary")) {
            return NextResponse.json(
                {
                    error: "LibreOffice is not installed. Install it with: brew install --cask libreoffice",
                    details: message,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}

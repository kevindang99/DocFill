// lib/agents/utils/docx-xml.ts
// DOCX XML utilities for extracting and modifying document content
// Preserves all Word formatting by working directly with XML

import JSZip from "jszip";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { agentLog, agentError, createTimer } from "./logger";

// ===========================
// TYPES
// ===========================

export interface TextNodeHandle {
    parent: any; // Parent object or array containing the text
    key: string | number; // Property name or array index
    text: string; // The actual text content
    index: number; // Sequential index of this text node
}

export interface DocxContent {
    zip: JSZip;
    json: any; // Parsed XML as JSON
    textNodes: TextNodeHandle[];
    fullText: string; // All text joined for analysis
    xmlString: string; // Original XML string
}

export interface TextEdit {
    nodeIndex: number; // Which text node to edit
    originalText: string;
    newText: string;
}

// ===========================
// XML PARSER CONFIG
// ===========================

// Configuration for parsing and rebuilding DOCX XML
// We cannot use preserveOrder: true as it changes output to array format
// which would require complete rewrite of walk function.
// Instead we use careful settings to minimize data loss.

export const parserOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    textNodeName: "#text",
    trimValues: false, // Don't strip whitespace from text content
    parseTagValue: false, // Don't convert text to numbers
    parseAttributeValue: false, // Don't convert attributes to numbers
    processEntities: false, // Don't process XML entities (Word handles this)
    allowBooleanAttributes: true,
};

export const builderOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    textNodeName: "#text",
    format: false, // Don't add formatting whitespace
    suppressEmptyNode: false, // Keep empty nodes
    processEntities: false, // Don't process XML entities
};

// ===========================
// EXTRACT DOCX CONTENT
// ===========================

/**
 * Extract text nodes from DOCX file
 * This allows us to modify text while preserving all Word formatting
 *
 * @param buffer - DOCX file as Buffer
 * @returns DocxContent with all text nodes and parsed structure
 */
export async function extractDocxContent(buffer: Buffer): Promise<DocxContent> {
    const timer = createTimer();

    const zip = await JSZip.loadAsync(buffer);
    const documentFile = zip.file("word/document.xml");

    if (!documentFile) {
        throw new Error("Invalid DOCX file (word/document.xml missing)");
    }

    const xmlString = await documentFile.async("string");

    // Parse with preserveOrder to maintain exact element sequence
    const parser = new XMLParser({
        ...parserOptions,
        preserveOrder: true,
    });
    const json = parser.parse(xmlString);

    // Collect all text nodes
    const textNodes: TextNodeHandle[] = [];
    let nodeIndex = 0;

    /**
     * Walk the preserveOrder JSON tree to find all <w:t> text nodes
     *
     * With preserveOrder: true, the structure is:
     * [
     *   { "w:document": [...children...], ":@": {...attributes...} },
     *   ...
     * ]
     *
     * Each child is an array element with a single key (the tag name).
     */
    function walkPreserveOrder(node: any) {
        if (node == null) return;

        if (Array.isArray(node)) {
            for (const item of node) {
                walkPreserveOrder(item);
            }
            return;
        }

        if (typeof node !== "object") return;

        for (const tagName of Object.keys(node)) {
            if (tagName === ":@") continue; // Skip attributes

            const value = node[tagName];

            if (tagName === "w:t") {
                // Found a text node
                if (Array.isArray(value)) {
                    for (const child of value) {
                        if (typeof child === "object" && child["#text"] !== undefined) {
                            textNodes.push({
                                parent: child,
                                key: "#text",
                                text: String(child["#text"]),
                                index: nodeIndex++,
                            });
                        }
                    }
                }
            } else {
                // Recurse into child elements
                walkPreserveOrder(value);
            }
        }
    }

    walkPreserveOrder(json);

    // Build full text with node markers for debugging/analysis
    const fullText = textNodes.map((n, i) => `[${i}]${n.text}`).join("");

    agentLog(
        "docx-xml",
        "extracted",
        {
            textNodes: textNodes.length,
            fullTextLength: fullText.length,
        },
        timer.elapsed()
    );

    return { zip, json, textNodes, fullText, xmlString };
}

// ===========================
// GET PLAIN TEXT
// ===========================

/**
 * Get plain text from DOCX (without node markers)
 * Useful for human-readable analysis
 */
export function getPlainText(content: DocxContent): string {
    return content.textNodes
        .map((n) => n.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
}

// ===========================
// APPLY EDITS TO DOCX
// ===========================

/**
 * Apply text edits to the DOCX content
 * Modifies the JSON structure in place
 *
 * @param content - DocxContent from extractDocxContent
 * @param edits - Array of text edits to apply
 */
export function applyTextEdits(content: DocxContent, edits: TextEdit[]): void {
    const timer = createTimer();

    for (const edit of edits) {
        const node = content.textNodes[edit.nodeIndex];
        if (!node) {
            console.warn(`Text node ${edit.nodeIndex} not found, skipping`);
            continue;
        }

        if (node.text !== edit.originalText) {
            console.warn(`Text mismatch at node ${edit.nodeIndex}: expected "${edit.originalText}", found "${node.text}"`);
        }

        if (Array.isArray(node.parent)) {
            node.parent[node.key as number] = edit.newText;
        } else {
            node.parent[node.key as string] = edit.newText;
        }

        node.text = edit.newText;
    }

    agentLog("docx-xml", "edits-applied", { editCount: edits.length }, timer.elapsed());
}

// ===========================
// REBUILD DOCX
// ===========================

// ===========================
// RELATIONSHIP HANDLING
// ===========================

/**
 * Validate that all relationship references in the document have corresponding definitions
 */
export async function validateRelationships(content: DocxContent): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
}> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        // Read the main document relationships file
        const relsFile = content.zip.file("word/_rels/document.xml.rels");

        if (!relsFile) {
            warnings.push("No relationships file found - document may not have images or hyperlinks");
            return { isValid: true, errors, warnings };
        }

        const relsXml = await relsFile.async("string");
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@",
        });

        const relsJson = parser.parse(relsXml);
        const relationships = relsJson.Relationships?.Relationship || [];
        const relArray = Array.isArray(relationships) ? relationships : [relationships];

        // Build map of defined relationship IDs
        const definedRels = new Set<string>();
        for (const rel of relArray) {
            if (rel["@Id"]) {
                definedRels.add(rel["@Id"]);
            }
        }

        // Extract relationship references from document
        const referencedRels = extractRelationshipReferences(content.xmlString);

        // Check for orphaned references
        for (const relId of referencedRels) {
            if (!definedRels.has(relId)) {
                errors.push(`Orphaned relationship reference: ${relId}`);
            }
        }

        agentLog("docx-xml", "relationships-validated", {
            defined: definedRels.size,
            referenced: referencedRels.size,
            errors: errors.length,
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    } catch (error) {
        errors.push(`Relationship validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        return { isValid: false, errors, warnings };
    }
}

/**
 * Extract all relationship IDs referenced in the XML
 */
function extractRelationshipReferences(xml: string): Set<string> {
    const refs = new Set<string>();

    // Match r:id and r:embed attributes
    const patterns = [/r:id="([^"]+)"/g, /r:embed="([^"]+)"/g, /r:link="([^"]+)"/g];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(xml)) !== null) {
            refs.add(match[1]);
        }
    }

    return refs;
}

/**
 * Preserve all relationship files and media during rebuild
 */
export async function preserveRelationships(content: DocxContent): Promise<void> {
    // Relationship files are already in the ZIP, we just need to ensure they're not corrupted
    // This is a validation step

    const relFiles = [
        "word/_rels/document.xml.rels",
        "_rels/.rels",
        "word/_rels/footnotes.xml.rels",
        "word/_rels/endnotes.xml.rels",
    ];

    for (const relFile of relFiles) {
        const file = content.zip.file(relFile);
        if (file) {
            try {
                const fileContent = await file.async("string");
                // Just verify it's parseable XML
                const parser = new XMLParser({ ignoreAttributes: false });
                parser.parse(fileContent);

                agentLog("docx-xml", "relationship-file-validated", { file: relFile });
            } catch (error) {
                agentError("docx-xml", "relationship-file-corrupted", { file: relFile, error });
            }
        }
    }
}

/**
 * Rebuild the DOCX file from modified content
 * Now includes relationship validation and preservation
 *
 * @param content - DocxContent with modifications applied
 * @returns Buffer of the new DOCX file
 */
export async function rebuildDocx(content: DocxContent): Promise<Buffer> {
    const timer = createTimer();

    // Use preserveOrder to maintain exact element sequence
    const builder = new XMLBuilder({
        ...builderOptions,
        preserveOrder: true,
    });
    const newXml = builder.build(content.json);

    // Update the document.xml in the ZIP
    content.zip.file("word/document.xml", newXml);

    // Validate and preserve relationships (images, hyperlinks, etc.)
    await preserveRelationships(content);

    // Update the xmlString for relationship validation
    const updatedContent = {
        ...content,
        xmlString: newXml,
    };

    const relValidation = await validateRelationships(updatedContent);

    if (!relValidation.isValid) {
        agentError("docx-xml", "relationship-validation-failed", relValidation.errors);
        // Log warnings but don't fail - some documents may have intentional orphans
        for (const error of relValidation.errors) {
            agentLog("docx-xml", "relationship-warning", { error });
        }
    }

    if (relValidation.warnings.length > 0) {
        for (const warning of relValidation.warnings) {
            agentLog("docx-xml", "relationship-info", { warning });
        }
    }

    const finalDocx = await content.zip.generateAsync({ type: "nodebuffer" });

    agentLog(
        "docx-xml",
        "rebuilt",
        {
            bytes: finalDocx.length,
            relationshipsValid: relValidation.isValid,
        },
        timer.elapsed()
    );

    return finalDocx as Buffer;
}

// ===========================
// FIND AND REPLACE
// ===========================

/**
 * Robust find and replace in DOCX
 * Handles cases where placeholders are split across multiple nodes (e.g. [CLI + ENT])
 *
 * @param content - DocxContent from extractDocxContent
 * @param replacements - Map of text to find -> text to replace with
 * @returns Number of replacements made
 */
function updateNodeText(node: any, newText: string) {
    if (Array.isArray(node.parent)) {
        node.parent[node.key as number] = newText;
    } else {
        node.parent[node.key as string] = newText;
    }
    node.text = newText;
}

export function findAndReplace(content: DocxContent, replacements: Map<string, string>): number {
    let count = 0;

    for (const [find, replace] of replacements) {
        if (!find) continue;

        while (true) {
            // 1. Rebuild map of global text index -> node
            interface TextMap {
                start: number;
                end: number;
                nodeIndex: number;
            }

            const map: TextMap[] = [];
            let cursor = 0;
            let virtualFullText = "";

            content.textNodes.forEach((node, idx) => {
                const len = node.text.length;
                map.push({ start: cursor, end: cursor + len, nodeIndex: idx });
                virtualFullText += node.text;
                cursor += len;
            });

            const matchIndex = virtualFullText.indexOf(find);
            if (matchIndex === -1) break;

            count++;

            const matchEnd = matchIndex + find.length;
            const startNodeMap = map.find((m) => matchIndex >= m.start && matchIndex < m.end);
            const endNodeMap = map.find((m) => matchEnd > m.start && matchEnd <= m.end);

            if (!startNodeMap || !endNodeMap) {
                console.warn("Match found but nodes missing in map, skipping occurrence");
                break;
            }

            const startNode = content.textNodes[startNodeMap.nodeIndex];
            const endNode = content.textNodes[endNodeMap.nodeIndex];
            const localStart = matchIndex - startNodeMap.start;
            const localEnd = matchEnd - endNodeMap.start;

            if (startNodeMap.nodeIndex === endNodeMap.nodeIndex) {
                const before = startNode.text.substring(0, localStart);
                const after = startNode.text.substring(localEnd);
                updateNodeText(startNode, before + replace + after);
            } else {
                const before = startNode.text.substring(0, localStart);
                updateNodeText(startNode, before + replace);
                const after = endNode.text.substring(localEnd);
                updateNodeText(endNode, after);
                for (let i = startNodeMap.nodeIndex + 1; i < endNodeMap.nodeIndex; i++) {
                    updateNodeText(content.textNodes[i], "");
                }
            }
        }
    }

    return count;
}

// ===========================
// SEQUENTIAL FIND AND REPLACE (QUEUE-BASED)
// ===========================

/**
 * Slot replacement entry for sequential processing
 */
export interface SlotReplacement {
    originalText: string;
    filledValue: string;
}

/**
 * Sequential find and replace using queue-based consumption
 *
 * Algorithm:
 * 1. Create a queue of slots (in document order)
 * 2. Build virtual text from all nodes
 * 3. Walk through virtual text looking for queue[0].originalText
 * 4. When found: replace, shift queue, continue from that position
 * 5. If originalText === filledValue: still consume (no visible change)
 * 6. Done when queue is empty
 *
 * Key insight: Slots where filledValue === originalText are "no-ops"
 * but still get consumed to maintain position alignment.
 *
 * @param content - DocxContent from extractDocxContent
 * @param slots - Array of replacements IN DOCUMENT ORDER
 * @returns Number of actual replacements made (where text changed)
 */
export function findAndReplaceSequential(content: DocxContent, slots: SlotReplacement[]): number {
    // Create queue (copy to avoid mutating input)
    const queue = [...slots];
    let replacementCount = 0;

    // Track our current position in the document text
    // Since slots are strictly ordered, we only need to search forward
    // from where the last operation finished.
    let searchCursor = 0;

    while (queue.length > 0) {
        // Build current virtual text and node map
        // (Must rebuild every time because document structure changes)
        const { virtualText, nodeMap } = buildVirtualTextMap(content);

        const current = queue[0];
        const { originalText, filledValue } = current;

        // Search forward from current cursor
        const matchIndex = virtualText.indexOf(originalText, searchCursor);

        if (matchIndex === -1) {
            // Not found even when searching forward
            // This implies the document structure drifted or slots are out of sync
            agentLog("docx-xml", "slot-not-found", {
                originalText: originalText.slice(0, 50),
                searchCursor,
            });
            queue.shift();
            continue;
        }

        // Found!
        const matchEnd = matchIndex + originalText.length;

        if (originalText !== filledValue) {
            // Case 1: Replacement
            applyReplacement(content, nodeMap, matchIndex, matchEnd, filledValue);
            replacementCount++;

            agentLog("docx-xml", "slot-replaced", {
                original: originalText.slice(0, 30),
                filled: filledValue.slice(0, 30),
                matchIndex,
            });

            // Update cursor to end of REPLACED SEGMENT based on ORIGINAL length
            searchCursor = matchIndex + originalText.length;
        } else {
            // Case 2: No-Op (Skipped)
            // Update cursor to end of ORIGINAL text
            // We skip past this placeholder effectively
            searchCursor = matchEnd;
        }

        // Consume queue
        queue.shift();
    }

    agentLog("docx-xml", "sequential-replace-done", {
        totalSlots: slots.length,
        replaced: replacementCount,
    });

    return replacementCount;
}

/**
 * Build virtual text string and mapping to nodes
 */
function buildVirtualTextMap(content: DocxContent): {
    virtualText: string;
    nodeMap: Array<{ start: number; end: number; nodeIndex: number }>;
} {
    const nodeMap: Array<{ start: number; end: number; nodeIndex: number }> = [];
    let cursor = 0;
    let virtualText = "";

    content.textNodes.forEach((node, idx) => {
        const len = node.text.length;
        nodeMap.push({
            start: cursor,
            end: cursor + len,
            nodeIndex: idx,
        });
        virtualText += node.text;
        cursor += len;
    });

    return { virtualText, nodeMap };
}

/**
 * Apply a single replacement to the document nodes
 */
function applyReplacement(
    content: DocxContent,
    nodeMap: Array<{ start: number; end: number; nodeIndex: number }>,
    matchStart: number,
    matchEnd: number,
    replacement: string
): void {
    // Find affected nodes
    const startNodeEntry = nodeMap.find((m) => matchStart >= m.start && matchStart < m.end);
    const endNodeEntry = nodeMap.find((m) => matchEnd > m.start && matchEnd <= m.end);

    if (!startNodeEntry || !endNodeEntry) {
        agentLog("docx-xml", "node-map-error", { matchStart, matchEnd });
        return;
    }

    const startNode = content.textNodes[startNodeEntry.nodeIndex];
    const endNode = content.textNodes[endNodeEntry.nodeIndex];

    // Local offsets within nodes
    const localStart = matchStart - startNodeEntry.start;
    const localEnd = matchEnd - endNodeEntry.start;

    if (startNodeEntry.nodeIndex === endNodeEntry.nodeIndex) {
        // Single node replacement
        const before = startNode.text.substring(0, localStart);
        const after = startNode.text.substring(localEnd);
        updateNodeText(startNode, before + replacement + after);
    } else {
        // Multi-node replacement
        // Start node: text before + replacement
        updateNodeText(startNode, startNode.text.substring(0, localStart) + replacement);

        // End node: text after
        updateNodeText(endNode, endNode.text.substring(localEnd));

        // Middle nodes: clear
        for (let i = startNodeEntry.nodeIndex + 1; i < endNodeEntry.nodeIndex; i++) {
            updateNodeText(content.textNodes[i], "");
        }
    }
}

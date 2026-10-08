import type { ImportBlock, ImportSpan } from "./ImportDocument";
export function isolateImportSpans(parts: ImportSpan[]) {
  // Direction boundaries follow whole phrases, not Word's bold/italic run boundaries.
  const text = parts.map((part) => part.text).join("");
  const starts = new Set<number>();
  const ends = new Set<number>();
  for (const match of text.matchAll(/[\u0590-\u05FF][\u0590-\u05FF"':.\-]*(?:[ \t]+[\u0590-\u05FF][\u0590-\u05FF"':.\-]*)*/g)) {
    starts.add(match.index!);
    ends.add(match.index! + match[0].length);
  }
  let offset = 0;
  return parts.map((part) => {
    let display = "";
    for (let index = 0; index < part.text.length; index++) {
      if (starts.has(offset)) display += "\u2067";
      display += part.text[index];
      offset++;
      if (ends.has(offset)) display += "\u2069";
    }
    return { ...part, text: display };
  });
}

export interface RichContentDocument {
  version: 1;
  blocks: ImportBlock[];
  footnotes: { id: number; blocks: ImportBlock[] }[];
}

export const OFFICIAL_ASSET_BUCKET = "official-learning-materials";

export function safeImageUri(uri?: string) {
  return !!uri && (/^https:\/\//i.test(uri) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(uri));
}

export function safeLinkUri(uri?: string) {
  return !!uri && /^https?:\/\//i.test(uri);
}

export function readRichContent(value: unknown): RichContentDocument | undefined {
  if (!value || typeof value !== "object") return undefined;
  const doc = value as RichContentDocument;
  const validBlock = (block: ImportBlock) => block && typeof block.kind === "string" &&
    ["paragraph", "heading", "list", "question", "answer", "image"].includes(block.kind) &&
    (block.kind === "image" || (Array.isArray(block.spans) && block.spans.every((span) => span && typeof span.text === "string")));
  if (doc.version !== 1 || !Array.isArray(doc.blocks) || !doc.blocks.every(validBlock) ||
      !Array.isArray(doc.footnotes) || !doc.footnotes.every((note) => note && Number.isInteger(note.id) && note.id > 0 &&
        Array.isArray(note.blocks) && note.blocks.every(validBlock))) return undefined;
  return doc;
}

export function paragraphLayout(block: ImportBlock) {
  let indent = Math.max(0, block.indent ?? 0);
  let firstLine = (block.firstLine ?? 0) - (block.hanging ?? 0);
  if (block.leadingTabs) {
    let position = indent + firstLine;
    const stops = (block.tabStops ?? []).filter((stop) => stop.alignment !== "clear").map((stop) => stop.position).sort((a, b) => a - b);
    const defaultWidth = block.defaultTabWidth && block.defaultTabWidth > 0 ? block.defaultTabWidth : 36;
    for (let index = 0; index < block.leadingTabs; index++) {
      position = stops.find((stop) => stop > position) ?? (Math.floor(position / defaultWidth) + 1) * defaultWidth;
    }
    indent = Math.max(indent, position);
    firstLine = 0;
  }
  return { indent, firstLine };
}

export function paragraphSpans(block: ImportBlock): ImportSpan[] {
  let remaining = block.leadingTabs ?? 0;
  return (block.spans ?? []).map((span) => {
    let index = 0;
    while (remaining > 0 && span.text[index] === "\t") { remaining--; index++; }
    return { ...span, text: span.text.slice(index) };
  });
}

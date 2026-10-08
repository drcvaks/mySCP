import type { ImportBlock, ImportSpan } from "./ImportDocument";
import { isolateImportSpans, paragraphLayout, paragraphSpans, RichContentDocument, safeImageUri, safeLinkUri } from "./documentContent";

const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
const size = (value: number | undefined, fallback = 0) => Number.isFinite(value) ? Math.max(-500, Math.min(2000, value!)) : fallback;

function spans(parts: ImportSpan[]) {
  return isolateImportSpans(parts).map((span) => {
    let text = escape(span.text);
    if (span.bold) text = "<strong>" + text + "</strong>";
    if (span.italic) text = "<em>" + text + "</em>";
    if (span.underline) text = "<u>" + text + "</u>";
    const reset = (span.bold === false ? "font-weight:400;" : "") + (span.italic === false ? "font-style:normal;" : "") +
      (span.underline === false ? "text-decoration:none;" : "");
    if (reset) text = '<span style="' + reset + '">' + text + "</span>";
    if (span.color && /^#[A-Fa-f0-9]{6}$/.test(span.color)) text = '<span style="color:' + span.color + '">' + text + "</span>";
    if (span.footnote) text = '<sup style="font-size:0.7em">' + text + "</sup>";
    if (safeLinkUri(span.href)) text = '<a href="' + escape(span.href) + '" target="_blank" rel="noopener noreferrer">' + text + "</a>";
    return text;
  }).join("");
}

function blockHtml(block: ImportBlock, small = false) {
  if (block.kind === "image") {
    if (!safeImageUri(block.uri)) return "";
    return '<div style="text-align:center;margin:12px 0"><img alt="' + escape(block.alt) +
      '" src="' + escape(block.uri) + '" style="display:block;margin:auto;width:100%;max-width:' +
      size(block.displayWidth, 816) + 'px;height:auto" /></div>';
  }
  const list = block.kind === "list" || block.kind === "question";
  const heading = block.kind === "heading";
  const layout = paragraphLayout(block);
  const align = ["left", "right", "center"].includes(block.alignment ?? "") ? block.alignment : "left";
  const css = "white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4;margin:0 0 12px;line-height:1.7;direction:" +
    (block.rtl ? "rtl" : "ltr") + ";text-align:" + align + ";" +
    (heading ? "font-weight:700;font-size:1.125em;" : "") +
    (small ? "font-size:0.8em;" : "") + (!list ? "text-indent:" + size(layout.firstLine) + "pt;" : "");
  const text = (heading && block.marker ? escape(block.marker) + " " : "") + spans(paragraphSpans(block));
  const body = '<div style="' + css + '">' + text + "</div>";
  if (list) {
    const indent = block.indent ? Math.max(0, block.indent - (block.hanging ?? 18)) : 12 + (block.level ?? 0) * 18;
    return '<div style="display:flex;gap:8pt;margin-left:' + size(indent) +
      'pt;align-items:flex-start"><div style="width:20pt;flex-shrink:0;text-align:right;direction:ltr">' +
      escape(block.marker) + '</div><div style="flex:1;min-width:0">' + body + "</div></div>";
  }
  return '<div style="margin-left:' + size(layout.indent) + "pt;margin-right:" + size(block.rightIndent) + 'pt">' + body + "</div>";
}

export function renderRichDocument(doc: RichContentDocument) {
  return '<div class="rich-document" style="font-family:Arial,sans-serif;line-height:1.7;letter-spacing:0">' +
    doc.blocks.map((block) => blockHtml(block)).join("") +
    (doc.footnotes.length ? '<section style="border-top:1px solid #cbd5e1;padding-top:12px;margin-top:16px"><strong style="font-size:0.8em">Source Notes</strong>' +
      doc.footnotes.map((note) => '<div style="display:flex;gap:8px;margin-top:8px"><span style="min-width:28px;direction:ltr;font-size:0.8em">[' +
        note.id + ']</span><div style="flex:1;min-width:0">' + note.blocks.map((block) => blockHtml(block, true)).join("") + "</div></div>").join("") + "</section>" : "") +
    "</div>";
}

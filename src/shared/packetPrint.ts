import { ContentChunk } from "./types";

export interface PrintablePacket {
  chunks: ContentChunk[];
  meta?: string;
  title: string;
}

export function printPacket(packet: PrintablePacket) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "Printing is currently available from the web version. Mobile Print / Save PDF can be added with Expo print support.";
  }

  const frame = document.createElement("iframe");
  frame.title = "mySCP printable packet";
  frame.style.bottom = "0";
  frame.style.height = "0";
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.width = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const printDocument = frame.contentWindow?.document;
  if (!frame.contentWindow || !printDocument) {
    frame.remove();
    return "Unable to prepare the print view in this browser.";
  }

  printDocument.open();
  printDocument.write(buildPrintablePacketHtml(packet));
  printDocument.close();

  const cleanup = () => {
    window.setTimeout(() => frame.remove(), 500);
  };

  frame.contentWindow.onafterprint = cleanup;
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    cleanup();
  }, 500);
  return null;
}

function buildPrintablePacketHtml({ chunks, meta, title }: PrintablePacket) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 0.6in; }
    * { box-sizing: border-box; }
    body {
      color: #111827;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.45;
      margin: 0;
      background: #ffffff;
    }
    header {
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: 22px;
      padding-bottom: 12px;
    }
    h1 {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 22pt;
      line-height: 1.15;
      margin: 0 0 6px;
    }
    .meta {
      color: #475569;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
    }
    .chunk {
      break-inside: avoid;
      margin-bottom: 24px;
    }
    .chunk-code {
      color: #475569;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      margin-bottom: 4px;
    }
    h2 {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15pt;
      line-height: 1.2;
      margin: 0 0 10px;
    }
    p { margin: 0 0 10px; }
    ol, ul {
      margin: 0 0 12px 26px;
      padding: 0;
    }
    li { margin-bottom: 7px; }
    table {
      border-collapse: collapse;
      font-size: 9.5pt;
      margin: 12px 0;
      width: 100%;
    }
    th, td {
      border: 1px solid #334155;
      padding: 6px;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
    }
    img {
      display: block;
      height: auto;
      margin: 10px 0;
      max-width: 100%;
    }
    .footnotes {
      border-top: 1px solid #cbd5e1;
      color: #475569;
      font-size: 9.5pt;
      margin-top: 14px;
      padding-top: 8px;
    }
    .footnote-title {
      color: #1e293b;
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 700;
      margin-bottom: 5px;
    }
    .question, .answer {
      border-left: 3px solid #cbd5e1;
      margin: 8px 0;
      padding-left: 10px;
    }
    .label {
      color: #334155;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      font-weight: 700;
    }
    .screen-only {
      background: #f8fafc;
      border-bottom: 1px solid #cbd5e1;
      color: #334155;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      margin: -0.6in -0.6in 20px;
      padding: 10px 0.6in;
    }
    @media print {
      .screen-only { display: none; }
      .chunk { break-inside: auto; }
    }
  </style>
</head>
<body>
  <div class="screen-only">Use your browser print dialog to print or save as PDF.</div>
  <header>
    <h1>${escapeHtml(title)}</h1>
    ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ""}
  </header>
  ${chunks.map((chunk, index) => renderChunk(chunk, index)).join("\n")}
</body>
</html>`;
}

function renderChunk(chunk: ContentChunk, index: number) {
  return `<section class="chunk">
  <div class="chunk-code">${index + 1}. ${escapeHtml(chunk.chunkCode)}</div>
  <h2>${escapeHtml(chunk.chunkTitle)}</h2>
  ${renderMarkdownBlocks(chunk.contentMarkdown)}
</section>`;
}

function renderMarkdownBlocks(markdown: string) {
  const blocks = markdown
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\r/g, "").trim())
    .filter(Boolean);

  return blocks.map(renderBlock).join("\n");
}

function renderBlock(block: string) {
  const imageMatch = block.match(/^!\[(.*?)\]\((data:image\/[^)]+)\)$/);
  const tableRows = parseMarkdownTable(block);
  const footnotes = parseFootnotes(block);
  const questionMatch = block.match(/^(95-Q\d+:\s*)(.*)$/i);
  const answerMatch = block.match(/^(A:\s*)(.*)$/i);
  const numberedMatch = block.match(/^(\d+)[.)]\s+([\s\S]+)$/);
  const bulletMatch = block.match(/^([-*]|o)\s+([\s\S]+)$/);

  if (imageMatch) return `<img alt="${escapeHtml(imageMatch[1])}" src="${imageMatch[2]}" />`;
  if (tableRows) return renderTable(tableRows);
  if (footnotes) return renderFootnotes(footnotes);
  if (questionMatch) return `<div class="question"><div class="label">${escapeHtml(questionMatch[1].trim())}</div><div>${escapeHtml(questionMatch[2].trim())}</div></div>`;
  if (answerMatch) return `<div class="answer"><div class="label">${escapeHtml(answerMatch[1].trim())}</div><div>${escapeHtml(answerMatch[2].trim())}</div></div>`;
  if (numberedMatch) return `<ol><li>${escapeHtml(numberedMatch[2].trim())}</li></ol>`;
  if (bulletMatch) return `<ul><li>${escapeHtml(bulletMatch[2].trim())}</li></ul>`;

  return `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`;
}

function renderTable(rows: string[][]) {
  return `<table>${rows
    .map((row, rowIndex) => {
      const tag = rowIndex === 0 ? "th" : "td";
      return `<tr>${row.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join("")}</tr>`;
    })
    .join("")}</table>`;
}

function renderFootnotes(notes: { label: string; text: string }[]) {
  return `<div class="footnotes"><div class="footnote-title">Source Notes</div>${notes
    .map((note) => `<p><strong>[${escapeHtml(note.label)}]</strong> ${escapeHtml(note.text)}</p>`)
    .join("")}</div>`;
}

function parseMarkdownTable(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2 || !lines.every((line) => line.includes("|"))) return null;
  const rows = lines
    .filter((line) => !/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(line))
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim())
    )
    .filter((row) => row.some(Boolean));
  return rows.length >= 2 ? rows : null;
}

function parseFootnotes(text: string) {
  const notes = text
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^\[\^?(\d+)\]:\s+([\s\S]+)$/);
      return match ? { label: match[1], text: match[2].trim() } : null;
    })
    .filter((note): note is { label: string; text: string } => Boolean(note));
  return notes.length > 0 ? notes : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

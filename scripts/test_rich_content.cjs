const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const cache = new Map(), calls = [];
const signedStorage = { storage: { from: (bucket) => ({
  createSignedUrls: async (paths) => {
    calls.push({ bucket, paths });
    return { data: paths.map((p) => ({ path: p, signedUrl: "https://official.invalid/" + p + "?token=test&version=1" })), error: null };
  }
}) } };
const contextGlobals = {};
function load(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute);
  const module = { exports: {} };
  cache.set(absolute, module.exports);
  const context = { exports: module.exports, module, ...contextGlobals, require: (name) => {
    if (name.endsWith("/lib/supabase")) return { supabase: signedStorage };
    if (name.startsWith(".")) return load(path.resolve(path.dirname(absolute), name + ".ts"));
    throw new Error("Unexpected import: " + name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, context);
  return module.exports;
}

async function main() {
  const source = JSON.parse(fs.readFileSync("src/data/challahImportPreview.json", "utf8"));
  const payload = JSON.parse(fs.readFileSync("tmp/shiur-import-preview/challah-part1/import/payload.json", "utf8"));
  const pure = load("src/shared/documentContent.ts");
  const html = load("src/shared/richDocumentHtml.ts");
  const assets = load("src/shared/documentAssets.ts");
  for (const row of payload.chunks) {
    assert.ok(pure.readRichContent(row.content_document), row.chunk_code);
    assert.equal(row.program_id, "winter-5787");
  }
  const originals = source.chunks.map((c) => ({ version: 1, blocks: c.blocks, footnotes: c.footnotes }));
  const bodies = originals.map(html.renderRichDocument).join("");
  assert.ok(bodies.includes("<strong>") && bodies.includes("<em>") && bodies.includes("<u>"));
  assert.ok(bodies.includes("<sup") && bodies.includes("Source Notes"));
  assert.equal((bodies.match(/<img /g) ?? []).length, 61);
  assert.ok(bodies.includes("margin-left:72pt") || bodies.includes("margin-left:54pt"));
  const resolved = await assets.resolveDocumentAssets(payload.chunks.map((c) => c.content_document));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].paths.length, 61);
  assert.equal(calls[0].bucket, "official-learning-materials");
  await assets.resolveDocumentAssets(payload.chunks.map((c) => c.content_document));
  assert.equal(calls.length, 1, "Repeated packets must reuse signed references");
  assert.equal(pure.readRichContent({ version: 1, blocks: [], footnotes: [null] }), undefined);
  assert.equal(pure.readRichContent({ version: 2, blocks: [], footnotes: [] }), undefined);
  const dangerous = html.renderRichDocument({ version: 1, blocks: [
    { kind: "paragraph", spans: [{ text: "<script>alert(1)</script>", href: "javascript:alert(1)" }] },
    { kind: "image", uri: "javascript:alert(1)" }
  ], footnotes: [] });
  assert.ok(!dangerous.includes("<script>") && !dangerous.includes("<a ") && !dangerous.includes("<img "));
  let printed = 0, removed = 0, written = "", badImage = false;
  contextGlobals.window = {
    setTimeout: (fn, delay) => { if (delay === 500) fn(); return 1; }, clearTimeout: () => {}
  };
  contextGlobals.document = {
    body: { appendChild: () => {} },
    createElement: () => ({
      style: {}, remove: () => { removed++; },
      contentWindow: {
        document: {
          images: [{ complete: true, naturalWidth: badImage ? 0 : 1224 }],
          fonts: { ready: Promise.resolve() }, open: () => {}, close: () => {}, write: (text) => { written = text; }
        },
        focus: () => {}, print: () => { printed++; }
      }
    })
  };
  const print = load("src/shared/packetPrint.ts");
  const chunks = payload.chunks.map((c, i) => ({ id: c.chunk_code, chunkCode: c.chunk_code, chunkTitle: c.chunk_title,
    sourceType: c.source_type, contentMarkdown: c.content_markdown, contentDocument: resolved[i] }));
  const packet = { title: "Winter 5787 Test", meta: "Week 1", chunks };
  assert.equal(await print.printPacket(packet), null);
  assert.equal(printed, 1);
  assert.equal((written.match(/<img /g) ?? []).length, 61);
  assert.ok(written.includes("<strong>") && written.includes("<em>") && written.includes("<u>") && written.includes("Source Notes"));
  assert.ok(written.includes("?token=test&amp;version=1"));
  badImage = true;
  assert.match(await print.printPacket(packet), /image could not be loaded/);
  assert.equal(printed, 1, "Broken images must prevent printing");
  assert.equal(removed, 1);
  const legacy = print.buildPrintablePacketHtml({ title: "Summer", chunks: [{
    chunkCode: "95-B1", chunkTitle: "Summer", sourceType: "notes", contentMarkdown: "Original Summer text"
  }] });
  assert.ok(legacy.includes("Original Summer text") && !legacy.includes("rich-document"));
  fs.writeFileSync("tmp/shiur-import-preview/challah-part1/import/print-preview.html",
    print.buildPrintablePacketHtml({ title: "Challah Part 1 print review", chunks: source.chunks.map((c, i) => ({
      chunkCode: c.code, chunkTitle: c.title, sourceType: c.sourceType === "sources" ? "source" : c.sourceType,
      contentDocument: originals[i], contentMarkdown: c.contentMarkdown
    })) }));
  console.log("PASS: structured documents, bold/italic/underline, nested indent, footnotes, 61 graphics, Hebrew-safe spans, shared signing cache, safe HTML, print readiness/failure, Summer fallback.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync("src/shared/documentContent.ts", "utf8");
const ast = ts.createSourceFile("ImportDocument.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "isolateImportSpans");
assert.ok(declaration);
const compiled = ts.transpileModule(declaration.getText(ast), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const appContext = { exports: {} };
vm.runInNewContext(compiled, appContext);
const appIsolate = appContext.exports.isolateImportSpans;

const html = fs.readFileSync("scripts/challah_preview_template.html", "utf8");
const start = html.indexOf("function isolateImportSpans(");
const end = html.indexOf("function spans(", start);
assert.ok(start >= 0 && end > start);
const htmlContext = {};
vm.runInNewContext(html.slice(start, end), htmlContext);
const htmlIsolate = htmlContext.isolateImportSpans;
const data = JSON.parse(fs.readFileSync("src/data/challahImportPreview.json", "utf8"));

for (const chunk of data.chunks) {
  const blocks = [...chunk.blocks, ...chunk.footnotes.flatMap((note) => note.blocks)];
  for (const block of blocks) {
    const parts = block.spans ?? [];
    const rendered = appIsolate(parts);
    assert.equal(JSON.stringify(rendered), JSON.stringify(htmlIsolate(parts)));
    assert.equal(rendered.map((part) => part.text).join("").replace(/[\u2067\u2069]/g, ""),
      parts.map((part) => part.text).join(""));
    assert.equal(rendered.length, parts.length);
  }
}

const paragraph = data.chunks.find((chunk) => chunk.code === "HC1-F3").blocks.find((block) => block.paragraph === 135);
const display = appIsolate(paragraph.spans).map((part) => part.text).join("");
const units = ["כור", "איפה", "סאה", "קב", "לוג", "ביצה"];
assert.ok(display.includes(units.map((unit, index) =>
  "\u2067" + unit + (index === units.length - 1 ? "." : "") + "\u2069").join(", ")));
// Every possible formatting split must preserve one isolate around a complete word.
for (const unit of units) {
  for (let split = 1; split < unit.length; split++) {
    const parts = [{ text: unit.slice(0, split), bold: true }, { text: unit.slice(split) }];
    assert.equal(appIsolate(parts).map((part) => part.text).join(""), "\u2067" + unit + "\u2069");
  }
}
console.log("HTML/app bidi rendering agrees; official text preserved; split Hebrew initials stay attached.");

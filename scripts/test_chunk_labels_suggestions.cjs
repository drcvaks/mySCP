const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function compile(source) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
}
const labels = {};
vm.runInNewContext(compile(fs.readFileSync("src/shared/chunkLabels.ts", "utf8")), { exports: labels });
for (const [input, expected] of [
  ["HC1-A1", "A1"], ["HC1-Q18", "Q18"], ["HC1-S57", "S57"],
  ["HC2-B3", "B3"], ["95-B6", "95-B6"], ["95-Q1", "95-Q1"], ["other", "other"]
]) assert.equal(labels.chunkDisplayCode(input), expected);

const source = fs.readFileSync("app/(tabs)/shiur-builder.tsx", "utf8");
const ast = ts.createSourceFile("builder.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = {};
let addSection;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "addSection") addSection = node.getText(ast);
  if (ts.isVariableDeclaration(node) && ["suggestedChunks", "uniqueSuggestedChunks"].includes(node.name.getText(ast))) {
    declarations[node.name.getText(ast)] = `const ${node.getText(ast)};`;
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(addSection && declarations.suggestedChunks && declarations.uniqueSuggestedChunks);

for (const activeCategory of ["notes", "qa", "source"]) {
  const chunks = ["notes", "qa", "source"].flatMap((category) => [1, 2].map((n) => ({
    id: `${category}${n}`, sourceType: category, section: `${category}${n}`, chunkCode: `HC1-${category}${n}`
  })));
  let selected = ["parent", `${activeCategory}1`, "unrelated"];
  const expanded = [];
  const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const links = chunks.flatMap((chunk) => [1, 2].map(() => ({ parentChunkId: "parent", relatedChunkId: chunk.id })));
  links.push({ parentChunkId: "not-selected", relatedChunkId: "unrelated" });
  const context = {
    selectedIds: selected, links, chunkById, activeCategory,
    setSelectedIds: (update) => { selected = update(selected); },
    normalizePacketIds: (ids) => ids,
    sectionKeyForChunk: (chunk) => chunk.section,
    expandPacketSection: (key) => expanded.push(key)
  };
  vm.runInNewContext(compile(`${declarations.suggestedChunks}\n${declarations.uniqueSuggestedChunks}\n${addSection}
    globalThis.suggested = uniqueSuggestedChunks;
    globalThis.addAll = () => addSection(uniqueSuggestedChunks);`), context);
  assert.deepEqual(Array.from(context.suggested, (chunk) => chunk.id), [`${activeCategory}2`]);
  context.addAll();
  context.addAll();
  assert.deepEqual(Array.from(selected), ["parent", `${activeCategory}1`, "unrelated", `${activeCategory}2`]);
  assert.ok(expanded.includes(`${activeCategory}2`));
}

// Bulk additions spanning several folders expand each affected folder.
const expanded = [];
vm.runInNewContext(compile(`${addSection}\naddSection([{id:"a", section:"A"}, {id:"b", section:"B"}, {id:"c", section:"A"}]);`), {
  setSelectedIds: (update) => update([]), normalizePacketIds: (ids) => ids,
  sectionKeyForChunk: (chunk) => chunk.section, expandPacketSection: (key) => expanded.push(key)
});
assert.deepEqual(expanded, ["A", "B"]);
assert.ok(source.includes('onPress={() => addSection(uniqueSuggestedChunks)}'));
assert.ok(source.includes('uniqueSuggestedChunks.length > 0 && canEditPacket'));
for (const path of ["app/(tabs)/shiur-builder.tsx", "app/(tabs)/shiur-packet.tsx", "src/shared/PacketPreviewModal.tsx"]) {
  const content = fs.readFileSync(path, "utf8");
  assert.ok(content.includes("chunkDisplayCode(chunk.chunkCode)"), path);
  assert.ok(content.includes("chunkCode: row.chunk_code"), "Stored codes remain intact: " + path);
}
console.log("PASS: display-only chunk labels; category-filtered, deduplicated bulk suggestions; existing selections retained; affected folders expanded.");

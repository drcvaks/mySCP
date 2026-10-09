const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const moduleExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/shared/sourceSheetLayout.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, { exports: moduleExports });
const pixels = new Uint8ClampedArray(200 * 300 * 4).fill(255);
function ink(x, y) { pixels[(y * 200 + x) * 4] = 0; }
ink(40, 100); ink(160, 180);
const bounds = moduleExports.sourceInkBounds(pixels, 200, 300);
assert.equal(bounds.left, 28);
assert.equal(bounds.top, 88);
assert.equal(bounds.width, 145);
assert.equal(bounds.height, 105);
ink(0, 0); ink(199, 299);
const full = moduleExports.sourceInkBounds(pixels, 200, 300);
assert.equal(full.width, 200); assert.equal(full.height, 300);
const split = new Uint8ClampedArray(200 * 1000 * 4).fill(255);
split[(100 * 200 + 20) * 4] = 0;
split[(400 * 200 + 180) * 4] = 0;
split[(970 * 200 + 100) * 4] = 0;
assert.equal(moduleExports.sourceInkBounds(split, 200, 1000, true).height, 325);
assert.equal(moduleExports.sourceInkBounds(split, 200, 1000).height, 895);
assert.equal(moduleExports.sourceInkBounds(new Uint8ClampedArray(16).fill(255), 2, 2), null);
const print = fs.readFileSync("src/shared/packetPrint.ts", "utf8");
assert.ok(!print.includes("break-before: page"));
assert.ok(print.includes(".source-sheet { break-inside: avoid; }"));
assert.ok(print.includes("compactSourceDocument(chunk.contentDocument)"));
console.log("PASS: compact bounds retain all detected content, preserve edge content, and allow source pages to flow.");

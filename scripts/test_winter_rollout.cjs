const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync("src/shared/learningPrograms.ts", "utf8");
function load(text) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
  return exports;
}
const winter = { id: "winter-5787", name: "Winter 5787", defaultWeek: 1, archived: false };
const api = load(source);
const programs = [api.legacySummerProgram, winter];
assert.equal(api.selectablePrograms(programs).map((p) => p.id).join(","), "winter-5787");
for (const requested of [undefined, "summer-5786", "winter-5787"]) {
  assert.equal(api.rolloutProgramSelection(requested, programs, true), "winter-5787");
}
assert.equal(api.rolloutProgramSelection("summer-5786", programs, false), "summer-5786");
assert.equal(api.rolloutProgramSelection(undefined, [api.legacySummerProgram], true), "summer-5786");
assert.equal(programs.length, 2, "Keep Summer records available internally");
assert.equal(api.belongsToProgram({ programId: "summer-5786" }, "winter-5787"), false);
assert.equal(api.programName("summer-5786"), "Summer 5786");
const restored = load(source.replace("WINTER_ONLY_ROLLOUT = true", "WINTER_ONLY_ROLLOUT = false"));
assert.equal(restored.selectablePrograms(programs).length, 2);
assert.equal(restored.rolloutProgramSelection("summer-5786", programs, true), "summer-5786");
console.log("PASS: Winter-only selector/default, old defaults overridden, legacy fallback, preserved Summer, and reversible rollout.");

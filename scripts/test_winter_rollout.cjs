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
const target = "70a993a2-7668-4775-aa46-7ac82117d35b";
const tefillin = { id: "summer-5787", name: "Summer 5787", topic: "Hilchos Tefillin", defaultWeek: 1,
  archived: false, earlyAccess: true, allowedChaburahIds: [target] };
const api = load(source);
const programs = [api.legacySummerProgram, winter];
assert.equal(api.selectablePrograms(programs).map((p) => p.id).join(","), "winter-5787");
for (const requested of [undefined, "summer-5786", "winter-5787"]) {
  assert.equal(api.rolloutProgramSelection(requested, programs, true), "winter-5787");
}
assert.equal(api.rolloutProgramSelection("summer-5786", programs, false), "summer-5786");
assert.equal(api.rolloutProgramSelection(undefined, [api.legacySummerProgram], true), "summer-5786");
assert.equal(programs.length, 2, "Keep Summer records available internally");
assert.equal(api.rolloutPrograms(programs).map(p=>p.id).join(','),'winter-5787');
assert.equal(api.belongsToProgram({ programId: "summer-5786" }, "winter-5787"), false);
assert.equal(api.programName("summer-5786"), "Summer 5786");
const restored = load(source.replace("WINTER_ONLY_ROLLOUT = true", "WINTER_ONLY_ROLLOUT = false"));
assert.equal(restored.selectablePrograms(programs).length, 2);
assert.equal(restored.rolloutProgramSelection("summer-5786", programs, true), "summer-5786");
const all = [...programs, tefillin];
assert.equal(api.rolloutPrograms(all).map(p=>p.id).join(','),'winter-5787,summer-5787','Worldwide composer hides test zeman without changing authorized Tefillin visibility');
assert.equal(restored.rolloutPrograms(all).length,3,'Test zeman visibility remains reversible');
const editor=fs.readFileSync('src/shared/BeisMidrashEditor.tsx','utf8');
assert.ok(editor.includes('rolloutPrograms(programs).map'),'Discussion selector uses the rollout rule');
for (const access of [{}, { chaburahId: "other" }]) {
  assert.equal(api.selectablePrograms(all, access).map((p) => p.id).join(","), "winter-5787");
  assert.equal(api.rolloutProgramSelection("summer-5787", all, true, access), "winter-5787");
}
for (const access of [{ chaburahId: target }, { isGlobalAdmin: true }]) {
  assert.equal(api.selectablePrograms(all, access).map((p) => p.id).join(","), "winter-5787,summer-5787");
  assert.equal(api.rolloutProgramSelection("summer-5787", all, true, access), "summer-5787");
  assert.equal(api.rolloutProgramSelection("winter-5787", all, true, access), "winter-5787");
}
assert.equal(api.rolloutProgramSelection("missing", all, true, { isGlobalAdmin: true }), "winter-5787");
assert.equal(api.programName("summer-5787"), "Summer 5787");
assert.equal(api.selectablePrograms([...programs, { ...tefillin, earlyAccess: false }]).length, 2, "Future public release needs no rename");
console.log("PASS: access-aware Winter/Tefillin selection, independent defaults, revoked-access fallback, hidden legacy Summer, and reversible rollout.");

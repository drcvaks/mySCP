const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const source = fs.readFileSync("app/(tabs)/dashboard.tsx", "utf8");
let state;
const component = name => name;
const exportsObject = {};
const stubs = {
  "../../src/shared/ProgramSelector": {ProgramSelector: component("ProgramSelector")},
  "react-native": {Text: component("Text"), View: component("View")},
  "expo-router": {useRouter: () => ({push: () => {}})},
  "../../src/shared/components": Object.fromEntries(["Button", "Card", "Pill", "Row", "Screen", "SectionTitle"].map(name => [name, component(name)]).concat([["styles", {}]])),
  "../../src/shared/format": {},
  "../../src/shared/useRefreshOnFocus": {useRefreshOnFocus: () => {}},
  "../../src/state/AuthState": {useAuthState: () => ({profile: {id: "viewer", role: "participant"}})},
  "../../src/state/AppState": {useAppState: () => state}
};
vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX
}}).outputText, {exports: exportsObject, require: name => stubs[name] ?? require(name)});
function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(text).join("");
  if (typeof node === "object") return text(node.props?.children);
  return String(node);
}
for (const program of [
  {id: "winter-5787", name: "Winter 5787", topic: "Challah & Terumos/Maasros", week: 3},
  {id: "summer-5787", name: "Summer 5787", topic: "Hilchos Tefillin", week: 7},
  {id: "summer-5786", name: "Summer 5786", topic: "Nat Bar Nat", week: 16},
  {id: "winter-5787", name: "Winter 5787", topic: "Challah & Terumos/Maasros", week: 1}
]) {
  state = {announcements: [], askRavQuestions: [], chaburos: [], currentReviewWeek: program.week,
    learningFiles: [], loading: false, memberships: [], refresh: () => {}, reviewQuestions: [], reviewSessions: [],
    discussionUnreadCount: 0, notificationUnreadCount: 0, selectedChaburahId: "mine", selectedProgram: program};
  const tree = exportsObject.default();
  assert.equal(tree.type, "Screen");
  assert.equal(tree.props.title, "This Week in SCP");
  assert.equal(tree.props.eyebrow, undefined);
  const currentTopicCard = tree.props.children[0];
  const content = text(currentTopicCard);
  assert.ok(content.includes(program.topic));
  assert.ok(content.includes(`${program.name} - Week ${program.week}`));
  assert.ok(!content.includes("Practical Kashrus"));
  assert.ok(!content.includes("Week 1 of Nat Bar Nat"));
}
console.log("PASS: dashboard uses selected program topic/name and current week across Winter/Summer switches; obsolete eyebrow removed.");

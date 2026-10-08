const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

let accept = false, confirmation = "", saved = 0, nativeAction = "Cancel";
const native = {
  Platform: { OS: "web" }, View: "View", Text: "Text",
  Alert: { alert: (_title, body, buttons) => {
    confirmation = body;
    buttons.find((button) => button.text === nativeAction).onPress();
  } }
};
const element = (type, props) => ({ type, props });
const modules = {
  react: { useEffect: () => {}, useState: (initial) => [initial, () => {}] },
  "react/jsx-runtime": { jsx: element, jsxs: element },
  "react-native": native,
  "./components": { Button: "Button", FilterChip: "FilterChip", FormInput: "FormInput",
    MetaText: "MetaText", Row: "Row", styles: {} }
};
const context = {
  exports: {}, require: (name) => modules[name] ?? {},
  window: { confirm: (body) => { confirmation = body; return accept; } }
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/shared/ProgramSelector.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }
}).outputText, context);

function findButton(node, label) {
  if (!node || typeof node !== "object") return undefined;
  if (node.type === "Button" && node.props.label === label) return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findButton(child, label);
    if (found) return found;
  }
}

async function main() {
  const summer = { id: "summer-5786", name: "Summer 5786" };
  const winter = { id: "winter-5787", name: "Winter 5787" };
  const state = {
    programs: [summer, winter], programsReady: true, selectedProgram: winter, selectedProgramId: winter.id,
    selectedChaburahId: "group", currentReviewWeek: 1,
    chaburos: [{ id: "group", name: "Vaks Chaburah", defaultProgramId: summer.id }],
    makeProgramDefault: async () => { saved++; return null; }
  };
  const view = context.exports.ProgramControls({ state, canManage: true });
  const button = findButton(view, "Set Winter 5787 as Chaburah Default");
  assert.ok(button);
  button.props.onPress();
  await new Promise(setImmediate);
  assert.equal(saved, 0, "Cancel must not update the default");
  assert.ok(confirmation.includes("Members of Vaks Chaburah will start in Winter 5787"));
  assert.ok(confirmation.includes("Summer 5786 will remain available."));
  assert.ok(confirmation.includes("Week counters won't change."));
  accept = true;
  button.props.onPress();
  await new Promise(setImmediate);
  assert.equal(saved, 1);
  assert.equal(findButton(context.exports.ProgramControls({ state, canManage: false }), button.props.label), undefined);
  native.Platform.OS = "android";
  assert.equal(await context.exports.confirmDefaultProgram("Summer 5786", "Vaks Chaburah", ["Winter 5787"]), false);
  assert.ok(confirmation.includes("Winter 5787 will remain available."));
  nativeAction = "Set Default";
  assert.equal(await context.exports.confirmDefaultProgram("Winter 5787", "Vaks Chaburah", ["Summer 5786"]), true);
  console.log("PASS: named button, chaburah-specific confirmation, cancel/confirm behavior, participant visibility, native confirmation.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

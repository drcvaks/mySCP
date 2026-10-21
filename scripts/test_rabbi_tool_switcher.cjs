const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const compile = source => ts.transpileModule(source, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020
} }).outputText;
const sidebar = ts.createSourceFile("sidebar.tsx", fs.readFileSync("src/shared/SidebarNavigation.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = sidebar.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations[0].name.getText(sidebar) === "navigationItems");
const navigationItems = vm.runInNewContext(compile("(" + declaration.declarationList.declarations[0].initializer.getText(sidebar) + ")"));
const exportsObject = {};
const jsx = (type, props) => ({ type, props });
vm.runInNewContext(compile(fs.readFileSync("src/shared/RabbiToolSwitcher.tsx", "utf8")), { exports: exportsObject, require: name => {
  if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
  if (name === "react-native") return { Pressable: "Pressable", Text: "Text", View: "View", StyleSheet: { create: value => value } };
  if (name === "@expo/vector-icons") return { Ionicons: "Icon" };
  if (name === "./SidebarNavigation") return { navigationItems };
  throw new Error(name);
} });
let selected;
for (const askRavEnabled of [true, false]) {
  const tree = exportsObject.RabbiToolSwitcher({ active: "shiur-builder", askRavEnabled, onSelect: tool => { selected = tool; } });
  const buttons = tree.props.children;
  assert.equal(buttons.length, askRavEnabled ? 3 : 2);
  const builder = buttons.find(button => button.props.accessibilityLabel === "Shiur Builder");
  assert.equal(builder.props["aria-selected"], true);
  builder.props.onPress();
  assert.equal(selected, undefined, "Selecting the current tool does not navigate again");
  const questions = buttons.find(button => button.props.accessibilityLabel === "Quick Review Questions");
  questions.props.onPress();
  assert.equal(selected, "quick-review");
  selected = undefined;
}
console.log("PASS: shared tool switcher, active state, navigation actions and disabled Ask Rav visibility.");

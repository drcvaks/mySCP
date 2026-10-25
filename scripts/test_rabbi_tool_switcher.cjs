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
const responsive = {};
vm.runInNewContext(compile(fs.readFileSync("src/shared/responsiveLayout.ts", "utf8")), { exports: responsive });
let viewport = { width: 1440, height: 1000 };
const jsx = (type, props) => ({ type, props });
vm.runInNewContext(compile(fs.readFileSync("src/shared/RabbiToolSwitcher.tsx", "utf8")), { exports: exportsObject, require: name => {
  if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
  if (name === "react-native") return { Pressable: "Pressable", Text: "Text", View: "View", useWindowDimensions: () => viewport, StyleSheet: { create: value => value } };
  if (name === "@expo/vector-icons") return { Ionicons: "Icon" };
  if (name === "./SidebarNavigation") return { navigationItems };
  if (name === "./responsiveLayout") return responsive;
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
const worldwide = exportsObject.RabbiToolSwitcher({ active: "beis-midrash", askRavEnabled: true, beisMidrashEnabled: true, onSelect: () => {} });
assert.equal(worldwide.type, "View"); assert.equal(worldwide.props.children.length, 4);
for (const width of [320, 390, 844, 1200, 1440]) {
  viewport = { width, height: width === 844 ? 390 : 1000 };
  const row = exportsObject.RabbiToolSwitcher({ active: "beis-midrash", askRavEnabled: true, beisMidrashEnabled: true, onSelect: () => {} });
  assert.equal(row.props.children.length, 4);
  for (const button of row.props.children) {
    const styles = button.props.style({ pressed: false }).filter(Boolean);
    assert.equal(styles[0].flex, 1); assert.equal(styles[0].minWidth, 0);
  }
}
const visiting = exportsObject.RabbiToolSwitcher({ active: "beis-midrash", askRavEnabled: true, beisMidrashEnabled: true, localTools: false, onSelect: () => {} });
assert.equal(visiting.props.children.length, 1); assert.equal(visiting.props.children[0].props.accessibilityLabel, "Beis Midrash");

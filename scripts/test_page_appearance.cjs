const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const navSource = fs.readFileSync("src/shared/SidebarNavigation.tsx", "utf8");
const ast = ts.createSourceFile("sidebar.tsx", navSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = ast.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations[0].name.getText(ast) === "navigationItems");
const navigationItems = vm.runInNewContext(ts.transpileModule("(" + declaration.declarationList.declarations[0].initializer.getText(ast) + ")", {}).outputText);
const navigation = { navigationItems, isSidebarRoute: (route) => Object.hasOwn(navigationItems, route) };
const responsive = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/shared/responsiveLayout.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, { exports: responsive });
let viewportWidth = 1280;
function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, { exports, require: (name) => {
    if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === "react-native") return { View: "View", Text: "Text", Pressable: "Pressable", StyleSheet: { create: (value) => value },
      useWindowDimensions: () => ({ width: viewportWidth }) };
    if (name === "@expo/vector-icons") return { Ionicons: "Icon" };
    if (name === "./SidebarNavigation") return navigation;
    if (name === "./responsiveLayout") return responsive;
    if (name === "./components") return { Button: "Button", Pill: "Pill" };
    throw new Error(name);
  } });
  return exports;
}
function all(tree, type) {
  if (!tree || typeof tree !== "object") return [];
  const children = tree.props?.children;
  return (tree.type === type ? [tree] : []).concat((Array.isArray(children) ? children : [children]).flatMap((child) => all(child, type)));
}
const { PageHeading } = load("src/shared/PageHeading.tsx");
let refreshed = 0, opened = 0;
const header = PageHeading({ title: "My Chaburah", eyebrow: "A very long congregation name", pathname: "/chaburah", onRefresh: () => refreshed++ });
assert.equal(all(header, "Icon")[0].props.name, "people");
assert.equal(all(header, "Text").some((text) => text.props.children === "My Chaburah"), true);
all(header, "Pressable")[0].props.onPress();
assert.equal(refreshed, 1);
const loading = PageHeading({ title: "Files", pathname: "/files", onRefresh: () => refreshed++, refreshing: true });
assert.equal(all(loading, "Pressable")[0].props.disabled, true);
const account = { type: "Account", props: {} };
const spacedHeader = PageHeading({ title: "Dashboard", pathname: "/dashboard", accountButton: account, accessory: "Programs" });
assert.ok(all(spacedHeader, "View").some(view => Array.isArray(view.props.style) && view.props.style.some(style => style?.marginLeft === 12)),
  "Inline program buttons get extra space before the account icon");
const stackedHeader = PageHeading({ title: "Dashboard", pathname: "/dashboard", accountButton: account, accessory: "Programs", stackAccessory: true });
assert.ok(!all(stackedHeader, "View").some(view => Array.isArray(view.props.style) && view.props.style.some(style => style?.marginLeft === 12)),
  "Stacked phone headers do not waste space beside the account icon");
assert.equal(all(PageHeading({ title: "Shiur Builder", pathname: "/shiur-builder" }), "Icon")[0].props.name, "library");
viewportWidth = 360;
const phoneHeader = PageHeading({ title: "This Week in SCP", eyebrow: "A long congregation name", pathname: "/dashboard" });
assert.equal(all(phoneHeader, "Text")[0].props.numberOfLines, 1, "Phone eyebrow cannot consume multiple header lines");
assert.equal(all(phoneHeader, "Text")[1].props.style[1].fontSize, 21);
const { WorkflowCard } = load("src/shared/WorkflowCard.tsx");
const card = WorkflowCard({ label: "Shiur Builder", meta: "Official SCP material", onPress: () => opened++ });
assert.equal(all(card, "Icon")[0].props.name, "library");
assert.equal(all(card, "Button")[0].props.label, "Open");
all(card, "Button")[0].props.onPress();
assert.equal(opened, 1);
const selected = WorkflowCard({ label: "Quick Review Questions", meta: "Weekly review", active: true, count: 0, onPress: () => {} });
assert.equal(all(selected, "Button")[0].props.label, "Selected");
assert.equal(all(selected, "Pill")[0].props.label, "0");
console.log("PASS: page titles, route icons, refresh/disabled controls, workflow actions and selected states.");

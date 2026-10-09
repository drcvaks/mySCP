const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const source = fs.readFileSync("app/(tabs)/_layout.tsx", "utf8");
const ast = ts.createSourceFile("layout.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const fn = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "SidebarTabBar");
assert.ok(fn);
const known = ["dashboard", "review", "rabbi-hub", "ask-rav", "global-admin"];
const context = {
  exports: {},
  SidebarNavigation: "sidebar",
  isSidebarRoute: (name) => known.includes(name),
  StyleSheet: { flatten: (value) => value },
  require: (name) => {
    assert.equal(name, "react/jsx-runtime");
    return { jsx: (type, props) => ({ type, props }) };
  }
};
vm.createContext(context);
vm.runInContext(ts.transpileModule(fn.getText(ast), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, context);
const routes = known.concat("shiur-builder").map((name) => ({ key: name, name }));
const descriptors = Object.fromEntries(routes.map((route) => [route.key, { options: {
  title: route.name, tabBarItemStyle: ["ask-rav", "global-admin", "shiur-builder"].includes(route.name) ? { display: "none" } : {}
} }]));
let prevented = false, event;
const result = context.SidebarTabBar({ state: { routes, index: routes.length - 1 }, descriptors,
  navigation: { emit: (value) => { event = value; return { defaultPrevented: prevented }; } },
  chaburah: "My Chaburah", width: 224 });
assert.equal(result.props.selected, "rabbi-hub");
assert.equal(result.props.items.map((item) => item.name).join(","), "dashboard,review,rabbi-hub");
assert.equal(result.props.items[0].href, "/dashboard");
assert.equal(result.props.items[0].onSelect(), true);
assert.equal(event.type, "tabPress");
prevented = true;
assert.equal(result.props.items[0].onSelect(), false);
assert.ok(source.includes(": <BottomTabBar {...props} />"), "Keep native phone navigation unchanged");
const sidebar = fs.readFileSync("src/shared/SidebarNavigation.tsx", "utf8");
assert.ok(sidebar.includes("style={StyleSheet.flatten([s.item"), "Expo Link asChild must receive a concrete style object, not a Pressable callback");
assert.ok(!sidebar.includes("style={({ pressed })"));
const preview = fs.readFileSync("app/navigation-preview.tsx", "utf8");
assert.ok(preview.includes('href: "/navigation-preview"'), "Visual tests must exercise the same Link wrapper as production");
console.log("PASS: hidden/role-based menus, Rabbi Hub nested selection, navigation events, and phone navigation.");

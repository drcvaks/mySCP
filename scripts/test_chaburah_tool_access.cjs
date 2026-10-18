const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const compile = source => ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX}}).outputText;
const permissions = {};
vm.runInNewContext(compile(fs.readFileSync("src/shared/permissions.ts", "utf8")), {exports: permissions});
let role = "local_rabbi", chaburah = "own", route = "dashboard", platform = "web", width = 1440;
let memberships = [
  {userId: "viewer", chaburahId: "own", status: "active", memberRole: "rabbi"},
  {userId: "viewer", chaburahId: "other", status: "active", memberRole: "participant"},
  {userId: "someone-else", chaburahId: "other", status: "active", memberRole: "rabbi"}
];
const profile = () => ({id: "viewer", role});
const jsx = (type, props) => ({type, props});
const tabs = Object.assign("Tabs", {Screen: "TabScreen"});
const layout = {};
const stubs = {
  "react/jsx-runtime": {jsx, jsxs: jsx},
  "@expo/vector-icons": {Ionicons: "Icon"},
  "@react-navigation/bottom-tabs": {BottomTabBar: "BottomTabBar"},
  "expo-router": {Redirect: "Redirect", Tabs: tabs, useSegments: () => ["(tabs)", route]},
  "react-native": {Platform: {get OS() {return platform;}}, StyleSheet: {}, useWindowDimensions: () => ({width, height: 900}), View: "View", Text: "Text", ActivityIndicator: "Loading"},
  "../../src/shared/SidebarNavigation": {},
  "../../src/shared/permissions": permissions,
  "../../src/shared/components": {Button: "Button"},
  "../../src/shared/theme": {theme: {colors: {}}},
  "../../src/state/AuthState": {useAuthState: () => ({profile: profile(), session: {}, loading: false})},
  "../../src/state/AppState": {useAppState: () => ({chaburos: [], hydrated: true, memberships, selectedChaburahId: chaburah})}
};
vm.runInNewContext(compile(fs.readFileSync("app/(tabs)/_layout.tsx", "utf8")), {exports: layout, require: name => stubs[name]});
function screen(tree, name) {return tree.props.children.find(child => child.props.name === name);}
for (const os of ["web", "android", "ios"]) {
  platform = os; width = os === "web" ? 1440 : 390;
  chaburah = "own"; role = "local_rabbi"; route = "dashboard";
  let tree = layout.default();
  assert.equal(screen(tree, "rabbi-hub").props.options.href, undefined);
  assert.equal(screen(tree, "review").props.options.href, os === "web" ? undefined : null);
  chaburah = "other";
  tree = layout.default();
  assert.equal(screen(tree, "rabbi-hub").props.options.href, null);
  assert.equal(screen(tree, "admin").props.options.href, null);
  assert.equal(screen(tree, "review").props.options.href, undefined);
  for (route of ["admin", "rabbi-hub", "shiur-builder", "shiur-import-preview", "source-sheets-import-preview"]) {
    tree = layout.default();
    assert.equal(tree.type, "Redirect");assert.equal(tree.props.href, "/(tabs)/dashboard");
  }
  role = "global_admin";
  for (route of ["admin", "rabbi-hub", "shiur-builder"]) assert.notEqual(layout.default().type, "Redirect");
}
role = "local_rabbi";
for (const status of ["pending", "suspended", "left"]) {
  assert.equal(permissions.chaburahToolAccess(profile(), [{userId: "viewer", chaburahId: "own", memberRole: "rabbi", status}], "own").rabbiHub, false);
}
assert.equal(permissions.chaburahToolAccess(profile(), [], "own").admin, false);
assert.equal(permissions.chaburahToolAccess(profile(), memberships, undefined).admin, false);
assert.equal(permissions.chaburahToolAccess(null, memberships, "own").admin, false);
const adminMembership = [{userId: "viewer", chaburahId: "other", memberRole: "admin", status: "active"}];
assert.equal(permissions.chaburahToolAccess(profile(), adminMembership, "other").admin, true);
assert.equal(permissions.chaburahToolAccess(profile(), adminMembership, "other").rabbiHub, false);
const components = fs.readFileSync("src/shared/components.tsx", "utf8");
assert.ok(components.includes("show: toolAccess.admin"), "Hamburger Admin uses the same scoped permission");
assert.ok(components.includes("show: toolAccess.rabbiHub"), "Review moves to hamburger only when Rabbi Hub occupies bottom navigation");
console.log("PASS: scoped Rabbi/Admin menus on web, Android and iOS; participant-in-another-chaburah and inactive/missing memberships denied; direct routes redirected; Review restored on participant bottom bar; Global Admin unchanged.");

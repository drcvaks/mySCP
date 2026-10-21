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
const navSource = fs.readFileSync("src/shared/SidebarNavigation.tsx", "utf8");
const navAst = ts.createSourceFile("navigation.tsx", navSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const navDeclaration = navAst.statements.find(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations[0].name.getText(navAst) === "navigationItems");
const navigationItems = vm.runInNewContext(compile("(" + navDeclaration.declarationList.declarations[0].initializer.getText(navAst) + ")"));
let bottomInset = 0;
let height = 900;
const responsive = {};
vm.runInNewContext(compile(fs.readFileSync("src/shared/responsiveLayout.ts", "utf8")), { exports: responsive });
const layout = {};
const stubs = {
  "react/jsx-runtime": {jsx, jsxs: jsx},
  "@expo/vector-icons": {Ionicons: "Icon"},
  "@react-navigation/bottom-tabs": {BottomTabBar: "BottomTabBar"},
  "expo-router": {Redirect: "Redirect", Tabs: tabs, useSegments: () => ["(tabs)", route]},
  "react-native": {Platform: {get OS() {return platform;}}, StyleSheet: {create: value => value}, useWindowDimensions: () => ({width, height}), View: "View", Text: "Text", ActivityIndicator: "Loading"},
  "react-native-safe-area-context": {SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({bottom: bottomInset, left: 0, right: 0, top: 0})},
  "../../src/shared/SidebarNavigation": {navigationItems},
  "../../src/shared/permissions": permissions,
  "../../src/shared/responsiveLayout": responsive,
  "../../src/shared/components": {Button: "Button"},
  "../../src/shared/theme": {theme: {colors: {}}},
  "../../src/state/AuthState": {useAuthState: () => ({profile: profile(), session: {}, loading: false})},
  "../../src/state/AppState": {useAppState: () => ({chaburos: [], hydrated: true, memberships, selectedChaburahId: chaburah})}
};
vm.runInNewContext(compile(fs.readFileSync("app/(tabs)/_layout.tsx", "utf8")), {exports: layout, require: name => stubs[name]});
function screen(tree, name) {return tree.props.children.find(child => child.props.name === name);}
for (const [os, viewportWidth, viewportHeight = 900] of [["web",1440],["web",320],["web",390],["web",430],["web",768],["android",390],["ios",390],["android",844,390],["ios",667,375],["web",844,390]]) {
  platform = os; width = viewportWidth; height = viewportHeight;
  const compact = responsive.usesCompactNavigation(width,height);
  const landscapeRail = responsive.usesLandscapeRail(width,height);
  chaburah = "own"; role = "local_rabbi"; route = "dashboard";
  let tree = layout.default();
  assert.equal(screen(tree, "rabbi-hub").props.options.href, undefined);
  assert.equal(screen(tree, "review").props.options.href, compact ? null : undefined);
  assert.equal(tree.props.screenOptions.tabBarPosition, compact && !landscapeRail ? "bottom" : "left");
  if (landscapeRail) {
    assert.equal(tree.props.screenOptions.tabBarStyle.width,64,"Landscape uses a narrow rail rather than a bottom bar");
  }
  if (compact && !landscapeRail) {
    const icon = screen(tree, "files").props.options.tabBarIcon;
    const idle = icon({ focused: false }), active = icon({ focused: true });
    assert.equal(idle.props.children.props.name, navigationItems.files.icon);
    assert.equal(idle.props.children.props.color, navigationItems.files.color);
    assert.equal(active.props.children.props.color, "#FFFFFF");
    assert.equal(active.props.style[1].backgroundColor, "#2563EB");
    assert.equal(tree.props.screenOptions.tabBarHideOnKeyboard, true);
    bottomInset = 24;
    const insetOptions = layout.default().props.screenOptions;
    assert.equal(insetOptions.tabBarStyle.paddingBottom, 24);
    assert.equal(insetOptions.tabBarStyle.height, 92);
    bottomInset = 0;
  }
  for (const name of ["directory", "profile", "settings", "beta-feedback"]) {
    assert.equal(screen(tree,name).props.options.href, compact ? null : undefined);
  }
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

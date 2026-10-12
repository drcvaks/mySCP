const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const pace = require("../src/data/winter5787Pace.json");
const original = require("../src/data/challahImportPreview.json");
assert.deepEqual(pace.blocks, original.pace, "Retain all original text and formatting");
const shiurNumbers = pace.blocks.flatMap((block) => [...(block.text ?? "").matchAll(/Shiur #(\d+)/g)].map((match) => Number(match[1])));
assert.deepEqual(shiurNumbers, Array.from({ length: 17 }, (_, i) => i + 1));
assert.equal(pace.programId, "winter-5787");
assert.ok(pace.blocks.some((block) => block.spans.some((span) => span.bold)));
assert.ok(pace.blocks.some((block) => block.spans.some((span) => span.italic)));
assert.ok(pace.blocks.some((block) => block.spans.some((span) => span.underline)));
const stateChanges = [], moduleExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/shared/PaceReference.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
}).outputText, { exports: moduleExports, require: (name) => {
  if (name === "react") return { useState: () => [false, (value) => stateChanges.push(value)] };
  if (name === "react/jsx-runtime") return { Fragment: "Fragment", jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  if (name === "@expo/vector-icons") return { Ionicons: "Icon" };
  if (name === "react-native") return { Modal: "Modal", Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View",
    StyleSheet: { create: (value) => value }, useWindowDimensions: () => ({ height: 844 }) };
  if (name === "../data/winter5787Pace.json") return { default: pace };
  if (name === "./ImportDocument") return { ImportDocument: "Document" };
  throw new Error("Unexpected dependency: " + name);
} });
function all(tree, type) {
  if (!tree || typeof tree !== "object") return [];
  const children = tree.props?.children;
  return (tree.type === type ? [tree] : []).concat((Array.isArray(children) ? children : [children]).flatMap((child) => all(child, type)));
}
const tree = moduleExports.PaceReference();
const buttons = all(tree, "Pressable");
buttons.find((button) => button.props.accessibilityLabel === "View Zman Pace").props.onPress();
buttons.find((button) => button.props.accessibilityLabel === "Close pace").props.onPress();
assert.deepEqual(stateChanges, [true, false]);
assert.deepEqual(all(tree, "Document")[0].props.blocks, original.pace);
assert.equal(all(tree, "Modal")[0].props.visible, false);
const builder = fs.readFileSync("app/(tabs)/shiur-builder.tsx", "utf8");
assert.ok(builder.includes('selectedProgramId === WINTER_PROGRAM ? <PaceReference /> : null'));
console.log("PASS: all 17 shiurim, original rich formatting, read-only open/close, and Winter-only builder reference.");

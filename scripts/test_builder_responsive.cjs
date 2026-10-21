const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const responsive = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/shared/responsiveLayout.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, { exports: responsive });
for (const [width, height, twoColumns, compactNavigation] of [
  [320, 700, false, true], [390, 844, false, true], [430, 932, false, true],
  [667, 375, true, true], [844, 390, true, true], [932, 430, true, true],
  [768, 1024, false, false], [1024, 768, true, false], [1440, 900, true, false]
]) {
  assert.equal(responsive.shiurBuilderLayout(width, height).twoColumns, twoColumns, `${width}x${height}`);
  assert.equal(responsive.usesCompactNavigation(width, height), compactNavigation);
  if (height < 600) assert.equal(responsive.navigationRailWidth(width,height),64);
}
const builder = fs.readFileSync("app/(tabs)/shiur-builder.tsx", "utf8");
assert.ok(!builder.includes("Use the Web Version"));
assert.ok(builder.includes('testID="builder-official-pane"') && builder.includes('testID="builder-packet-pane"'));
assert.ok(builder.includes('accessibilityLabel={pane === "official" ? "Official Material" : "My Packet"}'));
assert.ok(builder.includes("nestedScrollEnabled"));
console.log("PASS: portrait pane switching, landscape/tablet columns, compact landscape navigation, no web-only builder gate.");

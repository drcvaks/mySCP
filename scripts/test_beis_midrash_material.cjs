const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,"utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, { exports, require: name => {
    if (name === "../lib/supabase") return { supabase: {} };
    throw new Error(name);
  } });
  return exports;
}
const { groupBmMaterial } = load("src/shared/beisMidrash.ts");
const { chunkDisplayCode } = load("src/shared/chunkLabels.ts");
const chunks = [
  { id:"n1", code:"HC1-A1", section:"A", program_id:"winter-5787", source_type:"notes" },
  { id:"n2", code:"HC1-A2", section:"A", program_id:"winter-5787", source_type:"notes" },
  { id:"n3", code:"HC1-B1", section:"B", program_id:"winter-5787", source_type:"notes" },
  { id:"q1", code:"HC1-Q1", section:"A", program_id:"winter-5787", source_type:"qa" },
  { id:"t1", code:"TF1-A1", section:"A", program_id:"summer-5787", source_type:"notes" }
];
const groups=groupBmMaterial(chunks);
assert.equal(groups.length,4,"Separate sections, material types and programs remain distinct");
assert.equal(groups[0].chunks.length,2);
assert.equal(groups[0].chunks[0],chunks[0],"Grouping preserves original IDs and records");
assert.equal(chunks[0].code,"HC1-A1");
assert.equal(chunkDisplayCode(chunks[0].code),"A1");
assert.equal(chunkDisplayCode("HC1-Q18"),"Q18");
assert.equal(chunkDisplayCode("95-B6"),"95-B6");
assert.equal(groupBmMaterial([]).length,0);
const workbooks=groupBmMaterial([
  {...chunks[0],workbook_title:'Challah Part 1',section_title:'Introduction to the Mitzvah of Challah'},
  {...chunks[1],workbook_title:'Challah Part 2',section_title:'A different introduction'}
]);
assert.equal(workbooks.length,2,'Sections from different workbooks must not merge');
assert.equal(workbooks[0].title,'Introduction to the Mitzvah of Challah');
console.log("PASS: material section folders, program/type separation, shortened display codes, and unchanged canonical records.");

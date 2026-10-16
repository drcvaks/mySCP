const assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript"),vm=require("node:vm");
const Papa=require("papaparse");
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/shared/reviewQuestionCsv.ts","utf8"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}
}).outputText,{exports:exportsObject,require});
const {parseReviewQuestionCsv:parse,REVIEW_CSV_TEMPLATE}=exportsObject;
const valid=Papa.parse(REVIEW_CSV_TEMPLATE,{header:true,skipEmptyLines:true}).data[0];
const read=rows=>parse(Papa.unparse(rows));
assert.equal(parse("\uFEFF"+REVIEW_CSV_TEMPLATE).errors.length,0);
const rich={...valid,prompt:'Hebrew חלה, "quotation"\nand a newline',correct_choice:"D",correct_answer:"Fourth"};
const richResult=read([rich]);
assert.equal(richResult.errors.length,0);
assert.equal(richResult.rows[0].prompt,rich.prompt);
assert.equal(richResult.rows[0].correct_choice_index,3);
for(const patch of [{week:"0"},{week:"53"},{week:"1.5"},{is_model_question:"maybe"},{question_type:"essay"},
  {correct_choice:"E"},{correct_answer:"Mismatch"},{choice_d:""},{choice_d:"First"},{prompt:""},{explanation:""},
  {difficulty:"expert"},{program_id:"summer-5786"}]) assert.ok(read([{...valid,...patch}]).errors.length,JSON.stringify(patch));
assert.ok(read([valid,valid]).errors.some(error=>error.row===3));
assert.equal(read([valid,{...valid,week:"2"}]).errors.length,0);
const tf={...valid,question_type:"true_false",choice_a:"TRUE",choice_b:"FALSE",choice_c:"",choice_d:"",correct_choice:"B",correct_answer:"FALSE"};
assert.equal(read([tf]).errors.length,0);
assert.equal(read([tf]).rows[0].choices.join(","),"True,False");
assert.ok(read([{...tf,correct_choice:"C"}]).errors.length);
assert.ok(parse(REVIEW_CSV_TEMPLATE.replace("week,section","week,week")).errors.length);
assert.ok(parse('week,"unfinished').errors.length);
assert.ok(parse(REVIEW_CSV_TEMPLATE+"1,A\n").errors.length);
assert.ok(parse("x".repeat(2097153)).errors.length);
for (const invalidText of ["\uFFFD", "\0"]) {
  const result = parse(invalidText);
  assert.equal(result.rows.length,0);
  assert.ok(result.errors[0].message.includes("CSV UTF-8 (Comma delimited)"));
}
const legacy={...valid,type:"Multiple Choice","Model Question":"y",question:valid.prompt,correct_letter:"B"};
for(const key of ["question_type","is_model_question","prompt","correct_choice"])delete legacy[key];
assert.equal(read([legacy]).errors.length,0);
const source=fs.readFileSync("Content/Hafrashas Challah Part 1/mySCP_Winter5787_Hafrashas_Challah_Part1_Question_Bank_DIVERSE_ANSWERS - fixed.csv","utf8");
const bank=parse(source);assert.equal(bank.errors.length,0);assert.equal(bank.rows.length,49);
assert.equal(bank.rows.filter(row=>row.is_model_question).length,36);
assert.ok(bank.warnings.some(text=>text.includes("True/False")));
module.exports={bank:bank.rows};
console.log("PASS: reviewed 49-row CSV, both header styles, Unicode/quotes/newlines/BOM, answer mapping, strict weeks/model/choices, duplicate and malformed/oversize rejection.");

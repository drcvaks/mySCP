const assert = require("node:assert/strict");
const fs = require("node:fs"); const ts = require("typescript"); const vm = require("node:vm");
const compile = file => ts.transpileModule(fs.readFileSync(file,"utf8"), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX
} }).outputText;
const responsive = {}; vm.runInNewContext(compile("src/shared/responsiveLayout.ts"), { exports: responsive });
const programs = {}; vm.runInNewContext(compile("src/shared/learningPrograms.ts"), { exports: programs });
const platform = { OS:"web" }; let viewport = { width:1440,height:1000 };
const question = overrides => ({ chaburahId:"own", programId:"winter-5787", week:1, publicationStatus:"published", isLibraryQuestion:false, ...overrides });
const state = { selectedChaburahId:"own", selectedProgramId:"winter-5787", currentReviewWeek:1,
  askRavQuestions:[{chaburahId:"own",status:"submitted"},{chaburahId:"own",status:"answered"},{chaburahId:"other",status:"submitted"}],
  reviewQuestions:[question({}),question({publicationStatus:"draft"}),question({week:2}),question({chaburahId:"other"}),question({programId:"summer-5787"}),question({isLibraryQuestion:true})] };
const api = {}; const jsx = (type,props) => ({type,props});
vm.runInNewContext(compile("src/shared/RabbiToolCards.tsx"), { exports:api, require:name => {
  if (name === "react/jsx-runtime") return { jsx,jsxs:jsx };
  if (name === "react-native") return { Platform:platform, View:"View", StyleSheet:{create:x=>x},useWindowDimensions:()=>viewport };
  if (name === "../state/AppState") return { useAppState:()=>state };
  if (name === "./learningPrograms") return programs;
  if (name === "./responsiveLayout") return responsive;
  if (name === "./components") return { SectionTitle:"SectionTitle" };
  if (name === "./WorkflowCard") return { WorkflowCard:"WorkflowCard" };
  throw new Error(name);
} });
for (const width of [1200,1440]) { viewport={width,height:900}; assert.equal(api.useExpandedRabbiTools(),true); }
for (const size of [{width:320,height:740},{width:1000,height:900},{width:1440,height:500}]) { viewport=size; assert.equal(api.useExpandedRabbiTools(),false); }
viewport={width:1440,height:1000};
for (const os of ["android","ios"]) {platform.OS=os;assert.equal(api.useExpandedRabbiTools(),false);}platform.OS="web";
let selected;
const props={active:"quick-review",askRavEnabled:true,beisMidrashEnabled:true,onSelect:tool=>{selected=tool;}};
const cards=api.RabbiToolCards(props).props.children[1].props.children;
assert.equal(cards.length,4);assert.ok(cards.every(card=>card.props.equalWidth));
assert.equal(cards[0].props.count,1);assert.equal(cards[0].props.countLabel,"open");
assert.equal(cards[2].props.count,1);assert.equal(cards[2].props.countLabel,"published");
assert.ok(cards[2].props.meta.includes("Week 1: 1 draft."));
cards[2].props.onPress();assert.equal(selected,undefined);
cards[3].props.onPress();assert.equal(selected,"beis-midrash");
assert.equal(api.RabbiToolCards({...props,askRavEnabled:false}).props.children[1].props.children.length,3);
assert.equal(api.RabbiToolCards({...props,localTools:false}).props.children[1].props.children.length,1);
state.selectedChaburahId=undefined;
assert.equal(api.RabbiToolCards(props).props.children[1].props.children[2].props.count,0);
console.log("PASS: wide-web cards, compact native/small layouts, current chaburah/program/week counts, and role/settings visibility.");

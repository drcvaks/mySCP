const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
function load(path, require) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,"utf8"), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}
  }).outputText, {exports,require,window:{confirm:()=>true}});
  return exports;
}
const programsApi = load("src/shared/learningPrograms.ts",()=>{throw Error("Unexpected import");});
const components = Object.fromEntries(["Button","FilterChip","FormInput","MetaText","Pill","Row"].map(key=>[key,key]));
const api = load("src/shared/ProgramSelector.tsx", name=>{
  if(name==="react")return{useEffect:()=>{},useState:value=>[value,()=>{}]};
  if(name==="react/jsx-runtime")return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  if(name==="react-native")return{Platform:{OS:"web"},View:"View",Text:"Text",Alert:{}};
  if(name==="./learningPrograms")return programsApi;
  if(name==="./components")return{...components,styles:{muted:{}}};
  if(name.includes("State"))return{};
  throw Error(name);
});
function all(tree,type){
  if(!tree||typeof tree!=="object")return[];
  const children=tree.props?.children;
  return(tree.type===type?[tree]:[]).concat((Array.isArray(children)?children:[children]).flat(Infinity).flatMap(child=>all(child,type)));
}
const winter={id:"winter-5787",name:"Winter 5787",topic:"Challah",defaultWeek:1,archived:false};
const tefillin={id:"summer-5787",name:"Summer 5787",topic:"Hilchos Tefillin",defaultWeek:1,archived:false,earlyAccess:true,allowedChaburahIds:["pilot"]};
let madeDefault=0,switched;
function render({selected=winter,stored="winter-5787",manage=true,access={chaburahId:"pilot"},disabled=false}={}){
  return api.ProgramControls({canManage:manage,access,disabled,state:{programs:[programsApi.legacySummerProgram,winter,tefillin],programsReady:true,
    selectedProgramId:selected.id,selectedProgram:selected,selectedChaburahId:access.chaburahId,
    chaburos:[{id:access.chaburahId,name:"Preview Chaburah",defaultProgramId:stored}],currentReviewWeek:1,
    selectProgram:id=>{switched=id;},updateCurrentReviewWeek:async()=>null,makeProgramDefault:async()=>{madeDefault++;return null;}}});
}
async function main(){
  const other=render({access:{chaburahId:"other"}});
  assert.deepEqual(all(other,"FilterChip").map(node=>node.props.label),["Winter 5787"]);
  const pilot=render({selected:tefillin});
  assert.deepEqual(all(pilot,"FilterChip").map(node=>node.props.label),["Winter 5787","Summer 5787"]);
  assert.ok(all(pilot,"Pill").some(node=>node.props.label==="Early Access"));
  await all(pilot,"Button").find(node=>node.props.label==="Set Summer 5787 as Chaburah Default").props.onPress();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(madeDefault,1);
  const global=render({access:{chaburahId:"other",isGlobalAdmin:true},stored:"summer-5787"});
  assert.ok(all(global,"Button").some(node=>node.props.label==="Set Winter 5787 as Chaburah Default"));
  assert.equal(all(render({manage:false,selected:tefillin}),"Button").length,0,"Participants have no default/week controls");
  assert.ok(!all(render({selected:tefillin,stored:"summer-5787"}),"Button").some(node=>node.props.label.startsWith("Set ")));
  assert.ok(all(render({stored:"summer-5786"}),"Button").some(node=>node.props.label==="Set Winter 5787 as Chaburah Default"),"Persist Winter even when hidden legacy default currently falls back to Winter");
  await all(pilot,"FilterChip")[0].props.onPress();
  assert.equal(switched,"winter-5787");
  switched=undefined;
  await all(render({disabled:true}),"FilterChip")[1].props.onPress();
  assert.equal(switched,undefined);
  console.log("PASS: role/chaburah program buttons, Early Access badge, named default actions, participant restrictions and disabled switches.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const source=fs.readFileSync("src/shared/components.tsx","utf8");
const ast=ts.createSourceFile("components.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const screen=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==="Screen").getText(ast);
let width=1440;
let rabbiHub=true;
const jsx=(type,props)=>({type,props});
const exportsObject={};
vm.runInNewContext(ts.transpileModule(screen,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{
  exports:exportsObject,require:name=>{assert.equal(name,"react/jsx-runtime");return{jsx,jsxs:jsx};},
  useRouter:()=>({navigate:()=>{}}),usePathname:()=>"/rabbi-hub",useAuthState:()=>({profile:{role:"local_rabbi"}}),
  useAppState:()=>({chaburos:[],selectedChaburahId:"pilot"}),useWindowDimensions:()=>({width}),
  chaburahToolAccess:()=>({rabbiHub,admin:rabbiHub}),
  useState:value=>[value,()=>{}],Platform:{OS:"web"},styles:{},globalStyles:{},theme:{colors:{},spacing:{xs:6}},
  SafeAreaView:"SafeAreaView",View:"View",ScrollView:"ScrollView",Pressable:"Pressable",Modal:"Modal",Text:"Text",PageHeading:"Heading",Ionicons:"Icon",
  SidebarNavigation:"Sidebar",StyleSheet:{absoluteFill:{}},
  cloneElement:(element,props)=>({type:element.type,props:{...element.props,...props}})
});
function all(tree,type){
  if(!tree||typeof tree!=="object")return[];
  const children=tree.props?.children;
  return(tree.type===type?[tree]:[]).concat((Array.isArray(children)?children:[children]).flat(Infinity).flatMap(child=>all(child,type)));
}
for(rabbiHub of [true,false]){
  const frame=exportsObject.Screen({title:"Dashboard",children:"CONTENT"});
  const items=all(frame,"Sidebar")[0].props.items.map(item=>item.name);
  for(const name of ["dashboard","chaburah","files","rabbi-hub"]){
    assert.equal(items.includes(name),false,`${name} must not duplicate the bottom tabs`);
  }
  assert.equal(items.includes("review"),rabbiHub,"Review belongs in the menu only when Rabbi Hub replaces its bottom tab");
  assert.equal(items.includes("admin"),rabbiHub);
  assert.ok(items.includes("settings")&&items.includes("beta-feedback"));
}
for(width of [1440,390]){
  const controller=exportsObject.Screen({title:"Rabbi Hub",children:"CONTENT",programSelector:{type:"Controller",props:{disabled:true}}});
  assert.equal(controller.props.disabled,true);
  const header=jsx("ProgramButtons",{}),management=jsx("WeekControls",{});
  const frame=controller.props.render({header,management});
  const heading=all(frame,"Heading")[0],scroll=all(frame,"ScrollView")[0];
  assert.equal(Boolean(heading.props.navigationButton), width < 768, "Mobile browser gets the hamburger menu, just like native phones");
  assert.equal(heading.props.accessory,header);
  assert.equal(heading.props.stackAccessory,width<1100);
  assert.equal(all(scroll,"ProgramButtons").length,0,"Program selection stays outside scrolling content");
  assert.equal(all(scroll,"WeekControls").length,1,"Week management stays in page body");
}
for(const name of ["dashboard","files","chaburah","rabbi-hub","shiur-builder","admin","review"]){
  const content=fs.readFileSync(`app/(tabs)/${name}.tsx`,"utf8");
  assert.ok(content.includes("programSelector={<ProgramSelector"),name);
  assert.ok(!content.includes("<ProgramSelector />\n"),name+" has no duplicate body selector");
}
console.log("PASS: one program controller, preserved guards, fixed header outside ScrollView, body week controls, responsive stacking and all seven program-aware screens.");

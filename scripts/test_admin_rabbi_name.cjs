const assert=require("node:assert/strict"), fs=require("node:fs"), ts=require("typescript"), vm=require("node:vm");
const source=fs.readFileSync("app/(tabs)/admin.tsx","utf8");
const ast=ts.createSourceFile("admin.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let save, hydrate;
function visit(node){
  if(ts.isFunctionDeclaration(node)&&node.name?.text==="saveChaburah")save=node.getText(ast);
  if(ts.isCallExpression(node)&&node.expression.getText(ast)==="useEffect"&&node.arguments[0]?.getText(ast).includes("setAddress(chaburah.address)"))hydrate=node.arguments[0].getText(ast);
  ts.forEachChild(node,visit);
}
visit(ast);
const compile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
async function run(name,id="my-chaburah",error=null){
  const calls=[],messages=[];let refreshed=false;
  const context={managedChaburahId:id,rabbiName:name,address:"",scheduleTime:"",scheduleDay:"Sunday",scheduleMeridiem:"PM",contactEmail:"",zoomLink:"",description:"",discussionEnabled:false,joinRequiresApproval:false,askRavEnabled:true,
    setSaving:()=>{},setMessage:value=>messages.push(value),refresh:async()=>{refreshed=true;},
    supabase:{from:table=>{assert.equal(table,"chaburos");return{update:payload=>{calls.push(payload);return{eq:async(key,value)=>{assert.equal(key,"id");assert.equal(value,id);return{error};}};}};}}};
  vm.runInNewContext(compile(save+"\nglobalThis.save=saveChaburah;"),context);
  await context.save();return{calls,messages,refreshed};
}
async function main(){
  for(const name of ["Rabbi New Name","  Rav Updated Name  ","","   "]){
    const result=await run(name);
    assert.equal(result.calls[0].rabbi_name,name.trim()||null);
    assert.equal(result.refreshed,true);
    assert.equal(result.messages.at(-1),"Chaburah settings saved.");
    assert.ok(!("role" in result.calls[0])&&!("current_chaburah_id" in result.calls[0]),"Display-name edit must not reassign roles/accounts");
  }
  assert.equal((await run("Rabbi",null)).calls.length,0);
  const failed=await run("Rabbi","my-chaburah",{message:"Denied"});
  assert.equal(failed.refreshed,false);assert.equal(failed.messages.at(-1),"Denied");
  for(const name of ["Rabbi Existing","","Rabbi not assigned"]){
    let loaded;
    const context={chaburah:{rabbiName:name,address:"",schedule:""},parseSchedule:()=>({day:"Sunday",time:"",meridiem:"PM"}),setRabbiName:value=>{loaded=value;}};
    for(const setter of ["setAddress","setScheduleDay","setScheduleTime","setScheduleMeridiem","setContactEmail","setZoomLink","setDescription","setDiscussionEnabled","setJoinRequiresApproval","setAskRavEnabled"])context[setter]=()=>{};
    vm.runInNewContext(compile(`(${hydrate})();`),context);
    assert.equal(loaded,name==="Rabbi not assigned"?"":name);
  }
  assert.ok(source.includes('<FormInput onChangeText={setRabbiName} placeholder="Rabbi name" value={rabbiName} />'));
  console.log("PASS: Rabbi display name loads existing/blank values, saves trimmed names or null to selected chaburah, refreshes on success, and does not change account roles.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});

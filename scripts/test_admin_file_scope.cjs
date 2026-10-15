const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const source=fs.readFileSync("app/(tabs)/admin.tsx","utf8");
const ast=ts.createSourceFile("admin.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let publish,localFiles;
function visit(node){
  if(ts.isFunctionDeclaration(node)&&node.name?.text==="publishFile")publish=node.getText(ast);
  if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==="localFiles")localFiles=node.getText(ast);
  ts.forEachChild(node,visit);
}
visit(ast);
const compile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
async function run({scope="chaburah",own="my-chaburah",editing=null,upload=false}={}){
  const calls=[],messages=[];
  const query={insert:value=>{calls.push(["insert",value]);return query;},update:value=>{calls.push(["update",value]);return query;},
    select:()=>query,eq:()=>query,single:async()=>({data:{id:"file"},error:null})};
  const context={profile:{id:"admin",role:"global_admin",chaburahId:own},fileChaburahId:own,managedChaburahId:"someone-elses-chaburah",
    visibility:scope,editingFile:editing,fileTitle:"A file",fileUrl:"https://example.com/file.pdf",filePublishMode:upload?"upload":"link",
    selectedFile:upload?{name:"test.pdf",mimeType:"application/pdf"}:null,fileDescription:"",fileTopic:"Tefillin",fileCoverage:"week",fileWeek:1,
    fileType:"source_sheet",programsReady:true,selectedProgramId:"summer-5787",setSaving:()=>{},setMessage:value=>messages.push(value),resetFileForm:()=>{},refresh:async()=>{},
    buildStoragePath:(scope,id,name)=>{calls.push(["path",scope,id]);return `${id}/${name}`;},readDocumentForUpload:async()=>new Uint8Array([1]),
    supabase:{from:()=>query,rpc:async()=>({error:null}),storage:{from:()=>({upload:async(path)=>{calls.push(["upload",path]);return {error:null};}})}}};
  vm.runInNewContext(compile(publish+"\nglobalThis.execute=publishFile;"),context);
  await context.execute();
  return {calls,messages};
}
async function main(){
  for(const upload of [false,true]){
    const {calls}=await run({upload});
    assert.equal(calls.find(([op])=>op==="insert")[1].chaburah_id,"my-chaburah");
    if(upload)assert.equal(calls.find(([op])=>op==="path")[2],"my-chaburah");
  }
  const publicResult=await run({scope:"everyone",own:undefined});
  assert.equal(publicResult.calls.find(([op])=>op==="insert")[1].chaburah_id,null);
  const missing=await run({own:null});
  assert.equal(missing.calls.length,0);
  assert.ok(missing.messages[0].includes("Join a chaburah"));
  for(const scope of ["everyone","chaburah"]){
    const blocked=await run({scope,editing:{id:"other-file",visibility:"chaburah",chaburahId:"someone-elses-chaburah"}});
    assert.equal(blocked.calls.length,0,"Do not silently move another chaburah's existing file");
  }
  const ownEdit=await run({editing:{id:"own-file",visibility:"chaburah",chaburahId:"my-chaburah"}});
  assert.equal(ownEdit.calls.find(([op])=>op==="update")[1].chaburah_id,"my-chaburah");
  const context={fileChaburahId:"my-chaburah",managedChaburahId:"someone-elses-chaburah",learningFiles:[
    {id:"public",visibility:"everyone"},{id:"mine",visibility:"chaburah",chaburahId:"my-chaburah"},
    {id:"other",visibility:"chaburah",chaburahId:"someone-elses-chaburah"}]};
  vm.runInNewContext(compile(`const ${localFiles}; globalThis.result=localFiles;`),context);
  assert.deepEqual(Array.from(context.result,row=>row.id),["public","mine"]);
  assert.ok(source.includes('label="My Chaburah"'));
  assert.ok(source.includes('const fileChaburahId = profile?.chaburahId;'));
  assert.ok(source.includes('const managedChaburahId = isGlobalAdmin ? adminChaburahId : profile?.chaburahId;'));
  console.log("PASS: own-chaburah upload/link publishing and edits, public scope, missing-membership guard, cross-chaburah edit protection, and own/public file list; other admin management remains separate.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});

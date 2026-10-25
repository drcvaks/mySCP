const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
async function main() {
  const events=[];
  const platform={OS:'web'};
  let asset, failUpload=false, failSign=false, tab;
  const resource={id:'resource',storage_path:'owner/resource',file_name:'Notes.pdf',mime_type:'application/pdf',byte_size:3};
  const client={
    rpc:async(name,args)=>{
      events.push([name,args]);
      return {data:name==='bm_prepare_resource'?resource:null,error:null};
    },
    storage:{from:bucket=>{
      assert.equal(bucket,'bm-resources');
      return {
        upload:async(path,bytes,options)=>{
          events.push(['upload',path,bytes.byteLength,options]);
          return {error:failUpload?new Error('Upload failed'):null};
        },
        remove:async(paths)=>{events.push(['remove',paths]);return {error:null};},
        createSignedUrl:async(path,seconds,options)=>{
          events.push(['sign',path,seconds,options]);
          assert.ok(tab,'Web download reserves its tab synchronously');
          return {data:{signedUrl:'https://synthetic.invalid/file'},error:failSign?new Error('Access denied'):null};
        }
      };
    }}
  };
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/shared/beisMidrashResources.ts','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
  }).outputText,{
    exports,Uint8Array,
    window:{open:()=>{tab={opener:{},location:{replace:url=>events.push(['navigate',url])},close:()=>events.push(['close'])};events.push(['open']);return tab;}},
    require:name=>{
      if(name==='expo-document-picker')return {getDocumentAsync:async()=>asset?{canceled:false,assets:[asset]}:{canceled:true}};
      if(name==='expo-file-system')return {File:class{constructor(uri){assert.equal(uri,'file:///test.pdf');}async arrayBuffer(){return new Uint8Array([1,2,3]).buffer;}}};
      if(name==='react-native')return {Platform:platform,Linking:{openURL:async url=>events.push(['native',url])}};
      if(name==='../lib/supabase')return {supabase:client};
      throw new Error(name);
    }
  });
  assert.equal(await exports.pickBmResource(),null);
  asset={name:'Notes.pdf',size:3,file:{arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}};
  assert.equal(await exports.pickBmResource(),resource);
  assert.equal(events.find(e=>e[0]==='upload')[3].upsert,false);
  events.length=0;
  failUpload=true;
  await assert.rejects(()=>exports.pickBmResource(),/Upload failed/);
  assert.deepEqual(events.map(e=>e[0]),['bm_prepare_resource','upload','remove','bm_discard_resource']);
  failUpload=false;
  asset={name:'evil.exe',size:3};await assert.rejects(()=>exports.pickBmResource(),/Choose a PDF/);
  asset={name:'Big.pdf',size:10485761};await assert.rejects(()=>exports.pickBmResource(),/10 MB/);
  platform.OS='android';asset={name:'Native.pdf',uri:'file:///test.pdf',size:3};
  assert.equal(await exports.pickBmResource(),resource,'Native upload uses ArrayBuffer, not unsupported FormData/Blob');
  platform.OS='web';events.length=0;
  await exports.openBmResource(resource);
  assert.deepEqual(events.map(e=>e[0]),['open','sign','navigate']);
  assert.equal(tab.opener,null);
  assert.equal(events[1][2],60);assert.equal(events[1][3].download,'Notes.pdf');
  events.length=0;failSign=true;
  await assert.rejects(()=>exports.openBmResource(resource),/Access denied/);
  assert.equal(events.at(-1)[0],'close','Failed downloads close their blank tab');
  console.log('PASS: file validation, web/native ArrayBuffer uploads, failed-upload cleanup, immutable uploads, synchronous safe download tabs and short-lived signed URLs.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});

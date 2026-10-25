const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {createDatabase,id}=require('./test_beis_midrash_sql.cjs');
async function main() {
  const events=[]; const platform={OS:'web'}; const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/shared/beisMidrashLinks.ts','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
  }).outputText,{exports,URL,window:{open:(...args)=>events.push(args)},require:name=>{
    assert.equal(name,'react-native');return {Platform:platform,Linking:{openURL:async url=>events.push(['native',url])}};
  }});
  const {normalizeBmResourceUrl:normalize,bmResourceLinkError:linkError,openBmResourceLink:open}=exports;
  assert.equal(normalize('  HTTPS://Example.COM/path?q=1#source  '),'https://example.com/path?q=1#source');
  assert.equal(normalize('http://example.com'),'http://example.com/');
  assert.equal(normalize('https://[::1]:8080/path'),'https://[::1]:8080/path');
  assert.equal(normalize('https://\u05d3\u05d5\u05d2\u05de\u05d4.com/path').startsWith('https://xn--'),true);
  assert.equal(normalize(''),null);
  const bad=['javascript:alert(1)','data:text/html,hi','file:///test','mailto:test@example.com','//example.com',
    'https://','https://user:pass@example.com','https://user@example.com','https://example.com\n/path',
    'https://example.com\\@evil.com','https://example.com/a b','https://example.com:99999','https://example.com/'+ 'x'.repeat(2048)];
  for(const value of bad) assert.throws(()=>normalize(value),/valid http/);
  assert.equal(linkError('',''), '');assert.match(linkError('','A name'),/Enter a resource link/);
  await open('https://example.com/path');
  assert.deepEqual(events[0],['https://example.com/path','_blank','noopener,noreferrer']);
  platform.OS='ios'; await open('http://example.com');assert.deepEqual(events[1],['native','http://example.com/']);
  await assert.rejects(()=>open('javascript:alert(1)'),/valid http/);assert.equal(events.length,2);

  const db=await createDatabase(false);
  const user=n=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);
  const mutate=async(action,target=null,payload={})=>(await db.query('select bm_mutate($1,$2,$3) v',[action,target,JSON.stringify(payload)])).rows[0].v;
  const payload=extra=>({title:'An external resource',body:'A resource for Rabbonim.',category:'resources',program_id:'winter-5787',chunk_ids:[],resource_ids:[],...extra});
  const get=async tid=>(await db.query('select bm_get_thread($1) v',[tid])).rows[0].v;
  try {
    await db.exec('reset role');
    for(const name of ['202610230001_beis_midrash_boards.sql','202610240001_beis_midrash_resources.sql']) await db.exec(fs.readFileSync('supabase/migrations/'+name,'utf8'));
    await db.exec('set role authenticated');await user(2);
    const existing=(await mutate('create_thread',null,payload())).id;
    await db.exec('reset role');await db.exec(fs.readFileSync('supabase/migrations/202610250001_beis_midrash_resource_links.sql','utf8'));await db.exec('set role authenticated');
    assert.equal((await get(existing)).thread.resource_url,null,'Upgrade preserves existing discussions');
    for(const resource_url of bad) await assert.rejects(()=>mutate('create_thread',null,payload({resource_url})),/bm_resource_url_check/);
    await assert.rejects(()=>mutate('create_thread',null,payload({resource_label:'Name without URL'})),/bm_resource_label_check/);
    await assert.rejects(()=>mutate('create_thread',null,payload({resource_url:'https://example.com',resource_label:'x'.repeat(161)})),/bm_resource_label_check/);
    await assert.rejects(()=>mutate('create_thread',null,payload({category:'torah',resource_url:'https://example.com'})),/bm_resource_url_check/);
    for(const url of ['http://example.com/','https://example.com/path?q=1#source','https://[::1]:8080/path']) {
      const tid=(await mutate('create_thread',null,payload({resource_url:url,resource_label:'A useful resource'}))).id;
      assert.equal((await get(tid)).thread.resource_url,url);
    }
    const tid=(await mutate('create_thread',null,payload({resource_url:'https://example.com/initial',resource_label:'Initial label'}))).id;
    await mutate('edit_thread',tid,payload({title:'Updated from an older client'}));
    assert.equal((await get(tid)).thread.resource_url,'https://example.com/initial','Older clients do not silently erase links');
    await user(3);
    assert.equal((await get(tid)).thread.resource_label,'Initial label','Approved peer can read resource link');
    await assert.rejects(()=>mutate('edit_thread',tid,payload({resource_url:'https://example.com/stolen'})),/Only the author/);
    for(const n of [null,4,5,7,8]) {await user(n);await assert.rejects(()=>get(tid),/access denied/);assert.equal((await db.query('select * from bm_threads')).rows.length,0);}
    await user(1);await mutate('hide_thread',tid);
    await user(3);await assert.rejects(()=>get(tid),/access denied/);
    await user(1);await mutate('restore_thread',tid);
    const pilot=(await mutate('create_thread',null,payload({resource_url:'https://example.com/pilot',program_id:'summer-5787'}))).id;
    await user(2);await assert.rejects(()=>get(pilot),/access denied/);
    await mutate('edit_thread',tid,payload({resource_url:'http://example.com/revised',resource_label:null}));
    assert.equal((await get(tid)).thread.resource_url,'http://example.com/revised');
    await mutate('edit_thread',tid,payload({resource_url:null,resource_label:null,category:'torah'}));
    assert.equal((await get(tid)).thread.resource_url,null,'Removing link permits moving discussion');
    console.log('PASS: safe HTTP(S) links, normalization, native/web opening, upgrade preservation, DB checks, author-only editing/removal, participant and pilot privacy.');
  } finally {await db.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

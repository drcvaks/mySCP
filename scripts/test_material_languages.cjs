const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {PGlite}=require(path.resolve('tmp/review-results-tests/node_modules/@electric-sql/pglite'));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const english=JSON.parse(fs.readFileSync('tmp/shiur-import-preview/challah-part1/import/payload.json','utf8')).chunks;
const hebrew=JSON.parse(fs.readFileSync('tmp/shiur-import-preview/challah-hebrew-part1/import/payload.json','utf8'));
function load(file,dependencies={}) {
  const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,
    {exports,require:name=>{if(name in dependencies)return dependencies[name];throw new Error(name);}});return exports;
}
const documents=load('src/shared/documentContent.ts');
const api=load('src/shared/materialLanguages.ts',{'../lib/supabase':{supabase:{}},'./documentContent':documents});
const canonical=english.map((c,index)=>({id:id(index+1),chunkCode:c.chunk_code,sourceType:c.source_type,workbookTitle:c.workbook_title,
  sectionKey:c.section_key,sectionTitle:c.section_title,chunkTitle:c.chunk_title,contentMarkdown:c.content_markdown,contentDocument:c.content_document,language:'en'}));
const translations=hebrew.map(t=>({...t,chunk_id:canonical.find(c=>c.chunkCode===t.chunk_code).id}));
const before=JSON.stringify(canonical);
const he=api.applyMaterialLanguage(canonical,translations,'he');
assert.equal(he.length,105);assert.equal(he.filter(c=>c.sourceType==='notes').length,32);
assert.equal(he.filter(c=>c.sourceType==='qa').length,16);assert.equal(he.filter(c=>c.sourceType==='source').length,57);
assert.equal(he.reduce((sum,c)=>sum+(c.sourceType==='notes'?c.contentDocument.footnotes.length:0),0),27);
assert.ok(!he.some(c=>c.chunkCode==='HC1-F1'));
assert.equal(he.find(c=>c.chunkCode==='HC1-S1').contentDocument,canonical.find(c=>c.chunkCode==='HC1-S1').contentDocument,'Source images are reused');
assert.equal(he.find(c=>c.chunkCode==='HC1-A1').id,canonical.find(c=>c.chunkCode==='HC1-A1').id);
assert.equal(JSON.stringify(canonical),before,'English objects are not mutated');
assert.throws(()=>api.applyMaterialLanguage(canonical,translations,'he',true),/English has not been substituted/);
assert.equal(api.applyMaterialLanguage(canonical,translations,'en').length,123);
assert.equal(he.find(c=>c.chunkCode==='HC1-A1').contentDocument.language,'he');

async function main(){
  const db=new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,private to authenticated;
      create table content_chunks(id uuid primary key,chunk_code text unique,program_id text,source_type text,workbook_title text,
        chunk_title text,content_document jsonb,content_markdown text);
      create table review_packets(id uuid primary key,owner_id uuid,chaburah_id uuid,title text,status text);
      create table review_packet_items(packet_id uuid references review_packets(id),chunk_id uuid references content_chunks(id),sort_order integer);
      create table learning_files(id uuid primary key,review_packet_id uuid references review_packets(id),title text);
      insert into review_packets values('${id(500)}','${id(700)}','${id(900)}','Original English draft','draft');
      insert into learning_files values('${id(600)}','${id(500)}','Original English file');
      alter table content_chunks enable row level security;
      create policy chunks_read on content_chunks for select to authenticated using (program_id='winter-5787');
      alter table review_packets enable row level security;
      create policy packets_read on review_packets for select to authenticated using (owner_id=auth.uid() or (status='published' and chaburah_id='${id(900)}'));
      create policy packets_write on review_packets for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
      alter table review_packet_items enable row level security;
      create policy items_read on review_packet_items for select to authenticated using(exists(select 1 from review_packets p where p.id=packet_id));
      create policy items_write on review_packet_items for all to authenticated using(exists(select 1 from review_packets p where p.id=packet_id and p.owner_id=auth.uid())) with check(exists(select 1 from review_packets p where p.id=packet_id and p.owner_id=auth.uid()));
      alter table learning_files enable row level security;
      create policy files_read on learning_files for select to authenticated using(exists(select 1 from review_packets p where p.id=review_packet_id));
      grant select on content_chunks to authenticated;grant select,insert,update on review_packets,review_packet_items,learning_files to authenticated;
    `);
    for(const [index,c] of english.entries())await db.query('insert into content_chunks values($1,$2,$3,$4,$5,$6,$7,$8)',[id(index+1),c.chunk_code,c.program_id,c.source_type,c.workbook_title,c.chunk_title,c.content_document,c.content_markdown]);
    await db.query("insert into content_chunks values($1,'95-B1','summer-5786','notes','Nat Bar Nat','Original Summer',null,'Original Summer text')",[id(9999)]);
    const snapshot=async()=>JSON.stringify((await db.query('select * from content_chunks order by id')).rows);
    await db.exec(fs.readFileSync('supabase/migrations/202610250002_material_languages.sql','utf8'));
    const unchanged=await snapshot();
    assert.equal((await db.query("select count(*)::int n from content_chunks where language='en'")).rows[0].n,124);
    assert.equal((await db.query('select language from review_packets where id=$1',[id(500)])).rows[0].language,'en');
    assert.equal((await db.query('select language from learning_files where id=$1',[id(600)])).rows[0].language,'en');
    const sql=fs.readFileSync('supabase/imports/202610250003_challah_hebrew_part1.sql','utf8');
    await db.exec(sql);await db.exec(sql);
    assert.equal(await snapshot(),unchanged,'Import and rerun preserve English, IDs, and images exactly');
    assert.equal((await db.query('select count(*)::int n from content_chunk_translations')).rows[0].n,48);
    await assert.rejects(()=>db.query("update content_chunk_translations set content_document='{}'::jsonb"),/check constraint/);
    assert.equal((await db.query("select sum(jsonb_array_length(content_document->'footnotes'))::int n from content_chunk_translations")).rows[0].n,27);
    await assert.rejects(()=>db.query("update content_chunks set language='he' where chunk_code='HC1-A1'"),/check constraint/);
    await assert.rejects(()=>db.query("update review_packets set language='he' where id=$1",[id(500)]),/language cannot be changed/);
    await db.query("insert into review_packets values($1,$2,$3,'Hebrew packet','draft','he')",[id(501),id(700),id(900)]);
    const chunkId=code=>canonical.find(c=>c.chunkCode===code).id;
    await db.query('insert into review_packet_items values($1,$2,1)',[id(501),chunkId('HC1-A1')]);
    await db.query('insert into review_packet_items values($1,$2,2)',[id(501),chunkId('HC1-S1')]);
    await assert.rejects(()=>db.query('insert into review_packet_items values($1,$2,3)',[id(501),chunkId('HC1-F1')]),/Hebrew text is not available/);
    await db.query("insert into learning_files values($1,$2,'Hebrew file','en')",[id(601),id(501)]);
    assert.equal((await db.query('select language from learning_files where id=$1',[id(601)])).rows[0].language,'he','Published Files metadata follows packet language');
    await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(700)]);
    assert.equal((await db.query('select * from content_chunk_translations')).rows.length,0,'Old clients cannot read Hebrew translations');
    assert.equal((await db.query('select * from review_packets where id=$1',[id(501)])).rows.length,0,'Old client cannot misrender Hebrew packet as English');
    assert.equal((await db.query('select * from learning_files where id=$1',[id(601)])).rows.length,0);
    await db.query("select set_config('request.headers',$1,false)",[JSON.stringify({'x-myscp-material-languages':'1'})]);
    assert.equal((await db.query('select * from content_chunk_translations')).rows.length,48);
    assert.equal((await db.query('select * from review_packets where id=$1',[id(501)])).rows.length,1);
    await assert.rejects(()=>db.query('delete from content_chunk_translations'),/permission denied/);
    await assert.rejects(()=>db.query("update review_packets set language='en' where id=$1",[id(501)]),/language cannot be changed/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(701)]);
    assert.equal((await db.query('select * from review_packets where id=$1',[id(501)])).rows.length,0,'Other member cannot read another Rav draft');
    console.log('PASS: 123 English canonical rows preserved, 48 Hebrew translations, 27 footnotes, shared sources, immutable packet languages, missing-translation rejection, old-client safety, language-scoped rendering and RLS.');
  }finally{await db.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

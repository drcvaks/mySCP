const assert = require('node:assert/strict');
const { createDatabase, id } = require('./test_beis_midrash_sql.cjs');
async function main() {
  const db = await createDatabase();
  const user = n => db.query("select set_config('request.jwt.claim.sub',$1,false)", [n ? id(n) : '']);
  const mutate = async (action, target = null, payload = {}) => (await db.query('select bm_mutate($1,$2,$3) v',[action,target,JSON.stringify(payload)])).rows[0].v;
  const prepare = async (name='Worksheet.pdf',mime='application/pdf',size=100) => (await db.query('select bm_prepare_resource($1,$2,$3) v',[name,mime,size])).rows[0].v;
  const payload = extra => ({title:'Shared material',body:'A private worksheet for Rabbonim.',category:'resources',program_id:'winter-5787',chunk_ids:[],...extra});
  const upload = r => db.query("insert into storage.objects(bucket_id,name,metadata) values('bm-resources',$1,$2)",[r.storage_path,JSON.stringify({size:r.byte_size,mimetype:r.mime_type})]);
  const visible = async r => (await db.query("select * from storage.objects where name=$1",[r.storage_path])).rows.length;
  try {
    for(const n of [null,4,5,7,8]) { await user(n); await assert.rejects(()=>prepare(),/Rabbi access required|permission denied/); }
    await user(2);
    for(const category of ['notes','questions']) await assert.rejects(()=>mutate('create_thread',null,payload({category})),/Link at least one official/);
    await assert.rejects(()=>prepare('evil.html','text/html'),/Choose a PDF/);
    await assert.rejects(()=>prepare('fake.exe'),/Choose a PDF/);
    await assert.rejects(()=>prepare('../test.pdf'),/check constraint/);
    await assert.rejects(()=>prepare('large.pdf','application/pdf',10485761),/check constraint/);
    const r=await prepare();
    await assert.rejects(()=>mutate('create_thread',null,payload({resource_ids:Array.from({length:6},(_,i)=>id(100+i))})),/up to five files/);
    await assert.rejects(()=>mutate('create_thread',null,payload({resource_ids:[r.id]})),/attachment is missing/);
    await upload(r);
    await assert.rejects(()=>upload(r),/duplicate key/);
    await assert.rejects(()=>db.query("insert into storage.objects(bucket_id,name) values('bm-resources','forged')"),/row-level security/);
    await user(3); assert.equal(await visible(r),0,'Unpublished files are private to uploader');
    await assert.rejects(()=>mutate('create_thread',null,payload({resource_ids:[r.id]})),/attachment is missing/);
    await user(2);
    const wrongSize=await prepare('Mismatch.pdf');
    await db.query("insert into storage.objects(bucket_id,name,metadata) values('bm-resources',$1,$2)",[wrongSize.storage_path,JSON.stringify({size:99,mimetype:'application/pdf'})]);
    await assert.rejects(()=>mutate('create_thread',null,payload({resource_ids:[wrongSize.id]})),/attachment is missing/);
    await assert.rejects(()=>db.query("insert into bm_resources(owner_id,file_name,mime_type,byte_size,storage_path) values($1,'x.pdf','application/pdf',1,'x')",[id(2)]),/permission denied/);
    await assert.rejects(()=>mutate('create_thread',null,payload({category:'torah',resource_ids:[r.id]})),/Resources & Materials only/);
    const tid=(await mutate('create_thread',null,payload({resource_ids:[r.id]}))).id;
    await assert.rejects(()=>mutate('create_thread',null,payload({resource_ids:[r.id]})),/attachment is missing/);
    await user(3); assert.equal(await visible(r),1,'Another approved Rav can download published resource');
    const detail=(await db.query('select bm_get_thread($1) v',[tid])).rows[0].v;
    assert.equal(detail.resources[0].file_name,'Worksheet.pdf');
    for(const n of [null,4,5,7,8]) { await user(n); assert.equal(await visible(r),0); }
    await user(1); await mutate('hide_thread',tid);
    await user(2); assert.equal(await visible(r),0,'Hidden resource is inaccessible even to owner');
    await user(1); await mutate('restore_thread',tid);
    await user(2);
    // Existing resources remain readable when edits fail; detaching is transactional.
    await assert.rejects(()=>mutate('edit_thread',tid,payload({category:'notes',resource_ids:[r.id]})),/Link at least/);
    assert.equal(await visible(r),1);
    await mutate('edit_thread',tid,payload({resource_ids:[]}));
    await user(3); assert.equal(await visible(r),0,'Removed attachments stop being shared');
    await user(2); await db.query("delete from storage.objects where bucket_id='bm-resources' and name=$1",[r.storage_path]);
    await db.query('select bm_discard_resource($1)',[r.id]);
    assert.equal((await db.query('select * from bm_resources where id=$1',[r.id])).rows.length,0);
    await user(1);
    const pilot=await prepare('Pilot.pdf'); await upload(pilot);
    const pilotId=(await mutate('create_thread',null,payload({program_id:'summer-5787',resource_ids:[pilot.id]}))).id;
    await user(2); assert.equal(await visible(pilot),0,'Pilot materials remain restricted');
    await user(6); assert.equal(await visible(pilot),1);
    await user(1); await mutate('delete_thread',pilotId);
    await user(6); assert.equal(await visible(pilot),0,'Deleted discussion revokes new downloads');
    await user(2);
    const material=(await db.query("select bm_find_material('Obligation','winter-5787','notes') v")).rows[0].v;
    assert.equal(material[0].section_title,'The Obligation of Challah');
    assert.equal(material[0].code,'HC1-B3');
    console.log('PASS: mandatory official links, named sections, upload validation, immutable private files, owner checks, participant denial, pilot privacy, hide/delete/removal revocation.');
  } finally { await db.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});

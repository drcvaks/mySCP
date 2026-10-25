const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require(path.resolve("tmp/review-results-tests/node_modules/@electric-sql/pglite"));
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function createDatabase(withBoards = true) {
  const db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create schema auth; create schema private;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated,anon;
      grant select,insert,delete on storage.objects to authenticated;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
      create table public.profiles(id uuid primary key,full_name text,role text,email text);
      create table public.chaburah_members(user_id uuid,status text,member_role text);
      create table public.learning_programs(id text primary key);
      create table public.content_chunks(id uuid primary key,chunk_code text,chunk_title text,section_key text,program_id text,
        source_type text,sort_order integer);
      insert into public.learning_programs values ('winter-5787'),('summer-5787');
      insert into public.profiles values
        ('${id(1)}','Global','global_admin','private-global@example.invalid'),
        ('${id(2)}','Rav One','local_rabbi','private-one@example.invalid'),
        ('${id(3)}','Rav Two','local_rabbi','private-two@example.invalid'),
        ('${id(4)}','Participant','participant','private-p@example.invalid'),
        ('${id(5)}','Local Admin','local_admin','private-a@example.invalid'),
        ('${id(6)}','Pilot Rav','local_rabbi','private-pilot@example.invalid'),
        ('${id(7)}','Suspended','local_rabbi','private-s@example.invalid'),
        ('${id(8)}','Unapproved','participant','private-u@example.invalid');
      insert into public.chaburah_members values
        ('${id(2)}','active','rabbi'),('${id(3)}','active','rabbi'),('${id(4)}','active','participant'),
        ('${id(5)}','active','admin'),('${id(6)}','active','rabbi'),('${id(7)}','suspended','rabbi'),('${id(8)}','active','rabbi');
      insert into public.content_chunks values
        ('${id(20)}','HC1-B3','Notes B3','B','winter-5787','notes',1),
        ('${id(21)}','HC1-B4','Notes B4','B','winter-5787','notes',2),
        ('${id(22)}','TF1-A1','Restricted Notes','A','summer-5787','notes',1),
        ('${id(23)}','HC1-Q1','Question','Q','winter-5787','qa',3);
      alter table public.content_chunks add column section_title text default '';
      alter table public.content_chunks add column workbook_title text default '';
      update public.content_chunks set section_title=case when section_key='B' then 'The Obligation of Challah' when section_key='Q' then 'Review Questions' else 'Introduction' end;
      create function private.is_global_admin() returns boolean language sql stable security definer set search_path='' as $$
        select exists(select 1 from public.profiles where id=auth.uid() and role='global_admin'); $$;
      create function private.can_access_learning_program(pid text, cid uuid default null) returns boolean language sql stable security definer set search_path='' as $$
        select pid='winter-5787' or (pid='summer-5787' and (auth.uid()='${id(6)}' or private.is_global_admin())); $$;
      grant usage on schema public,auth,private to authenticated,anon;
    `);
    await db.exec(fs.readFileSync("supabase/migrations/202610220001_worldwide_beis_midrash.sql", "utf8"));
    if (withBoards) await db.exec(fs.readFileSync("supabase/migrations/202610230001_beis_midrash_boards.sql", "utf8"));
    if (withBoards) await db.exec(fs.readFileSync("supabase/migrations/202610240001_beis_midrash_resources.sql", "utf8"));
    if (withBoards) await db.exec(fs.readFileSync("supabase/migrations/202610250001_beis_midrash_resource_links.sql", "utf8"));
    await db.exec("set role authenticated");
    return db;
}
async function main() {
  const db = await createDatabase();
  try {
    const user = n => db.query("select set_config('request.jwt.claim.sub',$1,false)", [n ? id(n) : ""]);
    const mutate = async (action,target=null,payload={}) => (await db.query("select public.bm_mutate($1,$2::uuid,$3::jsonb) as v",[action,target,JSON.stringify(payload)])).rows[0].v;
    const list = async (filters={}) => (await db.query("select public.bm_list_threads($1::jsonb) as v",[JSON.stringify(filters)])).rows[0].v;
    const get = async (tid,offset=0) => (await db.query("select public.bm_get_thread($1::uuid,$2::integer) as v",[tid,offset])).rows[0].v;
    const threadPayload = (extra={}) => ({title:"Question about sources",body:"First discussion body",category:"torah",program_id:"winter-5787",chunk_ids:[id(20),id(21)],...extra});
    for(const n of [null,4,5,7,8]) {
      await user(n);
      await assert.rejects(()=>list(),/Rabbi access required/);
      await assert.rejects(()=>mutate("create_thread",null,threadPayload()),/Rabbi access required/);
      assert.equal((await db.query("select * from public.bm_threads")).rows.length,0);
      await assert.rejects(()=>db.query("select public.bm_find_chunks()"),/Rabbi access required/);
    }
    await user(2);
    await assert.rejects(()=>db.query("insert into public.bm_threads(author_id,title,body,category) values($1,'X','Y','general')",[id(2)]),/permission denied/);
    const first=(await mutate("create_thread",null,threadPayload({author_id:id(4),is_hidden:true,status:"answered",official:true}))).id;
    let detail=await get(first);
    assert.equal(detail.thread.author_id,id(2)); assert.equal(detail.thread.status,"open"); assert.equal(detail.thread.is_hidden,false);
    assert.equal(detail.chunks.length,2); assert.equal(detail.following,true);
    assert.ok(!JSON.stringify(detail).includes("private-one@example.invalid"),"Safe author names do not expose profiles");
    const second=(await mutate("create_thread",null,threadPayload({title:"Different discussion",chunk_ids:[]}))).id;
    await assert.rejects(()=>mutate("create_thread",null,threadPayload({program_id:"summer-5787",chunk_ids:[]})),/Program access denied/);
    await assert.rejects(()=>mutate("create_thread",null,threadPayload({chunk_ids:[id(22)]})),/inaccessible material/);
    await assert.rejects(()=>mutate("create_thread",null,threadPayload({category:"notes",chunk_ids:[id(23)]})),/inaccessible material/);
    await assert.rejects(()=>mutate("create_thread",null,threadPayload({title:"",chunk_ids:[]})),/check constraint/);
    await user(3);
    const reply=(await mutate("reply",first,{body:"A unique searchable explanation"})).id;
    await assert.rejects(()=>mutate("edit_thread",first,threadPayload()),/Only the author/);
    await assert.rejects(()=>mutate("status",first,{status:"answered"}),/Author or moderator/);
    await assert.rejects(()=>mutate("hide_thread",first),/Moderator/);
    await assert.rejects(()=>db.query("update public.bm_threads set is_hidden=true where id=$1",[first]),/permission denied/);
    const ownReply=(await mutate("reply",first,{body:"Reply to a reply",parent_reply_id:reply})).id;
    await assert.rejects(()=>mutate("reply",first,{body:"Too deep",parent_reply_id:ownReply}),/top-level reply/);
    await assert.rejects(()=>mutate("reply",second,{body:"Cross-thread",parent_reply_id:reply}),/top-level reply/);
    await mutate("edit_reply",reply,{body:"Updated unique searchable explanation",is_hidden:true});
    await mutate("bookmark",first,{enabled:true});
    assert.equal((await list({saved:"bookmarked"})).items.length,1);
    assert.equal((await list({search:"searchable"})).items.length,1,"Search includes replies");
    assert.equal((await list({section:"B"})).items.length,1);
    assert.equal((await list({chunk:id(20)})).items.length,1);
    await mutate("report",first,{reply_id:reply,reason:"Please review this source"});
    assert.equal((await db.query("select * from public.bm_reports")).rows.length,1);
    await assert.rejects(()=>db.query("select public.bm_list_reports()"),/Moderator/);
    await user(2);
    assert.equal((await list({saved:"unread"})).items.length,1,"New replies appear as unread to the follower");
    await get(first);
    assert.equal((await list({saved:"unread"})).items.length,0);
    assert.equal((await db.query("select * from public.bm_reports")).rows.length,0,"Reports are not public to other Rabbonim");
    await assert.rejects(()=>mutate("edit_reply",reply,{body:"Not mine"}),/Only the author/);
    await mutate("status",first,{status:"answered"});
    assert.equal((await list({status:"answered"})).items.length,1);
    await assert.rejects(()=>mutate("status",first,{status:"official"}),/Invalid discussion status/);
    await user(6);
    const pilot=(await mutate("create_thread",null,threadPayload({program_id:"summer-5787",chunk_ids:[id(22)],title:"Pilot private question"}))).id;
    const generalPilot=(await mutate("create_thread",null,threadPayload({program_id:null,chunk_ids:[id(22)],title:"General with private source"}))).id;
    await user(2);
    assert.ok(!(await list({program:"all"})).items.some(t=>[pilot,generalPilot].includes(t.id)),"General topics cannot bypass linked-chunk privacy");
    await assert.rejects(()=>get(pilot),/access denied/);
    await assert.rejects(()=>mutate("follow",pilot),/access denied/);
    assert.equal((await db.query("select * from public.bm_thread_chunks where thread_id=$1",[generalPilot])).rows.length,0);
    const found=(await db.query("select public.bm_find_chunks('','summer-5787') as v")).rows[0].v;
    assert.equal(found.length,0);
    await user(1);
    assert.equal((await list()).items.length,4);
    await mutate("hide_reply",reply);
    await mutate("hide_thread",second);
    assert.ok((await db.query("select * from public.bm_moderation_log")).rows.length>=2);
    const reports=(await db.query("select public.bm_list_reports() as v")).rows[0].v;
    assert.equal(reports.length,1); await mutate("review_report",reports[0].id);
    assert.equal((await db.query("select public.bm_list_reports() as v")).rows[0].v.length,0);
    await user(2);
    assert.equal((await list({search:"unique searchable"})).items.length,0,"Hidden replies do not leak through search");
    assert.equal((await db.query("select * from public.bm_replies where id=$1",[reply])).rows.length,0);
    assert.equal((await db.query("select * from public.bm_moderation_log")).rows.length,0);
    await assert.rejects(()=>get(second),/access denied/);
    await user(1); await mutate("restore_thread",second); await mutate("restore_reply",reply);
    await user(2); await mutate("delete_thread",second);
    await assert.rejects(()=>get(second),/access denied/);
    await user(3); await mutate("delete_reply",reply);
    assert.equal((await get(first)).replies.length,1,"Child response survives soft removal of its parent");
    await user(2); await mutate("status",first,{status:"archived"});
    await assert.rejects(()=>mutate("reply",first,{body:"Closed"}),/closed/);
    await user(6);
    let burstThread;
    for (let n=0;n<28;n++) burstThread=(await mutate("create_thread",null,threadPayload({title:`Pagination ${n}`,chunk_ids:[]}))).id;
    await assert.rejects(()=>mutate("create_thread",null,threadPayload()),/Please wait/);
    await user(1);
    const firstPage=await list({program:"winter-5787"}); const nextPage=await list({program:"winter-5787",offset:25});
    assert.equal(firstPage.items.length,25); assert.ok(nextPage.items.length>0);
    assert.ok(!firstPage.items.some(t=>nextPage.items.some(other=>other.id===t.id)),"Pagination is deterministic and non-overlapping");
    await user(3);
    for (let n=0;n<8;n++) await mutate("reply",burstThread,{body:`Burst ${n}`});
    await assert.rejects(()=>mutate("reply",burstThread,{body:"One too many"}),/Please wait/);
    await db.exec("reset role"); await db.query("update public.profiles set role='participant' where id=$1",[id(3)]); await db.exec("set role authenticated");
    await assert.rejects(()=>list(),/Rabbi access/);
    assert.equal((await db.query("select * from public.bm_follows")).rows.length,0,"Revoked access also removes private follow visibility");
    assert.equal((await db.query("select * from public.bm_reports")).rows.length,0,"Revoked access hides old private reports");
    await user(4);
    await assert.rejects(()=>get(first),/access denied/);
    await assert.rejects(()=>mutate("report",first,{reason:"Not authorized"}),/Rabbi access/);
    assert.equal((await db.query("select * from public.bm_bookmarks")).rows.length,0);
    await db.exec("reset role");
    assert.equal((await db.query("select deleted_at is not null as removed from public.bm_threads where id=$1",[second])).rows[0].removed,true,"Soft deletion preserves data");
    await db.exec("set role anon"); await assert.rejects(()=>db.query("select * from public.bm_threads"),/permission denied/);
    console.log("PASS: real PostgreSQL schema/RLS, approved worldwide access, author editing, no protected-field escalation, search/replies, follows/unread/bookmarks, private reports, moderation audit, pilot program and chunk privacy, reply-depth/cross-thread validation and soft deletion.");
  } finally { await db.close(); }
}
module.exports = { createDatabase, id };
if (require.main === module) main().catch(e=>{console.error(e);process.exitCode=1;});

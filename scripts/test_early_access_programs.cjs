// Isolated PostgreSQL only; never touches the linked Supabase project.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createLegacyDatabase, A, USER, PARTICIPANT, RABBI } = require("./test_learning_programs.cjs");
const TARGET = "70a993a2-7668-4775-aa46-7ac82117d35b";
const ELYADA = "00000000-0000-0000-0000-000000000091";
const MEMBER = "00000000-0000-0000-0000-000000000092";
const INACTIVE = "00000000-0000-0000-0000-000000000093";
const CHUNK = "00000000-0000-0000-0000-000000000094";
const QUESTION = "00000000-0000-0000-0000-000000000095";
const PACKET = "00000000-0000-0000-0000-000000000096";
const migration = fs.readFileSync("supabase/migrations/202610140001_early_access_learning_programs.sql", "utf8");
async function main() {
  const db = await createLegacyDatabase();
  try {
    await db.exec(`insert into public.chaburos values ('${TARGET}','Elyada');
      insert into public.profiles values ('${ELYADA}','local_rabbi'),('${MEMBER}','participant'),('${INACTIVE}','participant');
      insert into public.chaburah_members values
        ('${ELYADA}','${TARGET}','rabbi','active'),('${MEMBER}','${TARGET}','participant','active'),('${INACTIVE}','${TARGET}','participant','inactive');`);
    await db.exec(fs.readFileSync("supabase/migrations/202610070001_learning_programs.sql", "utf8"));
    await db.exec(`
      alter table public.content_chunks add column content_document jsonb;
      alter table public.learning_files add column storage_path text;
      alter table public.review_questions add column topic text, add column prompt text,
        add column kind text, add column created_by uuid, add column is_model_question boolean default false;
      create schema storage;
      create table storage.objects(bucket_id text, name text);
      alter table storage.objects enable row level security;
      create policy official_materials_read on storage.objects for select to authenticated using (bucket_id='official-learning-materials');
      grant usage on schema storage to authenticated;
      grant select on storage.objects to authenticated;
      update public.chaburos set default_program_id='winter-5787' where id='${A}';
      update public.chaburah_programs set current_week=7 where chaburah_id='${TARGET}' and program_id='winter-5787';
    `);
    // Use real clone RPC, whose definer context must not bypass new access checks.
    const clone = fs.readFileSync("supabase/migrations/202607050001_publish_review_library_drafts.sql", "utf8");
    await db.exec(clone.slice(clone.indexOf("create or replace function"), clone.indexOf("drop policy")));
    await db.exec(`create function private.can_use_review_library() returns boolean language sql stable as $$ select true $$;`);
    await assert.rejects(db.exec(migration.replace(
      "where id = '70a993a2-7668-4775-aa46-7ac82117d35b'",
      "where id = '00000000-0000-0000-0000-000000000000'"
    )), /was not found/);
    await db.exec("rollback");
    assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_name='learning_programs' and column_name='early_access'")).rows[0].n, 0);
    await db.exec(migration);
    const one = async (sql, params=[]) => (await db.query(sql, params)).rows[0];
    assert.equal((await one("select default_program_id from public.chaburos where id=$1", [TARGET])).default_program_id, "summer-5787");
    assert.equal((await one("select default_program_id from public.chaburos where id=$1", [A])).default_program_id, "winter-5787");
    assert.equal((await one("select current_week from public.chaburah_programs where chaburah_id=$1 and program_id='winter-5787'", [TARGET])).current_week, 7);
    await db.exec(`
      insert into public.content_chunks(id,chunk_code,section_key,section_title,source_type,program_id,content_document)
      values ('${CHUNK}','TF1-A1','A','Tefillin','notes','summer-5787','{"blocks":[{"kind":"image","storagePath":"sha256/pilot.png"}]}');
      insert into public.content_chunk_links values ('${CHUNK}','${CHUNK}');
      insert into public.review_questions(id,topic,week,program_id,prompt,visibility,is_library_question,publication_status)
      values ('${QUESTION}','Tefillin',1,'summer-5787','Pilot question','everyone',true,'published');
      insert into public.review_question_answers values ('${QUESTION}',0,'Pilot explanation');
      insert into public.review_packets(id,chaburah_id,week,title,status,program_id)
      values ('${PACKET}','${TARGET}',1,'Pilot packet','published','summer-5787');
      insert into public.review_packet_items values ('${PACKET}','${CHUNK}',0);
      insert into public.learning_files(chaburah_id,title,week,visibility,program_id,storage_path)
      values ('${TARGET}','Pilot PDF',1,'everyone','summer-5787','pilot.pdf');
      insert into storage.objects values ('official-learning-materials','sha256/pilot.png');
      create function private.test_delete_pilot_packet() returns void language sql security definer as $$
        delete from public.review_packets where id='${PACKET}'
      $$;
      grant select,insert,update,delete on all tables in schema public to authenticated;
      grant select on public.review_packet_content_coverage to authenticated;
    `);
    for (const table of ["review_questions","review_question_answers","content_chunks","content_chunk_links","review_packets","review_packet_items","learning_files","review_sessions"]) {
      await db.exec(`alter table public.${table} enable row level security;
        create policy test_existing_role_access on public.${table} for all to authenticated using (true) with check (true);`);
    }
    async function asUser(id) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
      await db.exec(`select set_config('request.headers','{"x-myscp-learning-programs":"1"}',false); set role authenticated;`);
    }
    for (const [user, allowed] of [[USER,true],[ELYADA,true],[MEMBER,true],[PARTICIPANT,false],[RABBI,false],[INACTIVE,false]]) {
      await asUser(user);
      assert.equal((await one("select count(*)::int n from public.learning_programs where id='summer-5787'")).n, allowed ? 1 : 0, user);
      for (const table of ["content_chunks","review_questions","review_packets","learning_files","chaburah_programs"]) {
        const n = (await one(`select count(*)::int n from public.${table} where program_id='summer-5787'`)).n;
        assert.equal(n > 0, allowed, `${user}: ${table}`);
      }
      assert.equal((await one("select count(*)::int n from public.content_chunk_links")).n > 0, allowed);
      assert.equal((await one("select count(*)::int n from public.review_packet_items where packet_id=$1", [PACKET])).n > 0, allowed);
      assert.equal((await one("select count(*)::int n from public.review_question_answers where question_id=$1", [QUESTION])).n > 0, allowed);
      assert.equal((await one("select count(*)::int n from public.review_packet_content_coverage where program_id='summer-5787'")).n > 0, allowed);
      assert.equal((await one("select count(*)::int n from storage.objects")).n > 0, allowed);
      assert.equal((await one("select private.can_read_learning_file_path('pilot.pdf') ok")).ok, allowed);
      if (allowed) assert.equal((await one("select * from public.check_review_answer($1,0)", [QUESTION])).explanation, "Pilot explanation");
      else {
        await assert.rejects(db.query("select * from public.check_review_answer($1,0)", [QUESTION]), /not accessible/);
        await assert.rejects(db.query("select public.clone_review_question($1,$2,1::smallint)", [QUESTION,A]), /not available|manager access required/);
        await assert.rejects(db.query("update public.chaburos set default_program_id='summer-5787' where id=$1", [A]), /cannot be the default/);
        await assert.rejects(db.exec("select private.test_delete_pilot_packet()"), /not available/);
      }
    }
    await asUser(ELYADA);
    const copied = await one("select * from public.clone_review_question($1,$2,1::smallint)", [QUESTION,TARGET]);
    assert.equal(copied.program_id, "summer-5787");
    // Pilot membership does not grant publishing into a different chaburah.
    await assert.rejects(db.query("insert into public.review_packets(id,chaburah_id,program_id) values (gen_random_uuid(),$1,'summer-5787')", [A]), /not available|row-level security/);
    await db.query("update public.chaburos set default_program_id='winter-5787' where id=$1", [TARGET]);
    await db.query("update public.chaburos set default_program_id='summer-5787' where id=$1", [TARGET]);
    await db.query("update public.chaburah_programs set current_week=2 where chaburah_id=$1 and program_id='summer-5787'", [TARGET]);
    assert.equal((await one("select current_week from public.chaburah_programs where chaburah_id=$1 and program_id='winter-5787'", [TARGET])).current_week, 7);
    await db.exec("reset role");
    await asUser(RABBI);
    await db.exec("insert into public.chaburos(id,name) values ('00000000-0000-0000-0000-000000000099','New regular chaburah')");
    await db.exec("reset role");
    assert.equal((await one("select count(*)::int n from public.chaburah_programs where chaburah_id='00000000-0000-0000-0000-000000000099'")).n, 3, "Counter initialization still works for new chaburos");
    await db.query("update public.chaburah_members set status='inactive' where user_id=$1", [MEMBER]);
    await asUser(MEMBER);
    assert.equal((await one("select count(*)::int n from public.learning_programs where id='summer-5787'")).n, 0);
    console.log("PASS: Global Admin/pilot-only metadata, content, assets, answer RPC and clone access; inactive/outside members denied; scoped defaults, independent counters, revoked membership, and no cross-chaburah pilot writes.");
  } finally { await db.close(); }
}
main().catch(error => { console.error(error.message, error.where ?? ""); process.exitCode=1; });

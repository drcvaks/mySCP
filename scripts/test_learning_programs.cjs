// Runs against an isolated in-memory PostgreSQL instance, never Supabase.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { PGlite } = require("../tmp/program-tests/node_modules/@electric-sql/pglite");
const ts = require("typescript");
const vm = require("node:vm");

const A = "00000000-0000-0000-0000-000000000001";
const B = "00000000-0000-0000-0000-000000000002";
const USER = "00000000-0000-0000-0000-000000000010";
const PARTICIPANT = "00000000-0000-0000-0000-000000000011";
const RABBI = "00000000-0000-0000-0000-000000000012";
const C1 = "00000000-0000-0000-0000-000000000021";
const C2 = "00000000-0000-0000-0000-000000000022";
const Q1 = "00000000-0000-0000-0000-000000000031";
const Q2 = "00000000-0000-0000-0000-000000000032";
const Q3 = "00000000-0000-0000-0000-000000000033";
const P1 = "00000000-0000-0000-0000-000000000041";
const P2 = "00000000-0000-0000-0000-000000000042";

async function createLegacyDatabase() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema private;
      create type public.content_visibility as enum ('everyone','chaburah');
      create type public.review_packet_status as enum ('draft','published','archived');
      create type public.notification_type as enum ('review_questions','uploads');
      create table public.app_settings(id boolean primary key, current_review_week smallint);
      insert into public.app_settings values (true, 12);
      create table public.profiles(id uuid primary key, role text);
      insert into public.profiles values ('${USER}','global_admin'),('${PARTICIPANT}','participant'),('${RABBI}','local_rabbi');
      create table public.chaburos(id uuid primary key, name text);
      insert into public.chaburos values ('${A}','A'),('${B}','B');
      create table public.chaburah_members(user_id uuid, chaburah_id uuid, member_role text, status text);
      insert into public.chaburah_members values ('${USER}','${A}','admin','active'),('${USER}','${B}','admin','active'),
        ('${PARTICIPANT}','${A}','participant','active'),('${RABBI}','${A}','rabbi','active');
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      create function private.is_global_admin() returns boolean language sql stable security definer as $$
        select exists(select 1 from public.profiles where id=auth.uid() and role='global_admin')
      $$;
      create function private.can_manage_chaburah(target uuid) returns boolean language sql stable security definer as $$
        select private.is_global_admin() or exists(select 1 from public.chaburah_members
          where chaburah_id=target and user_id=auth.uid() and member_role in ('rabbi','admin') and status='active')
      $$;
      create function private.is_active_chaburah_member(target uuid) returns boolean language sql stable security definer as $$
        select exists(select 1 from public.chaburah_members where chaburah_id=target and user_id=auth.uid() and status='active')
      $$;
      create function private.can_read_content(v public.content_visibility, target uuid) returns boolean language sql stable as $$
        select v='everyone' or private.is_active_chaburah_member(target)
      $$;
      create function private.prefers_in_app(target uuid, kind public.notification_type) returns boolean language sql as $$ select true $$;
      grant usage on schema private, auth to authenticated;
      create table public.content_chunks(id uuid primary key, chunk_code text unique, section_key text,
        section_title text, source_type text);
      insert into public.content_chunks values ('${C1}','95-B1','B','Nat Bar Nat','notes');
      create table public.content_chunk_links(parent_chunk_id uuid, related_chunk_id uuid);
      create table public.review_packets(id uuid primary key, chaburah_id uuid, week smallint,
        title text, status public.review_packet_status, published_at timestamptz);
      insert into public.review_packets values ('${P1}','${A}',1,'Old Summer Packet','draft',null);
      create table public.review_packet_items(packet_id uuid, chunk_id uuid, sort_order integer);
      create table public.learning_files(id uuid default gen_random_uuid(), chaburah_id uuid, title text, week smallint,
        visibility public.content_visibility, review_packet_id uuid, uploaded_by uuid);
      create table public.review_questions(id uuid primary key default gen_random_uuid(), chaburah_id uuid, week smallint,
        choices jsonb default '["True","False"]', visibility public.content_visibility default 'chaburah',
        enabled boolean default true, publication_status text default 'draft', source_question_id uuid,
        is_library_question boolean default false, published_at timestamptz);
      insert into public.review_questions(id,chaburah_id,week,publication_status) values ('${Q1}','${A}',1,'published'),('${Q2}','${A}',1,'draft');
      create table public.review_question_answers(question_id uuid primary key,correct_choice_index integer,explanation text);
      insert into public.review_question_answers values ('${Q1}',0,'Summer'),('${Q2}',0,'Summer');
      create table public.review_sessions(id uuid primary key default gen_random_uuid(),user_id uuid,
        chaburah_id uuid,week smallint,total_questions integer,correct_answers integer,completed_at timestamptz default now());
      insert into public.review_sessions(user_id,chaburah_id,week,total_questions,correct_answers) values ('${USER}','${A}',16,10,8);
      create table public.review_session_answers(session_id uuid,question_id uuid,selected_choice_index integer,is_correct boolean);
      create table public.notifications(user_id uuid,chaburah_id uuid,type public.notification_type,title text,
        body text,action_route text,action_params jsonb default '{}');
      create function public.publish_review_week(uuid,smallint) returns integer language sql as $$ select 0 $$;
      create function public.notify_review_questions_published(uuid,smallint) returns integer language sql as $$ select 0 $$;
    `);
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

async function main() {
  const db = await createLegacyDatabase();
  try {
    await db.exec(fs.readFileSync("supabase/migrations/202610070001_learning_programs.sql", "utf8"));
    await db.exec(`select set_config('request.jwt.claim.sub','${USER}',false)`);
    const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0];
    assert.equal((await scalar("select count(*)::int as n from public.chaburah_programs")).n, 4);
    assert.equal((await scalar("select program_id from public.review_sessions")).program_id, "summer-5786");
    assert.equal((await scalar("select correct_answers from public.review_sessions")).correct_answers, 8);
    await db.exec(`
      insert into public.content_chunks(id,chunk_code,section_key,section_title,source_type,program_id)
      values ('${C2}','HC1-B1','B','Challah','notes','winter-5787');
      insert into public.review_packets(id,chaburah_id,week,title,status,program_id)
      values ('${P2}','${A}',1,'Winter Packet','draft','winter-5787');
      insert into public.review_questions(id,chaburah_id,week,program_id)
      values ('${Q3}','${A}',1,'winter-5787');
      insert into public.review_question_answers values ('${Q3}',0,'Winter');
      update public.chaburah_programs set current_week=2 where chaburah_id='${A}' and program_id='winter-5787';
    `);
    assert.equal((await scalar("select current_week from public.chaburah_programs where chaburah_id=$1 and program_id='summer-5786'", [A])).current_week, 12);
    assert.equal((await scalar("select current_week from public.chaburah_programs where chaburah_id=$1 and program_id='winter-5787'", [B])).current_week, 1);
    assert.equal((await scalar("select public.publish_review_week($1,1::smallint,'winter-5787') as n", [A])).n, 1);
    assert.equal((await scalar("select publication_status from public.review_questions where id=$1", [Q2])).publication_status, "draft");
    assert.equal((await scalar("select public.publish_review_week($1,1::smallint) as n", [A])).n, 1);
    const session = await scalar("select (public.complete_review_session(1::smallint,$1,$2::jsonb)).*", [A, JSON.stringify([{ question_id: Q3, choice_index: 0 }])]);
    assert.equal(session.program_id, "winter-5787");
    assert.equal(session.correct_answers, 1);
    await assert.rejects(db.query("select public.complete_review_session(1::smallint,$1,$2::jsonb)", [A,
      JSON.stringify([{ question_id: Q1, choice_index: 0 }, { question_id: Q3, choice_index: 0 }])]), /one learning program/);
    await assert.rejects(db.exec(`insert into public.review_packet_items values ('${P1}','${C2}',1)`), /same learning program/);
    await assert.rejects(db.exec(`insert into public.content_chunk_links values ('${C1}','${C2}')`), /different learning programs/);
    await db.exec(`insert into public.review_packet_items values ('${P2}','${C2}',1);
      insert into public.learning_files(review_packet_id,title) values ('${P2}','Winter File');`);
    assert.equal((await scalar("select program_id from public.learning_files")).program_id, "winter-5787");
    await db.exec(`insert into public.review_questions(source_question_id,week,chaburah_id) values ('${Q3}',1,'${A}')`);
    assert.equal((await scalar("select program_id from public.review_questions where source_question_id=$1", [Q3])).program_id, "winter-5787");
    await assert.rejects(db.query("update public.review_packets set program_id='winter-5787' where id=$1", [P1]), /cannot be moved/);
    await db.exec(`alter table public.review_questions enable row level security;
      grant select on public.review_questions to authenticated;
      create policy test_existing_question_read on public.review_questions for select to authenticated using (true);`);
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${PARTICIPANT}',false)`);
    assert.equal((await scalar("select count(*)::int as n from public.review_questions where program_id='winter-5787'")).n, 0);
    await db.exec(`select set_config('request.headers','{"x-myscp-learning-programs":"1"}',false)`);
    assert.equal((await scalar("select count(*)::int as n from public.review_questions where program_id='winter-5787'")).n, 2);
    assert.equal((await scalar("select count(*)::int as n from public.chaburah_programs")).n, 2);
    await db.exec(`update public.chaburah_programs set current_week=9 where chaburah_id='${A}' and program_id='winter-5787'`);
    assert.equal((await scalar("select current_week from public.chaburah_programs where program_id='winter-5787'")).current_week, 2);
    await db.exec(`select set_config('request.jwt.claim.sub','${RABBI}',false);
      update public.chaburah_programs set current_week=3 where chaburah_id='${A}' and program_id='winter-5787';`);
    assert.equal((await scalar("select current_week from public.chaburah_programs where program_id='winter-5787'")).current_week, 3);
    await db.exec("reset role");
    const c = { exports: {} };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/shared/learningPrograms.ts", "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, c);
    assert.ok(c.exports.belongsToProgram({}, "summer-5786"));
    assert.ok(!c.exports.belongsToProgram({}, "winter-5787"));
    assert.ok(c.exports.belongsToProgram({ programId: "winter-5787" }, "winter-5787"));
    assert.equal(c.exports.programName(undefined), "Summer 5786");
    const weeksModule = { exports: {}, require: () => c.exports };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/shared/reviewWeeks.ts", "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, weeksModule);
    assert.equal(weeksModule.exports.buildProgramWeeks("summer-5786", 12).at(-1), 16);
    assert.equal(weeksModule.exports.buildProgramWeeks("winter-5787", 1).at(-1), 4);
    console.log("PASS: migration executes; legacy scores preserved; independent counters; program-specific publish/session/clone/file; mixed packets/sessions/links rejected; participant/Rabbi RLS; client filters.");
  } finally {
    await db.close();
  }
}
module.exports = { createLegacyDatabase, A, B, USER, PARTICIPANT, RABBI, C1, P1 };
if (require.main === module) main().catch((error) => { console.error(error.message, error.where ?? ""); process.exitCode = 1; });

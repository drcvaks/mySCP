const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
let PGlite;
try { ({ PGlite } = require("@electric-sql/pglite")); }
catch { ({ PGlite } = require(path.resolve("tmp/review-results-tests/node_modules/@electric-sql/pglite"))); }
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema private;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      create table public.profiles(id uuid primary key, full_name text, role text);
      create table public.chaburos(id uuid primary key);
      create table public.learning_programs(id text primary key);
      create table public.chaburah_members(user_id uuid, chaburah_id uuid, member_role text, status text);
      create table public.review_questions(id uuid primary key, chaburah_id uuid, program_id text,
        week smallint, enabled boolean default true, publication_status text default 'published',
        is_library_question boolean default false, visibility text default 'chaburah', choices jsonb default '["A","B","C","D"]');
      create table public.review_question_answers(question_id uuid, correct_choice_index integer, explanation text);
      create table public.review_sessions(id uuid primary key, user_id uuid, chaburah_id uuid, program_id text);
      create table public.review_session_answers(id uuid primary key, session_id uuid, question_id uuid,
        selected_choice_index smallint, is_correct boolean, created_at timestamptz);
      create function private.is_active_chaburah_member(cid uuid) returns boolean language sql stable security definer as $$
        select exists(select 1 from public.chaburah_members where user_id=auth.uid() and chaburah_id=cid and status='active');
      $$;
      create function private.can_manage_chaburah(cid uuid) returns boolean language sql stable security definer as $$
        select exists(select 1 from public.profiles where id=auth.uid() and role='global_admin') or
          exists(select 1 from public.chaburah_members where user_id=auth.uid() and chaburah_id=cid and status='active' and member_role in ('rabbi','admin'));
      $$;
      create function private.can_access_learning_program(pid text, cid uuid) returns boolean language sql stable security definer as $$
        select pid in ('winter-5787','summer-5787');
      $$;
      create function private.can_read_content(vis text, cid uuid) returns boolean language sql stable security definer as $$
        select vis='everyone' or private.is_active_chaburah_member(cid) or private.can_manage_chaburah(cid);
      $$;
      grant usage on schema public, auth to authenticated, anon;
      insert into public.chaburos values ('${id(10)}'),('${id(11)}');
      insert into public.learning_programs values ('winter-5787'),('summer-5787'),('restricted');
      insert into public.profiles values
        ('${id(1)}','Aaron','participant'),('${id(2)}','Ben','participant'),
        ('${id(3)}','No Answers','participant'),('${id(4)}','Rav','local_rabbi'),
        ('${id(5)}','Other Rav','local_rabbi'),('${id(6)}','Global','global_admin');
      insert into public.chaburah_members values
        ('${id(1)}','${id(10)}','participant','active'),('${id(2)}','${id(10)}','participant','active'),
        ('${id(3)}','${id(10)}','participant','active'),('${id(4)}','${id(10)}','rabbi','active'),
        ('${id(5)}','${id(11)}','rabbi','active');
      insert into public.review_questions (id,chaburah_id,program_id,week) values
        ('${id(20)}','${id(10)}','winter-5787',1),('${id(21)}','${id(10)}','winter-5787',1),
        ('${id(22)}','${id(10)}','winter-5787',2),('${id(23)}','${id(11)}','winter-5787',1),
        ('${id(24)}','${id(10)}','summer-5787',1),('${id(25)}','${id(10)}','restricted',1);
      insert into public.review_question_answers select id,0,'Explanation' from public.review_questions;
      insert into public.review_sessions values
        ('${id(30)}','${id(1)}','${id(10)}','winter-5787'),
        ('${id(31)}','${id(1)}','${id(10)}','winter-5787'),
        ('${id(32)}','${id(2)}','${id(10)}','winter-5787');
      insert into public.review_session_answers values
        ('${id(40)}','${id(30)}','${id(20)}',1,false,'2026-10-01'),
        ('${id(41)}','${id(31)}','${id(20)}',0,true,'2026-10-02'),
        ('${id(42)}','${id(32)}','${id(20)}',0,true,'2026-10-01');
    `);
    await db.exec(fs.readFileSync("supabase/migrations/202610210002_chaburah_review_results.sql", "utf8"));
    await db.exec(fs.readFileSync("supabase/migrations/202610210003_exclude_rabbis_review_results.sql", "utf8"));
    const asUser = async n => db.query("select set_config('request.jwt.claim.sub', $1, false)", [n ? id(n) : ""]);
    const check = (q, choice) => db.query("select * from public.check_review_answer($1::uuid,$2::integer)", [id(q),choice]);
    const results = (cid=10,pid="winter-5787",week=null) => db.query("select * from public.get_chaburah_review_results($1::uuid,$2::text,$3::smallint)",[id(cid),pid,week]);
    let ledger = (await db.query("select * from public.review_first_answers order by user_id")).rows;
    assert.equal(ledger.length,2);
    assert.equal(ledger[0].is_correct,false,"Backfill takes earliest saved answer, not best");
    await asUser(1);
    assert.equal((await check(20,0)).rows[0].is_correct,true,"Retries still return fresh feedback");
    assert.equal((await check(21,0)).rows[0].is_correct,true);
    await check(21,2);
    ledger=(await db.query("select * from public.review_first_answers where user_id=$1",[id(1)])).rows;
    assert.equal(ledger.length,2,"Retries do not add or replace first answers");
    assert.equal(ledger.find(r=>r.question_id===id(20)).is_correct,false);
    assert.equal(ledger.find(r=>r.question_id===id(21)).is_correct,true,"Answer is recorded without finishing a session");
    await assert.rejects(()=>check(22,-1),/Invalid answer choice/);
    await assert.rejects(()=>check(22,4),/Invalid answer choice/);
    await assert.rejects(()=>check(22,null),/Invalid answer choice/);
    await assert.rejects(()=>check(23,0),/not accessible/);
    await assert.rejects(()=>check(25,0),/not accessible/);
    await assert.rejects(()=>results(),/manager access/);
    await db.exec("set role authenticated");
    await assert.rejects(()=>db.query("select * from public.review_first_answers"),/permission denied/);
    await assert.rejects(()=>db.query(`insert into public.review_first_answers(user_id,question_id,chaburah_id,program_id,selected_choice_index,is_correct) values ('${id(1)}','${id(22)}','${id(10)}','winter-5787',0,true)`),/permission denied/);
    await assert.rejects(()=>results(),/manager access/);
    await asUser(4);
    let rows=(await results()).rows;
    assert.equal(rows.length,3,"Include active members with no answers, excluding their Rabbi");
    assert.ok(!rows.some(r=>r.user_id===id(4)),"The chaburah Rabbi is excluded from totals");
    assert.equal(rows[0].display_name,"Ben");
    const aaron=rows.find(r=>r.user_id===id(1));
    assert.equal(Number(aaron.correct_answers),1);
    assert.equal(Number(aaron.answered_questions),2);
    assert.equal(Number(aaron.available_questions),3);
    assert.equal(Number(aaron.weeks_attempted),1);
    assert.equal(rows.find(r=>r.user_id===id(3)).score_rank,null);
    assert.equal(Number((await results(10,"winter-5787",1)).rows[0].available_questions),2);
    assert.ok((await results(10,"winter-5787",2)).rows.every(r=>Number(r.answered_questions)===0));
    assert.ok((await results(10,"summer-5787")).rows.every(r=>Number(r.answered_questions)===0&&Number(r.available_questions)===1));
    await assert.rejects(()=>results(11),/manager access/);
    await assert.rejects(()=>results(10,"restricted"),/manager access/);
    await assert.rejects(()=>results(10,"winter-5787",0),/Invalid week/);
    await db.exec("reset role");
    await asUser(1); await check(22,0);
    await asUser(2); await check(21,1); await check(22,0);
    await asUser(4);
    rows=(await results()).rows;
    assert.equal(Number(rows[0].score_rank),1);
    assert.equal(Number(rows[1].score_rank),1,"Equal exact percentages share rank");
    assert.equal(Number(rows[0].weeks_attempted),2);
    await db.exec(`update public.review_questions set enabled=false where id='${id(22)}'`);
    rows=(await results()).rows;
    assert.equal(Number(rows[0].available_questions),2,"Disabled questions leave denominator and score");
    assert.equal(Number(rows.find(r=>r.user_id===id(1)).answered_questions),2);
    await asUser(4); await check(20,0);
    rows=(await results()).rows;
    assert.equal(rows.length,3);
    assert.ok(!rows.some(r=>r.user_id===id(4)),"Even a Rabbi with answers is excluded before ranking");
    assert.equal(Number(rows[0].score_rank),1,"Excluded Rabbi cannot displace the first participant");
    await db.exec(`insert into public.chaburah_members values ('${id(5)}','${id(10)}','participant','active')`);
    assert.ok((await results()).rows.some(r=>r.user_id===id(5)),"A Rabbi elsewhere can participate here as a regular member");
    await db.exec(`update public.chaburah_members set member_role='rabbi' where user_id='${id(3)}' and chaburah_id='${id(10)}'`);
    assert.ok(!(await results()).rows.some(r=>r.user_id===id(3)),"Membership role, not profile role, determines exclusion");
    await asUser(6); assert.equal((await results(11)).rows.length,0,"Global Admin can query a chaburah containing only its Rabbi");
    await asUser(null); await assert.rejects(()=>results(),/Authentication required/);
    await assert.rejects(()=>check(20,0),/Authentication required/);
    console.log("PASS: real PostgreSQL migration, historical first answers, immediate recording, immutable retries, validation, weighted scores, ties, participation, week/program/chaburah isolation, manager authorization and denied direct access.");
  } finally { await db.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});

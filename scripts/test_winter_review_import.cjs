// Executes only in isolated in-memory PostgreSQL. Never connects to Supabase.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createLegacyDatabase, A, USER } = require("./test_learning_programs.cjs");
const sql = fs.readFileSync("supabase/imports/202610120001_winter_challah_part1_review_questions.sql", "utf8");
const bank = JSON.parse(sql.match(/\$winter_bank\$([\s\S]*?)\$winter_bank\$/)[1]);
const OTHER = "00000000-0000-0000-0000-000000000081";
const COPY = "00000000-0000-0000-0000-000000000082";

async function main() {
  const db = await createLegacyDatabase();
  try {
    await db.exec(`
      create type public.review_question_kind as enum ('true_false','multiple_choice');
      alter table public.review_questions
        add column topic text not null default 'Existing',
        add column prompt text not null default 'Existing prompt',
        add column kind public.review_question_kind not null default 'true_false',
        add column created_by uuid not null default '${USER}' references public.profiles(id),
        add column created_at timestamptz not null default now(),
        add column updated_at timestamptz not null default now(),
        add constraint question_scope check ((visibility='everyone' and chaburah_id is null)
          or (visibility='chaburah' and chaburah_id is not null)),
        add constraint question_choices check (jsonb_typeof(choices)='array' and jsonb_array_length(choices)>=2);
      alter table public.review_question_answers
        add column updated_at timestamptz not null default now(),
        add constraint answer_question foreign key(question_id) references public.review_questions(id),
        add constraint answer_nonnegative check (correct_choice_index>=0);
    `);
    await db.exec(fs.readFileSync("supabase/migrations/202607120001_add_model_review_questions.sql", "utf8"));
    await db.exec(fs.readFileSync("supabase/migrations/202610070001_learning_programs.sql", "utf8"));
    const initial = fs.readFileSync("supabase/migrations/202606220001_initial_schema.sql", "utf8");
    await db.exec(initial.match(/create or replace function private\.validate_review_answer\(\)[\s\S]*?for each row execute function private\.validate_review_answer\(\);/)[0]);
    await db.exec(`insert into public.review_questions(id,program_id,visibility,is_library_question,prompt)
      values ('${OTHER}','winter-5787','everyone',true,'Unrelated Winter library question');`);
    const snapshot = async () => (await db.query(`select row_to_json(q) as data from public.review_questions q
      where id not in (${bank.map((q) => `'${q.id}'`).join(",")}) order by id`)).rows;
    const before = await snapshot();
    const scores = (await db.query("select * from public.review_sessions")).rows;
    await db.exec(sql);
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual((await db.query("select * from public.review_sessions")).rows, scores);
    const imported = (await db.query(`select q.*, a.correct_choice_index, a.explanation
      from public.review_questions q join public.review_question_answers a on a.question_id=q.id
      where q.id in (${bank.map((q) => `'${q.id}'`).join(",")})`)).rows;
    assert.equal(imported.length, 49);
    assert.equal(imported.filter((q) => q.is_model_question).length, 36);
    for (const expected of bank) {
      const q = imported.find((q) => q.id === expected.id);
      for (const key of ["week", "topic", "prompt", "kind", "choices", "correct_choice_index", "explanation", "is_model_question"]) {
        assert.deepEqual(q[key], expected[key], expected.id + ": " + key);
      }
      assert.equal(q.program_id, "winter-5787");
      assert.equal(q.visibility, "everyone");
      assert.equal(q.chaburah_id, null);
      assert.equal(q.source_question_id, null);
      assert.equal(q.publication_status, "published");
      assert.equal(q.enabled, true);
      assert.equal(q.is_library_question, true);
      assert.equal(q.created_by, USER);
    }
    // A Rabbi copy remains separate; library revisions must not overwrite it.
    await db.exec(`insert into public.review_questions(id,chaburah_id,source_question_id,prompt)
      values ('${COPY}','${A}','${bank[0].id}','Rabbi customized copy');
      insert into public.review_question_answers(question_id,correct_choice_index,explanation)
      values ('${COPY}',1,'Customized explanation');`);
    const copies = await snapshot();
    await db.query("update public.review_questions set prompt='Old wording', is_model_question=false where id=$1", [bank[0].id]);
    await db.query("update public.review_question_answers set correct_choice_index=1, explanation='Old explanation' where question_id=$1", [bank[0].id]);
    await db.exec(sql);
    assert.deepEqual(await snapshot(), copies);
    assert.equal((await db.query("select prompt from public.review_questions where id=$1", [bank[0].id])).rows[0].prompt, bank[0].prompt);
    assert.equal((await db.query("select count(*)::int n from public.review_questions")).rows[0].n, 53);
    assert.equal((await db.query("select explanation from public.review_question_answers where question_id=$1", [bank[0].id])).rows[0].explanation, bank[0].explanation);
    assert.equal((await db.query("select program_id from public.review_questions where id=$1", [COPY])).rows[0].program_id, "winter-5787");

    async function fails(candidate, pattern) {
      await assert.rejects(db.exec(candidate), pattern);
      await db.exec("rollback;");
      assert.equal((await db.query("select count(*)::int n from public.review_questions")).rows[0].n, 53);
    }
    await db.query("update public.review_questions set prompt=$1 where id=$2", [bank[0].prompt, OTHER]);
    await fails(sql, /Matching Winter library prompt/);
    await db.query("update public.review_questions set prompt='Unrelated Winter library question' where id=$1", [OTHER]);
    await db.query("update public.review_questions set chaburah_id=$1, visibility='chaburah', is_library_question=false, is_model_question=false where id=$2", [A, bank[0].id]);
    await fails(sql, /Import ID conflicts/);
    await db.query("update public.review_questions set chaburah_id=null, visibility='everyone', is_library_question=true, is_model_question=true where id=$1", [bank[0].id]);
    await fails(sql.replace('"correct_choice_index": 0', '"correct_choice_index": 99'), /check constraint/);
    await db.exec("update public.profiles set role='participant' where role='global_admin'");
    await fails(sql, /Global Admin profile/);
    await db.query("update public.profiles set role='global_admin' where id=$1", [USER]);
    await fails(sql.replace("id = 'winter-5787'", "id = 'missing-program'"), /Winter 5787 is not configured/);
    console.log("PASS: 49 Winter public-library questions / 36 model; exact choice/answer mapping; stable-ID reimport; Summer, other Winter material, Rabbi copies and scores unchanged; conflict/invalid-answer/missing-admin/program rollbacks.");
  } finally { await db.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

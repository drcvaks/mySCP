const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createDatabase, id } = require("./test_beis_midrash_sql.cjs");

async function main() {
  const db = await createDatabase(false);
  const user = n => db.query("select set_config('request.jwt.claim.sub',$1,false)", [n ? id(n) : ""]);
  const mutate = async (category, chunks = [], extra = {}) => (await db.query("select public.bm_mutate('create_thread',null,$1::jsonb) as v", [JSON.stringify({
    title: `${category} discussion`, body: "A discussion about the material.", category, chunk_ids: chunks, program_id: "winter-5787", ...extra
  })])).rows[0].v.id;
  const list = async filters => (await db.query("select public.bm_list_threads($1::jsonb) as v", [JSON.stringify(filters)])).rows[0].v;
  const find = async (type, program = "winter-5787") => (await db.query("select public.bm_find_material('',$1,$2) as v", [program, type])).rows[0].v;
  try {
    await user(2);
    const original = await mutate("notes", [id(20)]);
    await db.query("select public.bm_mutate('reply',$1,$2::jsonb)", [original, JSON.stringify({ body: "Keep this existing reply." })]);
    await db.exec("reset role");
    await db.exec(fs.readFileSync("supabase/migrations/202610230001_beis_midrash_boards.sql", "utf8"));
    await db.exec(`insert into public.content_chunks values
      ('${id(24)}','TF1-Q1','Restricted Question','Q','summer-5787','qa',2),
      ('${id(25)}','HC1-S1','Source graphic','S','winter-5787','source',4); set role authenticated;`);
    await user(2);
    const preserved = (await db.query("select public.bm_get_thread($1) as v", [original])).rows[0].v;
    assert.equal(preserved.replies[0].body, "Keep this existing reply.");
    assert.equal(preserved.chunks[0].source_type, "notes");
    assert.equal((await find("notes")).length, 2);
    assert.deepEqual((await find("qa")).map(c => c.id), [id(23)]);
    assert.equal((await find("all")).length, 3);
    assert.equal((await find("qa", "summer-5787")).length, 0);
    await assert.rejects(() => find("source"), /Invalid material type/);
    await assert.rejects(() => mutate("questions", [id(20)]), /material for this topic/);
    await assert.rejects(() => mutate("notes", [id(23)]), /material for this topic/);
    await assert.rejects(() => mutate("questions", [id(24)], { program_id: null }), /inaccessible material/);
    await assert.rejects(() => mutate("resources", [id(25)]), /inaccessible material/);
    const question = await mutate("questions", [id(23)]);
    const resources = await mutate("resources", [id(20), id(23)]);
    await mutate("teaching"); await mutate("program"); await mutate("general"); await mutate("torah");
    const message = await list({ area: "message" });
    assert.equal(message.total, 3);
    assert.ok(message.items.some(t => t.id === question && t.chunks[0].source_type === "qa"));
    assert.ok(!message.items.some(t => t.id === resources));
    assert.equal((await list({ area: "resources" })).total, 1);
    assert.equal((await list({ area: "teaching" })).total, 3);
    assert.equal((await list({ area: "all", saved: "following" })).total, 7);
    assert.equal((await list({ area: "message", category: "questions" })).total, 1);
    assert.equal((await list({ area: "resources", category: "questions" })).total, 0);
    await assert.rejects(() => db.query("select public.bm_mutate('edit_thread',$1,$2::jsonb)", [question, JSON.stringify({
      title: "Changed topic", body: "Keep question links?", category: "notes", chunk_ids: [id(23)], program_id: "winter-5787"
    })]), /material for this topic/);
    for (const n of [null, 4, 5, 7, 8]) {
      await user(n); await assert.rejects(() => find("qa"), /Rabbi access required/);
    }
    await user(6); assert.equal((await find("qa", "summer-5787")).length, 1);
    console.log("PASS: existing discussion upgrade, board isolation, Notes/Q&A pickers, optional mixed links, editing validation, pilot and participant restrictions.");
  } finally { await db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

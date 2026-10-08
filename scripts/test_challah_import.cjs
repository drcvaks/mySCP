const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createLegacyDatabase, A, USER, PARTICIPANT, C1, P1 } = require("./test_learning_programs.cjs");

async function main() {
  const directory = "tmp/shiur-import-preview/challah-part1/import";
  const payload = JSON.parse(fs.readFileSync(path.join(directory, "payload.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"));
  for (const asset of manifest.assets) {
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(directory, asset.file))).digest("hex"), asset.sha256);
  }
  assert.equal(manifest.assets.length, 61);
  assert.ok(!JSON.stringify(payload).includes("data:image"));
  const db = await createLegacyDatabase();
  try {
    await db.exec(`
      create type public.content_source_type as enum ('notes','qa','source','intro','pace');
      create type public.content_difficulty as enum ('core','advanced','practical');
      alter table public.content_chunks alter column id set default gen_random_uuid();
      alter table public.content_chunks alter column source_type type public.content_source_type using source_type::public.content_source_type;
      alter table public.content_chunks add column siman text default 'Siman 95 Part 1',
        add column workbook_title text default 'Summer Workbook', add column chunk_title text default 'Summer',
        add column chunk_summary text, add column content_markdown text default 'Original Summer text',
        add column sort_order integer default 1, add column official_shiur_number smallint,
        add column estimated_minutes smallint, add column difficulty public.content_difficulty default 'core',
        add column tags text[] default '{}', add column source_file_name text, add column source_start_page integer,
        add column source_end_page integer, add column is_selectable boolean default true, add column updated_at timestamptz default now();
      alter table public.content_chunk_links add column relation_type text default 'related_qa';
      alter table public.content_chunk_links add unique (parent_chunk_id,related_chunk_id,relation_type);
      insert into public.content_chunks (id,chunk_code,source_type) values ('00000000-0000-0000-0000-000000000099','95-Q1','qa');
      insert into public.content_chunk_links values ('${C1}','00000000-0000-0000-0000-000000000099','related_qa');
      insert into public.review_packet_items values ('${P1}','${C1}',1);
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean default false);
      create table storage.objects(bucket_id text,name text,primary key(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated;
      grant select,insert on storage.objects to authenticated;
    `);
    await db.exec(fs.readFileSync("supabase/migrations/202610070001_learning_programs.sql", "utf8"));
    await db.exec(fs.readFileSync("supabase/migrations/202610070002_rich_learning_content.sql", "utf8"));
    await db.exec(`select set_config('request.jwt.claim.sub','${USER}',false)`);
    const snapshot = async () => {
      const result = {};
      for (const table of ["content_chunks","review_packets","learning_files","review_questions","review_sessions"]) {
        result[table] = (await db.query("select * from public." + table + " where program_id='summer-5786' order by id")).rows;
      }
      result.links = (await db.query("select * from public.content_chunk_links order by parent_chunk_id,related_chunk_id")).rows;
      result.items = (await db.query("select * from public.review_packet_items order by packet_id,sort_order")).rows;
      return result;
    };
    const before = await snapshot();
    const sql = fs.readFileSync("supabase/imports/202610070002_challah_part1.sql", "utf8");
    await assert.rejects(db.exec(sql), /images are missing/);
    await db.exec("rollback");
    assert.deepEqual(await snapshot(), before);
    for (const asset of manifest.assets) await db.query("insert into storage.objects values ($1,$2)", [manifest.bucket, asset.storagePath]);
    await db.exec(`insert into public.content_chunks (chunk_code,source_type,program_id) values ('HC1-A1','notes','summer-5786')`);
    await assert.rejects(db.exec(sql), /already belongs to other material/);
    await db.exec("rollback");
    await db.exec("delete from public.content_chunks where chunk_code='HC1-A1'");
    await db.exec(sql);
    const winter = (await db.query("select * from public.content_chunks where program_id='winter-5787' order by chunk_code")).rows;
    assert.equal(winter.length, 123);
    const ids = winter.map((row) => row.id);
    const summerAfter = await snapshot();
    summerAfter.links = summerAfter.links.filter((link) => before.content_chunks.some((row) => row.id === link.parent_chunk_id));
    assert.deepEqual(summerAfter, before);
    assert.equal((await db.query("select count(*)::int as n from public.content_chunk_links")).rows[0].n, 229);
    assert.equal(winter.reduce((n, row) => n + row.content_document.footnotes.length, 0), 45);
    const q18 = winter.find((row) => row.chunk_code === "HC1-Q18");
    assert.ok(JSON.stringify(q18.content_document).includes("(51)"));
    assert.ok(!JSON.stringify(q18.content_document).includes("(48)"));
    for (const question of winter.filter((row) => row.source_type === "qa")) assert.match(question.section_key, /^[A-G]$/);
    const source57 = winter.find((row) => row.chunk_code === "HC1-S57");
    assert.equal((await db.query("select count(*)::int as n from public.content_chunk_links where parent_chunk_id=$1 or related_chunk_id=$1", [source57.id])).rows[0].n, 0);
    await db.exec(sql);
    assert.deepEqual((await db.query("select id from public.content_chunks where program_id='winter-5787' order by chunk_code")).rows.map((row) => row.id), ids);
    assert.equal((await db.query("select count(*)::int as n from storage.objects")).rows[0].n, 61);
    await assert.rejects(db.query("update public.content_chunks set content_document=$1 where chunk_code='HC1-A1'", [{ version: 1, blocks: [] }]), /content_document_v1/);
    await db.exec(`alter table public.content_chunks enable row level security;
      grant select on public.content_chunks to authenticated;
      create policy test_legacy_select on public.content_chunks for select to authenticated using (true);
      set role authenticated;
      select set_config('request.jwt.claim.sub','${PARTICIPANT}',false);
      select set_config('request.headers','{"x-myscp-learning-programs":"1"}',false);`);
    assert.equal((await db.query("select count(*)::int as n from public.content_chunks where program_id='winter-5787'")).rows[0].n, 0);
    await db.exec(`select set_config('request.headers','{"x-myscp-learning-programs":"1","x-myscp-rich-content":"1"}',false)`);
    assert.equal((await db.query("select count(*)::int as n from public.content_chunks where program_id='winter-5787'")).rows[0].n, 123);
    await assert.rejects(db.query("insert into storage.objects values ($1,$2)", [manifest.bucket, "not-admin.png"]), /row-level security/);
    console.log("PASS: rich migration/import execute; missing images and collisions roll back; 123 Winter chunks/228 links/45 footnotes; Summer unchanged; reimport retains IDs; 61 shared assets; Q&A sections; source 57 unlinked; compatibility/storage RLS.");
  } finally {
    await db.close();
  }
}
main().catch((error) => { console.error(error.message, error.where ?? ""); process.exitCode = 1; });

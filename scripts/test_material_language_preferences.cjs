const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(path.resolve('tmp/review-results-tests/node_modules/@electric-sql/pglite'));
const owner = '00000000-0000-4000-8000-000000000010';
const other = '00000000-0000-4000-8000-000000000011';

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;
      insert into auth.users values('${owner}'),('${other}');`);
    await db.exec(fs.readFileSync('supabase/migrations/202610250004_material_language_preferences.sql', 'utf8'));
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
    assert.equal((await db.query('select * from material_language_preferences')).rows.length, 0);
    await db.query('insert into material_language_preferences values($1,$2)', [owner, 'he']);
    await db.query(`insert into material_language_preferences values($1,$2)
      on conflict(user_id) do update set language=excluded.language`, [owner, 'en']);
    assert.equal((await db.query('select language from material_language_preferences')).rows[0].language, 'en');
    await assert.rejects(() => db.query('update material_language_preferences set language=$1', ['invalid']), /check constraint/);
    await assert.rejects(() => db.query('insert into material_language_preferences values($1,$2)', [other, 'he']), /row-level security/);
    await assert.rejects(() => db.query('update material_language_preferences set user_id=$1', [other]), /row-level security/);
    await db.exec(`set request.jwt.claim.sub='${other}';`);
    assert.equal((await db.query('select * from material_language_preferences')).rows.length, 0);
    await db.query('insert into material_language_preferences values($1,$2)', [other, 'he']);
    await db.query("update material_language_preferences set language='he' where user_id=$1", [owner]);
    await db.exec(`set request.jwt.claim.sub='${owner}';`);
    assert.equal((await db.query('select language from material_language_preferences')).rows[0].language, 'en');
    await db.exec('reset role; set role anon;');
    await assert.rejects(() => db.query('select * from material_language_preferences'), /permission denied/);
    await db.exec('reset role;');
    await db.query('delete from auth.users where id=$1', [owner]);
    assert.equal((await db.query('select * from material_language_preferences')).rows.length, 1);
    console.log('PASS: language defaults persist, validate en/he, isolate accounts with RLS, deny anonymous access, and cascade on account deletion.');
  } finally { await db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

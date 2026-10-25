// Generate only approved Hebrew translations. No network or database access.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const directory='tmp/shiur-import-preview/challah-hebrew-part1';
const preview=JSON.parse(fs.readFileSync(path.join(directory,'hebrew-preview.json'),'utf8'));
const audit=JSON.parse(fs.readFileSync(path.join(directory,'extraction-audit.json'),'utf8'));
for(const [name,source] of Object.entries(audit.sources)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join('Content/Hebrew Hafrashas Challah',name))).digest('hex'),source.sha256,'Approved source changed: '+name);
}
assert.equal(preview.stats.notesChunks,32);assert.equal(preview.stats.qaChunks,16);assert.equal(preview.stats.footnotes,27);
assert.equal(preview.sourceDifferences.length,0);
const chunks=preview.languages.he.chunks;
assert.equal(chunks.length,48);assert.equal(new Set(chunks.map(c=>c.code)).size,48);
const notes=chunks.filter(c=>c.sourceType==='notes');
assert.deepEqual(notes.flatMap(c=>c.footnotes.map(n=>n.id)).sort((a,b)=>a-b),Array.from({length:27},(_,i)=>i+1));
assert.equal(chunks.find(c=>c.code==='HC1-A4').paragraphEnd,8);
function document(chunk) {
  assert.ok(chunk.blocks.every(b=>b.kind!=='image'&&b.rtl),'Unexpected image or non-RTL paragraph needs review');
  return {version:1,language:'he',blocks:chunk.blocks,footnotes:chunk.footnotes};
}
const rows=chunks.map(chunk=>{
  assert.match(chunk.code,/^HC1-([A-E][0-9]+|Q(?:[1-9]|1[0-6]))$/);
  const row={chunk_code:chunk.code,source_type:chunk.sourceType,language:'he',
    workbook_title:'\u05d4\u05e4\u05e8\u05e9\u05ea \u05d7\u05dc\u05d4 - \u05d7\u05dc\u05e7 \u05d0',
    section_title:chunk.sectionTitle||chunk.sectionLabel,chunk_title:chunk.title,chunk_summary:chunk.summary,
    content_markdown:chunk.contentMarkdown,content_document:document(chunk),
    question_document:chunk.questionDocument?document(chunk.questionDocument):null,
    source_file_name:chunk.sourceFile,source_numbers:chunk.sourceNumbers};
  return {...row,approved_hash:crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex')};
});
const json=JSON.stringify(rows);
assert.ok(!json.includes('$hebrew_payload$'));
const sql=`-- Reviewed Hebrew A-E / Q1-Q16. Apply 202610250002_material_languages.sql first.
-- This never inserts/updates English chunks, packets, files, or images.
begin;
do $hebrew_import$
declare
  payload jsonb := $hebrew_payload$${json}$hebrew_payload$::jsonb;
  english_before text; english_after text;
begin
  if jsonb_array_length(payload)<>48 or exists(select 1 from jsonb_array_elements(payload) r
    where r->>'language'<>'he' or r->>'chunk_code' !~ '^HC1-([A-E][0-9]+|Q([1-9]|1[0-6]))$' or r->>'source_type' not in ('notes','qa')) then
    raise exception 'Invalid approved Hebrew import';
  end if;
  if (select count(distinct c.id) from jsonb_array_elements(payload) r join public.content_chunks c
    on c.chunk_code=r->>'chunk_code' and c.program_id='winter-5787' and c.workbook_title='Hafrashas Challah Part 1'
      and c.source_type::text=r->>'source_type' and c.language='en')<>48 then
    raise exception 'Approved English canonical chunks are missing or mismatched. Nothing was imported';
  end if;
  select md5(coalesce(jsonb_agg(to_jsonb(c) order by c.id)::text,'')) into english_before from public.content_chunks c;
  insert into public.content_chunk_translations(chunk_id,language,workbook_title,section_title,chunk_title,chunk_summary,
    content_markdown,content_document,question_document,source_file_name,source_numbers,approved_hash)
  select c.id,'he',r.workbook_title,r.section_title,r.chunk_title,r.chunk_summary,r.content_markdown,r.content_document,
    r.question_document,r.source_file_name,r.source_numbers,r.approved_hash
  from jsonb_to_recordset(payload) r(chunk_code text,source_type text,workbook_title text,section_title text,chunk_title text,
    chunk_summary text,content_markdown text,content_document jsonb,question_document jsonb,source_file_name text,source_numbers integer[],approved_hash text)
  join public.content_chunks c on c.chunk_code=r.chunk_code and c.program_id='winter-5787'
  on conflict(chunk_id,language) do update set workbook_title=excluded.workbook_title,section_title=excluded.section_title,
    chunk_title=excluded.chunk_title,chunk_summary=excluded.chunk_summary,content_markdown=excluded.content_markdown,
    content_document=excluded.content_document,question_document=excluded.question_document,source_file_name=excluded.source_file_name,
    source_numbers=excluded.source_numbers,approved_hash=excluded.approved_hash,updated_at=now()
  where public.content_chunk_translations.approved_hash is distinct from excluded.approved_hash;
  select md5(coalesce(jsonb_agg(to_jsonb(c) order by c.id)::text,'')) into english_after from public.content_chunks c;
  if english_before is distinct from english_after then raise exception 'English content changed unexpectedly. Import rolled back'; end if;
end;
$hebrew_import$;
commit;
`;
// Generated artifacts, not hand-edited source files.
fs.mkdirSync(path.join(directory,'import'),{recursive:true});
fs.writeFileSync(path.join(directory,'import','payload.json'),JSON.stringify(rows,null,2));
fs.writeFileSync('supabase/imports/202610250003_challah_hebrew_part1.sql',sql);
console.log('Prepared 48 separate Hebrew translations (32 Notes, 16 Q&A), 27 footnotes, 16 question-only documents. English and shared source images unchanged.');

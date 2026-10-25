# Hebrew Challah Part 1

Prepared locally; no live Supabase schema or data was changed by this task.

## Apply in this order

1. Run `supabase/migrations/202610250002_material_languages.sql` in the Supabase
   SQL Editor. The existing learning-program and rich-content migrations must
   already be installed. This labels all current official chunks, packets, and
   Files records `en`. Existing IDs, English text, titles, assets, and publication
   status are not replaced. Saved packet languages cannot subsequently be changed.
2. Run `supabase/imports/202610250003_challah_hebrew_part1.sql`. This inserts only
   Hebrew translation records, linked to the existing Winter 5787 HC1 chunk IDs.
   The transaction refuses missing/mismatched canonical chunks and checks that
   the entire canonical English content table is unchanged. Re-running this data
   import is safe; the migration itself should be applied only once.
3. Deploy this app version, including `src/shared/materialLanguages.ts`. Native
   builds must also be updated. Older app builds continue to see English packets
   but cannot see Hebrew packets or their Files entries, preventing English-only
   clients from displaying the wrong language.

There is no asset upload step: all 57 Source Sheets keep their original IDs and
images. Source 57 remains unlinked for Part 2. Shared images are already Hebrew;
their English library metadata does not mean their image text was translated.

## Approved scope

- Notes: A-E, displayed as Hebrew section letters; 32 chunks and 27 footnotes.
- Q&A: Q1-Q16; 16 translated question-and-answer chunks.
- The separately reviewed question-only worksheets are retained in
  `question_document` for future use; the existing Q&A view displays the combined
  question/answer document.
- Notes F-G and Q17-Q21 are not supplied. Missing Hebrew text is never replaced by
  English. Q14-Q16 remain available, but their missing F-note suggestions are not
  shown in the Hebrew builder.
- Canonical codes such as `HC1-A1` and the original UUIDs are unchanged. English
  imports and Beis Midrash official references still use those English records.
- Hebrew is stored as selectable Unicode text with rich formatting, not screenshots.

## Confirm after importing

```sql
select language, count(*) from public.content_chunks group by language;
select language, count(*) from public.review_packets group by language;
select language, count(*) from public.learning_files group by language;
select c.source_type, count(*) as hebrew_chunks
from public.content_chunk_translations t
join public.content_chunks c on c.id=t.chunk_id
where t.language='he' and c.program_id='winter-5787'
  and c.workbook_title='Hafrashas Challah Part 1'
group by c.source_type;
-- Expected Hebrew counts: notes = 32, qa = 16.
select sum(jsonb_array_length(t.content_document->'footnotes')) as footnotes
from public.content_chunk_translations t
join public.content_chunks c on c.id=t.chunk_id
where t.language='he' and c.program_id='winter-5787'
  and c.workbook_title='Hafrashas Challah Part 1';
-- Expected: 27.
```

In Shiur Builder, select English or Hebrew under Material Language. Switching
with selections requires confirmation; saved packets retain their language and
the selected week is not reset by switching languages. Draft/published lists and
coverage are scoped by language. New Files entries inherit the packet language.
Opening a packet always uses its saved language, independently of the current
builder selection. English remains the default on opening the builder.

Hebrew packet titles use RTL/right alignment in the editor, Files, preview, and
print. New defaults use `שבוע`, `סיכום השיעור`, `שאלות ותשובות`, or `דפי מקורות`,
while retaining the chaburah name as entered. Manually edited and loaded saved
titles are not regenerated. English titles and Latin chunk codes keep LTR display.

Preview Notes, Q&A, footnotes, RTL list markers/indentation, and scrolling on a
phone and desktop, then print a sample. The SCP logo stays top-right. Beis Midrash
continues to show English official material; shared canonical links remain valid.

## Verification and regeneration

The generator checks the Word-file hashes against the reviewed extraction audit.
Do not regenerate the preview from changed source files without renewed review.

```powershell
node scripts/prepare_hebrew_challah_import.cjs
node scripts/test_material_languages.cjs
node scripts/test_rich_content.cjs
node scripts/test_packet_draft_publish.cjs
node scripts/test_packet_titles.cjs
node node_modules/typescript/bin/tsc --noEmit
$env:MYSCP_TEST_URL='http://localhost:8088'
node scripts/test_hebrew_builder_webkit.cjs
```

Automated SQL tests use local PostgreSQL/PGlite, and browser tests intercept all
Supabase traffic with synthetic accounts/data. They do not substitute for applying
the SQL and checking the live app after deployment. Native physical-device testing
is still recommended for Hebrew fonts and platform-specific text rendering.

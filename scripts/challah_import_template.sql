-- Approved Challah Part 1 only. Apply the learning-program and rich-content migrations first.
-- Upload all manifest assets before running this file. No packet/quiz/score rows are written.
begin;
do $hc1_import$
declare
  payload jsonb := $hc1_payload$__PAYLOAD__$hc1_payload$::jsonb;
begin
  if not exists (select 1 from public.learning_programs where id = 'winter-5787') then
    raise exception 'Winter 5787 is not configured';
  end if;
  if payload->>'program' <> 'winter-5787' or payload->>'workbook' <> 'Hafrashas Challah Part 1'
     or jsonb_array_length(payload->'chunks') <> 123 then
    raise exception 'Invalid Challah import payload';
  end if;
  if exists (select 1 from jsonb_array_elements(payload->'chunks') r
    where r->>'program_id' <> 'winter-5787' or r->>'chunk_code' !~ '^HC1-([A-G][0-9]+|Q[0-9]+|S[0-9]+)$'
      or r->>'workbook_title' <> 'Hafrashas Challah Part 1') then
    raise exception 'The import contains out-of-scope content';
  end if;
  if exists (select 1 from public.content_chunks existing
    join jsonb_array_elements(payload->'chunks') row on existing.chunk_code = row->>'chunk_code'
    where existing.program_id <> 'winter-5787' or existing.workbook_title <> 'Hafrashas Challah Part 1') then
    raise exception 'An HC1 code already belongs to other material. No records were changed.';
  end if;
  if not exists (select 1 from storage.buckets where id = 'official-learning-materials' and not public) then
    raise exception 'The private official-materials bucket is missing';
  end if;
  if exists (select 1 from jsonb_array_elements(payload->'assets') asset
    where not exists (select 1 from storage.objects o where o.bucket_id = 'official-learning-materials'
      and o.name = asset->>'storagePath')) then
    raise exception 'Official images are missing. Run the asset upload first.';
  end if;

  insert into public.content_chunks (
    program_id, chunk_code, source_type, siman, workbook_title, section_key, section_title,
    chunk_title, chunk_summary, content_markdown, content_document, sort_order, official_shiur_number,
    estimated_minutes, difficulty, tags, source_file_name, source_start_page, source_end_page, is_selectable
  )
  select program_id, chunk_code, source_type, siman, workbook_title, section_key, section_title,
    chunk_title, chunk_summary, content_markdown, content_document, sort_order, official_shiur_number,
    estimated_minutes, difficulty, tags, source_file_name, source_start_page, source_end_page, is_selectable
  from jsonb_to_recordset(payload->'chunks') as row (
    program_id text, chunk_code text, source_type public.content_source_type, siman text, workbook_title text,
    section_key text, section_title text, chunk_title text, chunk_summary text, content_markdown text,
    content_document jsonb, sort_order integer, official_shiur_number smallint, estimated_minutes smallint,
    difficulty public.content_difficulty, tags text[], source_file_name text,
    source_start_page integer, source_end_page integer, is_selectable boolean
  )
  on conflict (chunk_code) do update set
    section_key = excluded.section_key, section_title = excluded.section_title, chunk_title = excluded.chunk_title,
    chunk_summary = excluded.chunk_summary, content_markdown = excluded.content_markdown,
    content_document = excluded.content_document, sort_order = excluded.sort_order,
    official_shiur_number = excluded.official_shiur_number, estimated_minutes = excluded.estimated_minutes,
    difficulty = excluded.difficulty, tags = excluded.tags, source_file_name = excluded.source_file_name,
    source_start_page = excluded.source_start_page, source_end_page = excluded.source_end_page,
    is_selectable = excluded.is_selectable, updated_at = now();

  delete from public.content_chunk_links link using public.content_chunks parent, public.content_chunks related
  where link.parent_chunk_id = parent.id and link.related_chunk_id = related.id
    and parent.program_id = 'winter-5787' and related.program_id = 'winter-5787'
    and parent.workbook_title = 'Hafrashas Challah Part 1' and related.workbook_title = 'Hafrashas Challah Part 1'
    and parent.chunk_code in (select r->>'chunk_code' from jsonb_array_elements(payload->'chunks') r)
    and related.chunk_code in (select r->>'chunk_code' from jsonb_array_elements(payload->'chunks') r)
    and link.relation_type in ('related_qa', 'related_note', 'related_source');
  insert into public.content_chunk_links (parent_chunk_id, related_chunk_id, relation_type)
  select parent.id, related.id, row.relation_type
  from jsonb_to_recordset(payload->'links') as row (parent text, related text, relation_type text)
  join public.content_chunks parent on parent.chunk_code = row.parent and parent.program_id = 'winter-5787'
  join public.content_chunks related on related.chunk_code = row.related and related.program_id = 'winter-5787'
  on conflict (parent_chunk_id, related_chunk_id, relation_type) do nothing;
end;
$hc1_import$;
commit;

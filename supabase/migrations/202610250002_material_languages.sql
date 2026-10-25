-- English remains canonical. Translations never replace existing content/chunk IDs.
begin;
alter table public.content_chunks add column language text not null default 'en' check (language='en');
alter table public.review_packets add column language text not null default 'en' check (language in ('en','he'));
alter table public.learning_files add column language text not null default 'en' check (language in ('en','he'));

create table public.content_chunk_translations (
  id uuid primary key default gen_random_uuid(),
  chunk_id uuid not null references public.content_chunks(id) on delete restrict,
  language text not null default 'he' check (language='he'),
  workbook_title text not null,
  section_title text not null,
  chunk_title text not null,
  chunk_summary text,
  content_markdown text not null,
  content_document jsonb not null check (coalesce(content_document->>'version'='1' and content_document->>'language'='he' and jsonb_typeof(content_document->'blocks')='array' and jsonb_typeof(content_document->'footnotes')='array',false)),
  question_document jsonb check (question_document is null or coalesce(question_document->>'version'='1' and question_document->>'language'='he' and jsonb_typeof(question_document->'blocks')='array' and jsonb_typeof(question_document->'footnotes')='array',false)),
  source_file_name text not null,
  source_numbers integer[] not null default '{}',
  approved_hash text not null check (approved_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(chunk_id,language)
);
alter table public.content_chunk_translations enable row level security;
revoke all on public.content_chunk_translations from public,anon,authenticated;
grant select on public.content_chunk_translations to authenticated;

create function private.material_language_client() returns boolean
language sql stable set search_path='' as $$
  select coalesce((coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-myscp-material-languages')='1',false);
$$;
create function private.packet_material_language(target_packet_id uuid) returns text
language sql stable security definer set search_path='' as $$
  select language from public.review_packets where id=target_packet_id;
$$;
revoke all on function private.material_language_client(),private.packet_material_language(uuid) from public,anon;
grant execute on function private.material_language_client(),private.packet_material_language(uuid) to authenticated;
create policy translations_read on public.content_chunk_translations for select to authenticated
  using (private.material_language_client() and exists(select 1 from public.content_chunks c where c.id=chunk_id));
-- Old clients must not display a Hebrew packet using their English-only renderer.
create policy packet_language_client on public.review_packets as restrictive for select to authenticated
  using (language='en' or private.material_language_client());
create policy file_language_client on public.learning_files as restrictive for select to authenticated
  using (review_packet_id is null or private.packet_material_language(review_packet_id)='en' or private.material_language_client());
create policy item_language_client on public.review_packet_items as restrictive for all to authenticated
  using (private.packet_material_language(packet_id)='en' or private.material_language_client())
  with check (private.packet_material_language(packet_id)='en' or private.material_language_client());

create function private.guard_material_language() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.language is distinct from old.language then raise exception 'A saved packet language cannot be changed. Create a new packet in the other language.'; end if;
  return new;
end;
$$;
create trigger lock_packet_language before update on public.review_packets for each row execute function private.guard_material_language();

create function private.derive_file_language() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.review_packet_id is not null then
    new.language := private.packet_material_language(new.review_packet_id);
  end if;
  return new;
end;
$$;
create trigger packet_file_language before insert or update on public.learning_files for each row execute function private.derive_file_language();
revoke all on function private.derive_file_language() from public,anon;

create function private.guard_translated_chunk() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.content_chunks c where c.id=new.chunk_id and c.source_type in ('notes','qa') and c.language='en') then
    raise exception 'Only canonical Notes and Q&A may have Hebrew translations';
  end if;
  return new;
end;
$$;
create trigger guard_translation before insert or update on public.content_chunk_translations for each row execute function private.guard_translated_chunk();

create function private.guard_packet_item_language() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if private.packet_material_language(new.packet_id)='he' and not exists(
    select 1 from public.content_chunks c where c.id=new.chunk_id and (
      c.source_type='source' or exists(select 1 from public.content_chunk_translations t where t.chunk_id=c.id and t.language='he')
    )
  ) then raise exception 'Hebrew text is not available for this material. English will not be substituted'; end if;
  return new;
end;
$$;
create trigger guard_packet_item_language before insert or update on public.review_packet_items for each row execute function private.guard_packet_item_language();
revoke all on function private.guard_material_language(),private.guard_translated_chunk(),private.guard_packet_item_language() from public,anon;
notify pgrst,'reload schema';
commit;

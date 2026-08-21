-- Add Source Sheets as a controlled Shiur Builder content category.
-- This is additive only: it does not insert source content or alter existing packets.

alter type public.content_source_type add value if not exists 'source';

alter table public.content_chunk_links
  drop constraint if exists content_chunk_links_relation_type_check;

alter table public.content_chunk_links
  add constraint content_chunk_links_relation_type_check
  check (relation_type in ('related_qa', 'related_note', 'related_source'));

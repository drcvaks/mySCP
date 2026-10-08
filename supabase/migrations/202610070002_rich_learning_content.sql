-- Add rich content without changing Summer's Markdown, IDs, scores or packets.
begin;
alter table public.content_chunks add column content_document jsonb;
alter table public.content_chunks add constraint content_document_v1 check (
  content_document is null or coalesce((
    jsonb_typeof(content_document) = 'object'
    and content_document->'version' = '1'::jsonb
    and jsonb_typeof(content_document->'blocks') = 'array'
    and jsonb_typeof(content_document->'footnotes') = 'array'
  ), false)
);

insert into storage.buckets (id, name, public)
values ('official-learning-materials', 'official-learning-materials', false)
on conflict (id) do nothing;
do $bucket_check$
begin
  if exists (select 1 from storage.buckets where id = 'official-learning-materials' and public) then
    raise exception 'The official-learning-materials bucket must be private. No bucket permissions were changed.';
  end if;
end;
$bucket_check$;

create policy official_materials_read on storage.objects for select to authenticated
using (bucket_id = 'official-learning-materials');
create policy official_materials_upload on storage.objects for insert to authenticated
with check (bucket_id = 'official-learning-materials' and private.is_global_admin());
-- No update/delete policy: uploads are immutable, content-addressed files.

create function private.rich_content_client()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb
    ->> 'x-myscp-rich-content') = '1', false);
$$;

create function private.packet_requires_rich_content(target_packet_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.review_packet_items item
    join public.content_chunks chunk on chunk.id = item.chunk_id
    where item.packet_id = target_packet_id and chunk.content_document is not null
  );
$$;
-- Capability checks supplement existing membership/role policies; they never authorize a user.
create policy rich_client_chunks on public.content_chunks as restrictive for select to authenticated
using (content_document is null or private.rich_content_client());
create policy rich_client_packets on public.review_packets as restrictive for select to authenticated
using (not private.packet_requires_rich_content(id) or private.rich_content_client());
create policy rich_client_files on public.learning_files as restrictive for select to authenticated
using (review_packet_id is null or not private.packet_requires_rich_content(review_packet_id) or private.rich_content_client());

notify pgrst, 'reload schema';
commit;

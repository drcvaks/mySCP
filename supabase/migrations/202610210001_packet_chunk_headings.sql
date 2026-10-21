-- Keep display choices on packets, not on the shared official material.
alter table public.review_packets
  add column if not exists chunk_heading_options jsonb not null default '{}'::jsonb
  check (
    jsonb_typeof(chunk_heading_options) = 'object'
    and (not (chunk_heading_options ? 'notes') or jsonb_typeof(chunk_heading_options->'notes') = 'boolean')
    and (not (chunk_heading_options ? 'qa') or jsonb_typeof(chunk_heading_options->'qa') = 'boolean')
  );

-- Wrap the existing authorized update so content and display choices commit together.
-- Retain the old RPC for compatibility with clients already deployed.
create or replace function public.update_published_review_packet_display(
  target_packet_id uuid,
  new_title text,
  new_week smallint,
  chunk_ids uuid[],
  new_chunk_heading_options jsonb
)
returns public.learning_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  file_record public.learning_files;
begin
  file_record := public.update_published_review_packet(target_packet_id, new_title, new_week, chunk_ids);
  update public.review_packets
  set chunk_heading_options = coalesce(new_chunk_heading_options, '{}'::jsonb)
  where id = target_packet_id;
  return file_record;
end;
$$;

revoke all on function public.update_published_review_packet_display(uuid, text, smallint, uuid[], jsonb) from public, anon;
grant execute on function public.update_published_review_packet_display(uuid, text, smallint, uuid[], jsonb) to authenticated;
notify pgrst, 'reload schema';

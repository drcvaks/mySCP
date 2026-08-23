-- Allow chaburah managers to update or delete published Shiur Builder packets
-- together with their linked Files entry.

create or replace function public.update_published_review_packet(
  target_packet_id uuid,
  new_title text,
  new_week smallint,
  chunk_ids uuid[]
)
returns public.learning_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  packet_record public.review_packets;
  file_record public.learning_files;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select *
  into packet_record
  from public.review_packets packet
  where packet.id = target_packet_id
    and packet.status = 'published'::public.review_packet_status
  for update;

  if not found then
    raise exception 'Published packet not found';
  end if;

  if not private.can_manage_chaburah(packet_record.chaburah_id) then
    raise exception 'Chaburah manager access required';
  end if;

  if new_title is null or length(btrim(new_title)) = 0 then
    raise exception 'Packet title is required';
  end if;

  if chunk_ids is null or array_length(chunk_ids, 1) is null then
    raise exception 'Add at least one section before updating';
  end if;

  update public.review_packets
  set
    title = btrim(new_title),
    week = new_week,
    updated_at = now()
  where id = target_packet_id
  returning * into packet_record;

  delete from public.review_packet_items
  where packet_id = target_packet_id;

  insert into public.review_packet_items (packet_id, chunk_id, sort_order)
  select target_packet_id, chunk_id, ordinality::integer
  from unnest(chunk_ids) with ordinality as selected(chunk_id, ordinality);

  update public.learning_files
  set
    chaburah_id = packet_record.chaburah_id,
    title = packet_record.title,
    description = 'Custom review packet prepared from official SCP material.',
    topic = packet_record.siman,
    coverage = 'week'::public.file_coverage,
    week = packet_record.week,
    file_type = 'custom_review_packet'::public.learning_file_type,
    visibility = 'chaburah'::public.content_visibility,
    uploaded_by = (select auth.uid())
  where review_packet_id = target_packet_id
  returning * into file_record;

  if file_record.id is null then
    insert into public.learning_files (
      chaburah_id,
      title,
      description,
      topic,
      coverage,
      week,
      file_type,
      visibility,
      review_packet_id,
      uploaded_by
    )
    values (
      packet_record.chaburah_id,
      packet_record.title,
      'Custom review packet prepared from official SCP material.',
      packet_record.siman,
      'week'::public.file_coverage,
      packet_record.week,
      'custom_review_packet'::public.learning_file_type,
      'chaburah'::public.content_visibility,
      target_packet_id,
      (select auth.uid())
    )
    returning * into file_record;
  end if;

  return file_record;
end;
$$;

create or replace function public.delete_review_packet(target_packet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  packet_record public.review_packets;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select *
  into packet_record
  from public.review_packets packet
  where packet.id = target_packet_id
  for update;

  if not found then
    raise exception 'Packet not found';
  end if;

  if not private.can_manage_chaburah(packet_record.chaburah_id) then
    raise exception 'Chaburah manager access required';
  end if;

  delete from public.learning_files
  where review_packet_id = target_packet_id;

  delete from public.review_packets
  where id = target_packet_id;
end;
$$;

revoke all on function public.update_published_review_packet(uuid, text, smallint, uuid[]) from public;
revoke all on function public.delete_review_packet(uuid) from public;
grant execute on function public.update_published_review_packet(uuid, text, smallint, uuid[]) to authenticated;
grant execute on function public.delete_review_packet(uuid) to authenticated;

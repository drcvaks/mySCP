-- Optional external links in Resources & Materials. Apply after 202610240001.
-- Existing discussions and attachments are preserved. No destinations are fetched.
begin;
alter table public.bm_threads
  add column resource_url text,
  add column resource_label text,
  add constraint bm_resource_url_check check (
    resource_url is null or (
      category='resources' and length(resource_url) between 1 and 2048
      and resource_url !~ '[[:space:][:cntrl:]\\]'
      and resource_url ~* '^https?://([a-z0-9]([a-z0-9.-]*[a-z0-9])?|\[[0-9a-f:.]+\])(:[0-9]{1,5})?([/?#].*)?$'
      and coalesce(substring(resource_url from '(?i)^https?://(?:[a-z0-9][a-z0-9.-]*|\[[0-9a-f:.]+\]):([0-9]{1,5})(?:[/?#]|$)')::integer,0)<=65535
    )
  ),
  add constraint bm_resource_label_check check (
    resource_label is null or (
      resource_url is not null and length(resource_label) between 1 and 160
      and btrim(resource_label)<>'' and resource_label !~ '[[:cntrl:]]'
    )
  );

create or replace function public.bm_mutate(action text, target_id uuid default null, payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare tid uuid; rid uuid; t public.bm_threads; r public.bm_replies; parent public.bm_replies;
  pid text; ids uuid[]; resource_ids uuid[]; body_text text; new_status text;
begin
  if not private.can_access_bm() then raise exception 'Rabbi access required'; end if;
  if action in ('create_thread','reply','report') then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,2201));
    if (select count(*) from public.bm_threads where author_id=auth.uid() and created_at>now()-interval '1 hour')>=30
      or (select count(*) from public.bm_replies where author_id=auth.uid() and created_at>now()-interval '1 minute')>=10
      or (select count(*) from public.bm_reports where reporter_id=auth.uid() and created_at>now()-interval '1 hour')>=20 then
      raise exception 'Please wait before posting again';
    end if;
  end if;
  if action in ('create_thread','edit_thread') then
    pid:=nullif(payload->>'program_id','');
    if pid is not null and not private.can_access_learning_program(pid) then raise exception 'Program access denied'; end if;
    select coalesce(array_agg(distinct value::uuid),'{}') into ids from jsonb_array_elements_text(coalesce(payload->'chunk_ids','[]'));
    if payload->>'category' in ('notes','questions') and cardinality(ids)=0 then
      raise exception 'Link at least one official Notes section or Question for this topic';
    end if;
    select coalesce(array_agg(distinct value::uuid),'{}') into resource_ids
      from jsonb_array_elements_text(coalesce(payload->'resource_ids','[]'));
    if cardinality(resource_ids)>5 or (cardinality(resource_ids)>0 and payload->>'category' is distinct from 'resources') then
      raise exception 'Attach up to five files in Resources & Materials only';
    end if;
    -- Serialize attachment claims, including attempts to reuse a file in another thread.
    perform 1 from public.bm_resources a where a.id=any(resource_ids) order by a.id for update;
    if (select count(*) from public.bm_resources a
      join storage.objects o on o.bucket_id='bm-resources' and o.name=a.storage_path
      where a.id=any(resource_ids) and a.owner_id=auth.uid()
        and (a.thread_id=target_id or (a.thread_id is null and a.created_at>now()-interval '24 hours'))
        and (o.metadata->>'size')::bigint=a.byte_size and o.metadata->>'mimetype'=a.mime_type)<>cardinality(resource_ids) then
      raise exception 'An attachment is missing, expired, or belongs to another discussion';
    end if;
    if cardinality(ids)>20 or (select count(*) from public.content_chunks c where c.id=any(ids)
      and c.source_type in ('notes','qa') and private.can_access_learning_program(c.program_id)
      and (payload->>'category'<>'notes' or c.source_type='notes')
      and (payload->>'category'<>'questions' or c.source_type='qa')
      and (pid is null or c.program_id=pid))<>cardinality(ids) then raise exception 'Invalid or inaccessible material for this topic'; end if;
    if action='create_thread' then
      insert into public.bm_threads(author_id,title,body,category,program_id,language,resource_url,resource_label)
      values(auth.uid(),btrim(payload->>'title'),btrim(payload->>'body'),payload->>'category',pid,coalesce(payload->>'language','mixed'),nullif(btrim(payload->>'resource_url'),''),nullif(btrim(payload->>'resource_label'),'')) returning id into tid;
      insert into public.bm_follows(user_id,thread_id) values(auth.uid(),tid);
    else
      select * into t from public.bm_threads where id=target_id for update;
      if not found or not private.bm_can_read_thread(target_id) or t.author_id<>auth.uid() or t.deleted_at is not null or t.is_hidden then
        raise exception 'Only the author can edit an active discussion'; end if;
      tid:=t.id;
      update public.bm_threads set title=btrim(payload->>'title'),body=btrim(payload->>'body'),category=payload->>'category',
        program_id=pid,language=coalesce(payload->>'language','mixed'),
        resource_url=case when payload ? 'resource_url' then nullif(btrim(payload->>'resource_url'),'') else resource_url end,
        resource_label=case when payload ? 'resource_label' then nullif(btrim(payload->>'resource_label'),'') else resource_label end,
        updated_at=now() where id=tid;
      delete from public.bm_thread_chunks where thread_id=tid;
    end if;
    insert into public.bm_thread_chunks(thread_id,content_chunk_id) select tid,unnest(ids);
    update public.bm_resources set thread_id=null where thread_id=tid and not (id=any(resource_ids));
    update public.bm_resources set thread_id=tid where id=any(resource_ids);
    return jsonb_build_object('id',tid);
  end if;
  if action in ('edit_reply','delete_reply','hide_reply','restore_reply') then
    select * into r from public.bm_replies where id=target_id for update;
    if not found then raise exception 'Reply not found'; end if;
    tid:=r.thread_id;
  elsif action='review_report' then
    if not private.is_bm_moderator() then raise exception 'Moderator access required'; end if;
    update public.bm_reports set status='reviewed',handled_by=auth.uid(),handled_at=now() where id=target_id returning thread_id into tid;
    if tid is null then raise exception 'Report not found'; end if;
    insert into public.bm_moderation_log(actor_id,thread_id,action) values(auth.uid(),tid,'review_report');
    return jsonb_build_object('id',tid);
  else tid:=target_id;
  end if;
  if not private.bm_can_read_thread(tid) then raise exception 'Discussion not found or access denied'; end if;
  select * into t from public.bm_threads where id=tid for update;
  if action='reply' then
    if t.status='archived' or t.is_hidden or t.deleted_at is not null then raise exception 'This discussion is closed'; end if;
    rid:=nullif(payload->>'parent_reply_id','')::uuid;
    if rid is not null then
      select * into parent from public.bm_replies where id=rid;
      if not found or parent.thread_id<>tid or parent.parent_reply_id is not null or parent.is_hidden or parent.deleted_at is not null then
        raise exception 'Reply must address a visible top-level reply in this discussion'; end if;
    end if;
    insert into public.bm_replies(thread_id,author_id,parent_reply_id,body) values(tid,auth.uid(),rid,btrim(payload->>'body')) returning id into rid;
    update public.bm_threads set last_activity_at=now() where id=tid;
    insert into public.bm_follows(user_id,thread_id) values(auth.uid(),tid) on conflict do nothing;
  elsif action='edit_reply' then
    if r.author_id<>auth.uid() or r.is_hidden or r.deleted_at is not null then raise exception 'Only the author can edit an active reply'; end if;
    update public.bm_replies set body=btrim(payload->>'body'),updated_at=now() where id=r.id;
  elsif action='delete_reply' then
    if r.author_id<>auth.uid() then raise exception 'Only the author can remove this reply'; end if;
    update public.bm_replies set deleted_at=now(),updated_at=now() where id=r.id;
  elsif action='delete_thread' then
    if t.author_id<>auth.uid() then raise exception 'Only the author can remove this discussion'; end if;
    update public.bm_threads set deleted_at=now(),updated_at=now() where id=tid;
  elsif action='status' then
    if t.author_id<>auth.uid() and not private.is_bm_moderator() then raise exception 'Author or moderator access required'; end if;
    new_status:=payload->>'status';
    if new_status not in ('open','answered','needs_clarification','archived') or new_status is null then raise exception 'Invalid discussion status'; end if;
    update public.bm_threads set status=new_status,updated_at=now() where id=tid;
    if private.is_bm_moderator() then insert into public.bm_moderation_log(actor_id,thread_id,action) values(auth.uid(),tid,'status:'||new_status); end if;
  elsif action in ('hide_thread','restore_thread','hide_reply','restore_reply') then
    if not private.is_bm_moderator() then raise exception 'Moderator access required'; end if;
    if action in ('hide_thread','restore_thread') then
      update public.bm_threads set is_hidden=(action='hide_thread'),updated_at=now() where id=tid;
    else update public.bm_replies set is_hidden=(action='hide_reply'),updated_at=now() where id=r.id; end if;
    insert into public.bm_moderation_log(actor_id,thread_id,reply_id,action) values(auth.uid(),tid,r.id,action);
  elsif action='follow' then
    if coalesce((payload->>'enabled')::boolean,true) then insert into public.bm_follows(user_id,thread_id) values(auth.uid(),tid) on conflict do nothing;
    else delete from public.bm_follows where user_id=auth.uid() and thread_id=tid; end if;
  elsif action='bookmark' then
    if coalesce((payload->>'enabled')::boolean,true) then insert into public.bm_bookmarks(user_id,thread_id) values(auth.uid(),tid) on conflict do nothing;
    else delete from public.bm_bookmarks where user_id=auth.uid() and thread_id=tid; end if;
  elsif action='report' then
    rid:=nullif(payload->>'reply_id','')::uuid;
    if rid is not null and not exists(select 1 from public.bm_replies where id=rid and thread_id=tid and not is_hidden and deleted_at is null) then raise exception 'Reply not found'; end if;
    insert into public.bm_reports(reporter_id,thread_id,reply_id,reason) values(auth.uid(),tid,rid,btrim(payload->>'reason'));
  else raise exception 'Unsupported Beis Midrash action'; end if;
  return jsonb_build_object('id',coalesce(rid,tid));
end;
$$;

notify pgrst,'reload schema';
commit;


-- Beis Midrash: required official links, named sections, and private resource attachments.
-- Apply after 202610230001. Existing discussions remain unchanged until edited.
begin;

create table public.bm_resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  thread_id uuid references public.bm_threads(id),
  file_name text not null check (length(file_name) between 1 and 180 and file_name !~ '[/\\\\[:cntrl:]]'),
  mime_type text not null check (mime_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','image/png','image/jpeg','image/webp')),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  check (storage_path=owner_id::text||'/'||id::text)
);
create index bm_resources_thread_idx on public.bm_resources(thread_id);
alter table public.bm_resources enable row level security;
revoke all on public.bm_resources from public,anon,authenticated;
grant select on public.bm_resources to authenticated;

create function private.bm_can_read_resource(object_name text) returns boolean
language sql stable security definer set search_path='' as $$
  select private.can_access_bm() and exists(
    select 1 from public.bm_resources a join public.bm_threads t on t.id=a.thread_id
    where a.storage_path=object_name and t.category='resources' and not t.is_hidden and t.deleted_at is null
      and private.bm_can_read_thread(t.id)
  );
$$;
create function private.bm_can_upload_resource(object_name text) returns boolean
language sql stable security definer set search_path='' as $$
  select private.can_access_bm() and exists(
    select 1 from public.bm_resources a where a.storage_path=object_name and a.owner_id=auth.uid()
      and a.thread_id is null and a.created_at>now()-interval '24 hours'
  );
$$;
create function private.bm_can_remove_upload(object_name text) returns boolean
language sql stable security definer set search_path='' as $$
  select private.can_access_bm() and exists(
    select 1 from public.bm_resources a where a.storage_path=object_name and a.owner_id=auth.uid() and a.thread_id is null
  );
$$;
revoke all on function private.bm_can_read_resource(text), private.bm_can_upload_resource(text), private.bm_can_remove_upload(text) from public,anon;
grant execute on function private.bm_can_read_resource(text), private.bm_can_upload_resource(text), private.bm_can_remove_upload(text) to authenticated;
create policy bm_resource_metadata_read on public.bm_resources for select to authenticated
  using (private.bm_can_read_resource(storage_path) or (private.can_access_bm() and owner_id=auth.uid() and thread_id is null));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values (
  'bm-resources','bm-resources',false,10485760,array['application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','image/png','image/jpeg','image/webp']
);
create policy bm_resource_download on storage.objects for select to authenticated
  using (bucket_id='bm-resources' and (private.bm_can_read_resource(name) or private.bm_can_remove_upload(name)));
create policy bm_resource_upload on storage.objects for insert to authenticated
  with check (bucket_id='bm-resources' and private.bm_can_upload_resource(name));
create policy bm_resource_remove_pending on storage.objects for delete to authenticated
  using (bucket_id='bm-resources' and private.bm_can_remove_upload(name));
-- No UPDATE policy: uploads are immutable; never upsert over published files.

create function public.bm_prepare_resource(file_name text,mime_type text,byte_size bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare resource public.bm_resources; resource_id uuid:=gen_random_uuid(); extension text;
begin
  if not private.can_access_bm() then raise exception 'Rabbi access required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,2401));
  if (select count(*) from public.bm_resources a where a.owner_id=auth.uid() and a.thread_id is null)>=20 then
    raise exception 'Too many unfinished uploads. Remove unused attachments before adding more';
  end if;
  extension:=lower(substring($1 from '\.([^.]+)$'));
  if not coalesce(($2='application/pdf' and extension='pdf')
    or ($2='application/vnd.openxmlformats-officedocument.wordprocessingml.document' and extension='docx')
    or ($2='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and extension='xlsx')
    or ($2='application/vnd.openxmlformats-officedocument.presentationml.presentation' and extension='pptx')
    or ($2='text/plain' and extension='txt') or ($2='image/png' and extension='png')
    or ($2='image/jpeg' and extension in ('jpg','jpeg')) or ($2='image/webp' and extension='webp'),false) then
    raise exception 'Choose a PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG, or WebP file';
  end if;
  insert into public.bm_resources(id,owner_id,file_name,mime_type,byte_size,storage_path)
    values(resource_id,auth.uid(),$1,$2,$3,auth.uid()::text||'/'||resource_id::text) returning * into resource;
  return to_jsonb(resource);
end;
$$;
create function public.bm_discard_resource(resource_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.can_access_bm() then raise exception 'Rabbi access required'; end if;
  delete from public.bm_resources a where a.id=resource_id and a.owner_id=auth.uid() and a.thread_id is null
    and not exists(select 1 from storage.objects o where o.bucket_id='bm-resources' and o.name=a.storage_path);
end;
$$;
revoke all on function public.bm_prepare_resource(text,text,bigint), public.bm_discard_resource(uuid) from public,anon;
grant execute on function public.bm_prepare_resource(text,text,bigint), public.bm_discard_resource(uuid) to authenticated;

create or replace function public.bm_get_thread(target_thread_id uuid, reply_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.bm_can_read_thread(target_thread_id) then raise exception 'Discussion not found or access denied'; end if;
  -- Mark only the followed thread that is actually being read.
  if greatest(0,reply_offset)+50 >= (select count(*) from public.bm_replies r where r.thread_id=target_thread_id
    and not r.is_hidden and r.deleted_at is null) then
    update public.bm_follows set last_read_at=now() where thread_id=target_thread_id and user_id=auth.uid();
  end if;
  select jsonb_build_object('thread',to_jsonb(t)||jsonb_build_object('author_name',p.full_name),
    'chunks',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'code',c.chunk_code,'title',c.chunk_title,'section',c.section_key,'source_type',c.source_type,'section_title',c.section_title,'workbook_title',c.workbook_title))
      from public.bm_thread_chunks j join public.content_chunks c on c.id=j.content_chunk_id where j.thread_id=t.id),'[]'),
    'resources',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'file_name',a.file_name,'storage_path',a.storage_path,'mime_type',a.mime_type,'byte_size',a.byte_size) order by a.created_at,a.id)
      from public.bm_resources a where a.thread_id=t.id and t.category='resources' and not t.is_hidden and t.deleted_at is null),'[]'),
    'replies',coalesce((select jsonb_agg(to_jsonb(r)) from (
      select r.*,p.full_name as author_name,pp.full_name as parent_author_name
      from public.bm_replies r join public.profiles p on p.id=r.author_id
      left join public.bm_replies parent on parent.id=r.parent_reply_id left join public.profiles pp on pp.id=parent.author_id
      where r.thread_id=t.id and ((not r.is_hidden and r.deleted_at is null) or private.is_bm_moderator())
      order by r.created_at,r.id limit 50 offset greatest(0,least(10000,reply_offset))
    ) r),'[]'),
    'reply_total',(select count(*) from public.bm_replies r where r.thread_id=t.id and ((not r.is_hidden and r.deleted_at is null) or private.is_bm_moderator())),
    'following',exists(select 1 from public.bm_follows f where f.thread_id=t.id and f.user_id=auth.uid()),
    'bookmarked',exists(select 1 from public.bm_bookmarks b where b.thread_id=t.id and b.user_id=auth.uid()),
    'moderator',private.is_bm_moderator()) into result
  from public.bm_threads t join public.profiles p on p.id=t.author_id where t.id=target_thread_id;
  return result;
end;
$$;

create or replace function public.bm_find_material(search_text text default '', target_program text default null, material_type text default 'notes')
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.can_access_bm() then raise exception 'Rabbi access required'; end if;
  if material_type is null or material_type not in ('notes','qa','all') then raise exception 'Invalid material type'; end if;
  return coalesce((select jsonb_agg(to_jsonb(c)) from (
    select c.id,c.chunk_code as code,c.chunk_title as title,c.section_key as section,c.program_id,c.source_type,c.section_title,c.workbook_title
    from public.content_chunks c where c.source_type in ('notes','qa')
      and (material_type='all' or c.source_type::text=material_type)
      and private.can_access_learning_program(c.program_id)
      and (target_program is null or c.program_id=target_program)
      and position(lower(left(coalesce(search_text,''),200)) in lower(c.chunk_code||' '||c.chunk_title||' '||coalesce(c.section_title,'')||' '||coalesce(c.workbook_title,'')))>0
    order by c.program_id,c.workbook_title,c.section_key,c.sort_order,c.id limit 1000
  ) c),'[]');
end;
$$;
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
      insert into public.bm_threads(author_id,title,body,category,program_id,language)
      values(auth.uid(),btrim(payload->>'title'),btrim(payload->>'body'),payload->>'category',pid,coalesce(payload->>'language','mixed')) returning id into tid;
      insert into public.bm_follows(user_id,thread_id) values(auth.uid(),tid);
    else
      select * into t from public.bm_threads where id=target_id for update;
      if not found or not private.bm_can_read_thread(target_id) or t.author_id<>auth.uid() or t.deleted_at is not null or t.is_hidden then
        raise exception 'Only the author can edit an active discussion'; end if;
      tid:=t.id;
      update public.bm_threads set title=btrim(payload->>'title'),body=btrim(payload->>'body'),category=payload->>'category',
        program_id=pid,language=coalesce(payload->>'language','mixed'),updated_at=now() where id=tid;
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


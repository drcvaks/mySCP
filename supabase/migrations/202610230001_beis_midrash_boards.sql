-- Run after 202610220001. Keep all existing discussions and stable material links.
begin;

alter table public.bm_threads drop constraint bm_threads_category_check;
alter table public.bm_threads add constraint bm_threads_category_check
  check (category in ('torah','notes','questions','teaching','resources','program','general'));

create or replace function public.bm_list_threads(filters jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; page_offset integer:=greatest(0,least(10000,coalesce((filters->>'offset')::integer,0)));
begin
  if not private.can_access_bm() then raise exception 'Rabbi access required'; end if;
  if length(coalesce(filters->>'search',''))>200 then raise exception 'Search is too long'; end if;
  with visible as (
    select t.*,p.full_name as author_name,
      (select count(*) from public.bm_replies r where r.thread_id=t.id and not r.is_hidden and r.deleted_at is null) as reply_count,
      exists(select 1 from public.bm_follows f where f.thread_id=t.id and f.user_id=auth.uid()) as following,
      exists(select 1 from public.bm_bookmarks b where b.thread_id=t.id and b.user_id=auth.uid()) as bookmarked,
      exists(select 1 from public.bm_follows f join public.bm_replies r on r.thread_id=f.thread_id
        where f.user_id=auth.uid() and f.thread_id=t.id and r.created_at>f.last_read_at
        and r.author_id<>auth.uid() and not r.is_hidden and r.deleted_at is null) as unread,
      coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'code',c.chunk_code,'title',c.chunk_title,'section',c.section_key,'source_type',c.source_type))
        from public.bm_thread_chunks j join public.content_chunks c on c.id=j.content_chunk_id where j.thread_id=t.id),'[]') as chunks
    from public.bm_threads t join public.profiles p on p.id=t.author_id
    where private.bm_can_read_thread(t.id)
      and (coalesce(filters->>'program','all')='all' or (filters->>'program'='general' and t.program_id is null) or t.program_id=filters->>'program')
      and (coalesce(filters->>'category','all')='all' or t.category=filters->>'category')
      and (case coalesce(filters->>'area','all')
        when 'all' then true
        when 'message' then t.category in ('notes','questions','torah')
        when 'resources' then t.category='resources'
        when 'teaching' then t.category in ('teaching','program','general')
        else false end)
      and (coalesce(filters->>'status','all')='all' or t.status=filters->>'status')
      and (coalesce(filters->>'author','')='' or position(lower(filters->>'author') in lower(p.full_name))>0)
      and (coalesce(filters->>'section','')='' or exists(select 1 from public.bm_thread_chunks j join public.content_chunks c on c.id=j.content_chunk_id
        where j.thread_id=t.id and c.section_key=filters->>'section'))
      and (coalesce(filters->>'chunk','')='' or exists(select 1 from public.bm_thread_chunks j where j.thread_id=t.id and j.content_chunk_id::text=filters->>'chunk'))
      and (coalesce(filters->>'search','')='' or position(lower(filters->>'search') in lower(t.title||' '||t.body))>0
        or exists(select 1 from public.bm_replies r where r.thread_id=t.id and not r.is_hidden and r.deleted_at is null
          and position(lower(filters->>'search') in lower(r.body))>0))
  ), matched as (
    select * from visible v where (coalesce(filters->>'saved','all')='all'
      or (filters->>'saved'='following' and v.following) or (filters->>'saved'='bookmarked' and v.bookmarked)
      or (filters->>'saved'='unread' and v.unread))
      and (coalesce(filters->>'unanswered','false')<>'true' or v.reply_count=0)
  ), paged as (
    select * from matched order by case when filters->>'sort'='newest' then created_at else last_activity_at end desc,id desc limit 25 offset page_offset
  )
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(paged)-'body'||jsonb_build_object('excerpt',left(body,220))) from paged),'[]'),
    'total',(select count(*) from matched),'moderator',private.is_bm_moderator()) into result;
  return result;
end;
$$;

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
    'chunks',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'code',c.chunk_code,'title',c.chunk_title,'section',c.section_key,'source_type',c.source_type))
      from public.bm_thread_chunks j join public.content_chunks c on c.id=j.content_chunk_id where j.thread_id=t.id),'[]'),
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

create function public.bm_find_material(search_text text default '', target_program text default null, material_type text default 'notes')
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.can_access_bm() then raise exception 'Rabbi access required'; end if;
  if material_type is null or material_type not in ('notes','qa','all') then raise exception 'Invalid material type'; end if;
  return coalesce((select jsonb_agg(to_jsonb(c)) from (
    select c.id,c.chunk_code as code,c.chunk_title as title,c.section_key as section,c.program_id,c.source_type
    from public.content_chunks c where c.source_type in ('notes','qa')
      and (material_type='all' or c.source_type::text=material_type)
      and private.can_access_learning_program(c.program_id)
      and (target_program is null or c.program_id=target_program)
      and position(lower(left(coalesce(search_text,''),200)) in lower(c.chunk_code||' '||c.chunk_title))>0
    order by c.program_id,c.section_key,c.sort_order,c.id limit 100
  ) c),'[]');
end;
$$;
revoke all on function public.bm_find_material(text,text,text) from public, anon;
grant execute on function public.bm_find_material(text,text,text) to authenticated;

create or replace function public.bm_mutate(action text, target_id uuid default null, payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare tid uuid; rid uuid; t public.bm_threads; r public.bm_replies; parent public.bm_replies;
  pid text; ids uuid[]; body_text text; new_status text;
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

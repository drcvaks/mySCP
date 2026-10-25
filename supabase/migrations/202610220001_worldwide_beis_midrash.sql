-- Phase 1 only. No existing chaburah content, packets, or file scopes are changed.
begin;

create table public.bm_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 160),
  body text not null check (length(btrim(body)) between 1 and 20000),
  category text not null check (category in ('torah','notes','teaching','resources','program','general')),
  program_id text references public.learning_programs(id),
  status text not null default 'open' check (status in ('open','answered','needs_clarification','archived')),
  language text not null default 'mixed' check (language in ('en','he','mixed')),
  is_hidden boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);
create table public.bm_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.bm_threads(id) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete restrict,
  parent_reply_id uuid references public.bm_replies(id) on delete restrict,
  body text not null check (length(btrim(body)) between 1 and 20000),
  is_hidden boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.bm_thread_chunks (
  thread_id uuid not null references public.bm_threads(id) on delete restrict,
  content_chunk_id uuid not null references public.content_chunks(id) on delete restrict,
  primary key(thread_id, content_chunk_id)
);
create index bm_chunk_threads on public.bm_thread_chunks(content_chunk_id);
create index bm_threads_program_activity on public.bm_threads(program_id,last_activity_at desc,id);
create index bm_threads_category_activity on public.bm_threads(category,last_activity_at desc,id);
create index bm_threads_status_activity on public.bm_threads(status,last_activity_at desc,id);
create index bm_thread_replies on public.bm_replies(thread_id,created_at,id);
create index bm_thread_author_rate on public.bm_threads(author_id,created_at);
create index bm_reply_author_rate on public.bm_replies(author_id,created_at);
create table public.bm_follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  thread_id uuid not null references public.bm_threads(id) on delete restrict,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key(user_id,thread_id)
);
create table public.bm_bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  thread_id uuid not null references public.bm_threads(id) on delete restrict,
  primary key(user_id,thread_id)
);
create table public.bm_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  thread_id uuid not null references public.bm_threads(id) on delete restrict,
  reply_id uuid references public.bm_replies(id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 1 and 2000),
  status text not null default 'open' check (status in ('open','reviewed')),
  handled_by uuid references public.profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index bm_open_reports on public.bm_reports(status,created_at);
create index bm_report_author_rate on public.bm_reports(reporter_id,created_at);
create table public.bm_moderation_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  thread_id uuid not null references public.bm_threads(id) on delete restrict,
  reply_id uuid references public.bm_replies(id),
  action text not null,
  created_at timestamptz not null default now()
);

-- Global Rabbi approval and an active Rabbi assignment are both required.
-- This deliberately does not depend on the currently selected chaburah.
create function private.can_access_bm() returns boolean
language sql stable security definer set search_path='' as $$
  select private.is_global_admin() or exists (
    select 1 from public.profiles p join public.chaburah_members m on m.user_id=p.id
    where p.id=(select auth.uid()) and p.role='local_rabbi'
      and m.status='active' and m.member_role='rabbi'
  );
$$;
create function private.is_bm_moderator() returns boolean
language sql stable security definer set search_path='' as $$ select private.is_global_admin(); $$;
create function private.bm_can_read_thread(tid uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select private.can_access_bm() and exists (
    select 1 from public.bm_threads t where t.id=tid
      and ((not t.is_hidden and t.deleted_at is null) or private.is_bm_moderator())
      and (t.program_id is null or private.can_access_learning_program(t.program_id))
      and not exists (
        select 1 from public.bm_thread_chunks j join public.content_chunks c on c.id=j.content_chunk_id
        where j.thread_id=t.id and not private.can_access_learning_program(c.program_id)
      )
  );
$$;
revoke all on function private.can_access_bm(), private.is_bm_moderator(), private.bm_can_read_thread(uuid) from public;
grant execute on function private.can_access_bm(), private.is_bm_moderator(), private.bm_can_read_thread(uuid) to authenticated;

alter table public.bm_threads enable row level security;
alter table public.bm_replies enable row level security;
alter table public.bm_thread_chunks enable row level security;
alter table public.bm_follows enable row level security;
alter table public.bm_bookmarks enable row level security;
alter table public.bm_reports enable row level security;
alter table public.bm_moderation_log enable row level security;
revoke all on public.bm_threads, public.bm_replies, public.bm_thread_chunks,
  public.bm_follows, public.bm_bookmarks, public.bm_reports, public.bm_moderation_log from public, anon, authenticated;
grant select on public.bm_threads, public.bm_replies, public.bm_thread_chunks,
  public.bm_follows, public.bm_bookmarks, public.bm_reports, public.bm_moderation_log to authenticated;
create policy bm_threads_read on public.bm_threads for select to authenticated using (private.bm_can_read_thread(id));
create policy bm_replies_read on public.bm_replies for select to authenticated using (
  private.bm_can_read_thread(thread_id) and ((not is_hidden and deleted_at is null) or private.is_bm_moderator()));
create policy bm_chunks_read on public.bm_thread_chunks for select to authenticated using (private.bm_can_read_thread(thread_id));
create policy bm_follows_read on public.bm_follows for select to authenticated using (
  user_id=(select auth.uid()) and private.bm_can_read_thread(thread_id));
create policy bm_bookmarks_read on public.bm_bookmarks for select to authenticated using (
  user_id=(select auth.uid()) and private.bm_can_read_thread(thread_id));
create policy bm_reports_read on public.bm_reports for select to authenticated using (
  private.can_access_bm() and (reporter_id=(select auth.uid()) or private.is_bm_moderator()));
create policy bm_audit_read on public.bm_moderation_log for select to authenticated using (private.is_bm_moderator());

-- Privacy-safe author names are returned here; existing profile grants stay unchanged.
create function public.bm_list_threads(filters jsonb default '{}'::jsonb) returns jsonb
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
      coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'code',c.chunk_code,'title',c.chunk_title,'section',c.section_key))
        from public.bm_thread_chunks j join public.content_chunks c on c.id=j.content_chunk_id where j.thread_id=t.id),'[]') as chunks
    from public.bm_threads t join public.profiles p on p.id=t.author_id
    where private.bm_can_read_thread(t.id)
      and (coalesce(filters->>'program','all')='all' or (filters->>'program'='general' and t.program_id is null) or t.program_id=filters->>'program')
      and (coalesce(filters->>'category','all')='all' or t.category=filters->>'category')
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

create function public.bm_get_thread(target_thread_id uuid, reply_offset integer default 0) returns jsonb
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
    'chunks',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'code',c.chunk_code,'title',c.chunk_title,'section',c.section_key))
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

create function public.bm_list_reports() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_bm_moderator() then raise exception 'Moderator access required'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r)) from (
    select r.*,t.title from public.bm_reports r join public.bm_threads t on t.id=r.thread_id
    where r.status='open' order by r.created_at limit 100
  ) r),'[]');
end;
$$;

create function public.bm_find_chunks(search_text text default '', target_program text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.can_access_bm() then raise exception 'Rabbi access required'; end if;
  return coalesce((select jsonb_agg(to_jsonb(c)) from (
    select c.id,c.chunk_code as code,c.chunk_title as title,c.section_key as section,c.program_id
    from public.content_chunks c where c.source_type='notes' and private.can_access_learning_program(c.program_id)
      and (target_program is null or c.program_id=target_program)
      and position(lower(left(coalesce(search_text,''),200)) in lower(c.chunk_code||' '||c.chunk_title))>0
    order by c.program_id,c.sort_order,c.id limit 100
  ) c),'[]');
end;
$$;

-- All mutations are allowlisted; clients cannot set author, hidden flags, or approvals.
create function public.bm_mutate(action text, target_id uuid default null, payload jsonb default '{}'::jsonb) returns jsonb
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
      and c.source_type='notes' and private.can_access_learning_program(c.program_id)
      and (pid is null or c.program_id=pid))<>cardinality(ids) then raise exception 'Invalid or inaccessible Notes chunks'; end if;
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
revoke all on function public.bm_list_threads(jsonb), public.bm_get_thread(uuid,integer), public.bm_list_reports(), public.bm_find_chunks(text,text), public.bm_mutate(text,uuid,jsonb) from public, anon;
grant execute on function public.bm_list_threads(jsonb), public.bm_get_thread(uuid,integer), public.bm_list_reports(), public.bm_find_chunks(text,text), public.bm_mutate(text,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;

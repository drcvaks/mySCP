-- Checkpoint 6: discussion unread tracking.
-- This uses normal database reads/writes, not Supabase Realtime subscriptions.

create table if not exists public.discussion_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chaburah_id uuid not null references public.chaburos(id) on delete cascade,
  last_read_at timestamptz not null default 'epoch'::timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, chaburah_id)
);

create index if not exists discussion_reads_chaburah_idx
  on public.discussion_reads (chaburah_id);

drop trigger if exists discussion_reads_set_updated_at on public.discussion_reads;
create trigger discussion_reads_set_updated_at
before update on public.discussion_reads
for each row execute function private.set_updated_at();

alter table public.discussion_reads enable row level security;

revoke all on public.discussion_reads from anon, authenticated;
grant select, insert, update on public.discussion_reads to authenticated;

drop policy if exists discussion_reads_select_self on public.discussion_reads;
create policy discussion_reads_select_self
on public.discussion_reads
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
);

drop policy if exists discussion_reads_insert_self on public.discussion_reads;
create policy discussion_reads_insert_self
on public.discussion_reads
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_active_chaburah_member(chaburah_id)
);

drop policy if exists discussion_reads_update_self on public.discussion_reads;
create policy discussion_reads_update_self
on public.discussion_reads
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and private.is_active_chaburah_member(chaburah_id)
);

create or replace function public.count_unread_discussion_messages(target_chaburah_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.discussion_messages message
  where message.chaburah_id = target_chaburah_id
    and message.status = 'active'
    and message.author_id <> (select auth.uid())
    and private.is_active_chaburah_member(target_chaburah_id)
    and message.created_at > coalesce(
      (
        select read_state.last_read_at
        from public.discussion_reads read_state
        where read_state.user_id = (select auth.uid())
          and read_state.chaburah_id = target_chaburah_id
      ),
      'epoch'::timestamptz
    );
$$;

create or replace function public.mark_discussion_read(target_chaburah_id uuid)
returns public.discussion_reads
language plpgsql
security definer
set search_path = ''
as $$
declare
  read_state public.discussion_reads;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not private.is_active_chaburah_member(target_chaburah_id) then
    raise exception 'Active chaburah membership required';
  end if;

  insert into public.discussion_reads (
    user_id,
    chaburah_id,
    last_read_at
  )
  values (
    (select auth.uid()),
    target_chaburah_id,
    now()
  )
  on conflict (user_id, chaburah_id)
  do update set last_read_at = excluded.last_read_at
  returning *
  into read_state;

  return read_state;
end;
$$;

revoke all on function public.count_unread_discussion_messages(uuid) from public;
revoke all on function public.mark_discussion_read(uuid) from public;
grant execute on function public.count_unread_discussion_messages(uuid) to authenticated;
grant execute on function public.mark_discussion_read(uuid) to authenticated;

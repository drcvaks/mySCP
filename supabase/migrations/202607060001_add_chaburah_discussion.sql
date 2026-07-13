-- Checkpoint 6: chaburah discussion foundation.
-- Messages are stored as normal rows. Realtime can be added later on this table.

do $$
begin
  create type public.discussion_message_status as enum ('active', 'hidden', 'deleted');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.discussion_messages (
  id uuid primary key default gen_random_uuid(),
  chaburah_id uuid not null references public.chaburos(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_message_id uuid references public.discussion_messages(id) on delete set null,
  body text not null check (length(btrim(body)) > 0 and length(body) <= 4000),
  status public.discussion_message_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists discussion_messages_chaburah_created_idx
  on public.discussion_messages (chaburah_id, created_at desc);

create index if not exists discussion_messages_author_idx
  on public.discussion_messages (author_id);

drop trigger if exists discussion_messages_set_updated_at on public.discussion_messages;
create trigger discussion_messages_set_updated_at
before update on public.discussion_messages
for each row execute function private.set_updated_at();

alter table public.discussion_messages enable row level security;

revoke all on public.discussion_messages from anon, authenticated;
grant select, insert, update, delete on public.discussion_messages to authenticated;

drop policy if exists discussion_messages_select on public.discussion_messages;
create policy discussion_messages_select
on public.discussion_messages
for select
to authenticated
using (
  private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
  or (
    status = 'active'
    and private.is_active_chaburah_member(chaburah_id)
  )
);

drop policy if exists discussion_messages_insert on public.discussion_messages;
create policy discussion_messages_insert
on public.discussion_messages
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'active'
  and exists (
    select 1
    from public.chaburos chaburah
    where chaburah.id = chaburah_id
      and chaburah.status = 'active'
      and chaburah.discussion_enabled = true
  )
  and (
    private.is_active_chaburah_member(chaburah_id)
    or private.can_manage_chaburah(chaburah_id)
  )
);

drop policy if exists discussion_messages_update_managers on public.discussion_messages;
create policy discussion_messages_update_managers
on public.discussion_messages
for update
to authenticated
using (
  private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
)
with check (
  private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
);

drop policy if exists discussion_messages_delete_managers on public.discussion_messages;
create policy discussion_messages_delete_managers
on public.discussion_messages
for delete
to authenticated
using (
  private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
);

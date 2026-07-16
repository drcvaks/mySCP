-- Checkpoint 7: temporary beta tester support.
-- Adds feedback and checklist progress tables without seed data.

do $$
begin
  create type public.beta_feedback_category as enum ('liked', 'confusing', 'improvement', 'praise');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  category public.beta_feedback_category not null,
  body text not null check (length(btrim(body)) > 0 and length(body) <= 4000),
  platform text not null default 'unknown' check (platform in ('web', 'android', 'ios', 'unknown')),
  screen_name text check (screen_name is null or length(screen_name) <= 120),
  admin_response text check (admin_response is null or length(admin_response) <= 4000),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beta_feedback_created_idx
  on public.beta_feedback (created_at desc);

create index if not exists beta_feedback_category_idx
  on public.beta_feedback (category, created_at desc);

create index if not exists beta_feedback_reviewed_idx
  on public.beta_feedback (reviewed_at, created_at desc);

drop trigger if exists beta_feedback_set_updated_at on public.beta_feedback;
create trigger beta_feedback_set_updated_at
before update on public.beta_feedback
for each row execute function private.set_updated_at();

create table if not exists public.beta_checklist_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_key text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, task_key),
  check (length(task_key) between 1 and 120)
);

create index if not exists beta_checklist_progress_user_idx
  on public.beta_checklist_progress (user_id, updated_at desc);

drop trigger if exists beta_checklist_progress_set_updated_at on public.beta_checklist_progress;
create trigger beta_checklist_progress_set_updated_at
before update on public.beta_checklist_progress
for each row execute function private.set_updated_at();

alter table public.beta_feedback enable row level security;
alter table public.beta_checklist_progress enable row level security;

revoke all on public.beta_feedback from anon, authenticated;
revoke all on public.beta_checklist_progress from anon, authenticated;
grant select, insert, update on public.beta_feedback to authenticated;
grant select, insert, update, delete on public.beta_checklist_progress to authenticated;

drop policy if exists beta_feedback_select_authenticated on public.beta_feedback;
create policy beta_feedback_select_authenticated
on public.beta_feedback
for select
to authenticated
using (true);

drop policy if exists beta_feedback_insert_self on public.beta_feedback;
create policy beta_feedback_insert_self
on public.beta_feedback
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists beta_feedback_update_admins on public.beta_feedback;
create policy beta_feedback_update_admins
on public.beta_feedback
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role in ('local_rabbi', 'local_admin', 'global_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role in ('local_rabbi', 'local_admin', 'global_admin')
  )
);

drop policy if exists beta_checklist_select_self on public.beta_checklist_progress;
create policy beta_checklist_select_self
on public.beta_checklist_progress
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists beta_checklist_insert_self on public.beta_checklist_progress;
create policy beta_checklist_insert_self
on public.beta_checklist_progress
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists beta_checklist_update_self on public.beta_checklist_progress;
create policy beta_checklist_update_self
on public.beta_checklist_progress
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists beta_checklist_delete_self on public.beta_checklist_progress;
create policy beta_checklist_delete_self
on public.beta_checklist_progress
for delete
to authenticated
using (user_id = (select auth.uid()));

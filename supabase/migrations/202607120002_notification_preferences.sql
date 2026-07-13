-- Checkpoint 6: user notification preferences.
-- These preferences are stored now; actual email/in-app delivery can be wired later.

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  review_questions_email boolean not null default true,
  review_questions_in_app boolean not null default true,
  discussion_posts_email boolean not null default false,
  discussion_posts_in_app boolean not null default true,
  rabbi_answers_email boolean not null default true,
  rabbi_answers_in_app boolean not null default true,
  uploads_email boolean not null default false,
  uploads_in_app boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function private.set_updated_at();

alter table public.notification_preferences enable row level security;

revoke all on public.notification_preferences from anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

drop policy if exists notification_preferences_select_self on public.notification_preferences;
create policy notification_preferences_select_self
on public.notification_preferences
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists notification_preferences_insert_self on public.notification_preferences;
create policy notification_preferences_insert_self
on public.notification_preferences
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists notification_preferences_update_self on public.notification_preferences;
create policy notification_preferences_update_self
on public.notification_preferences
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

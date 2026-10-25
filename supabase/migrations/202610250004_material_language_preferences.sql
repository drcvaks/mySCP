begin;

create table public.material_language_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'en' check (language in ('en', 'he'))
);

alter table public.material_language_preferences enable row level security;

create policy material_language_preferences_read
  on public.material_language_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy material_language_preferences_insert
  on public.material_language_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy material_language_preferences_update
  on public.material_language_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.material_language_preferences from anon, authenticated;
grant select, insert, update on public.material_language_preferences to authenticated;

commit;

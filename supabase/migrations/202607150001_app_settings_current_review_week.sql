-- Checkpoint 7: Global Admin controlled app settings.
-- Stores the current review week in Supabase so it can be changed without a code edit.

create table if not exists public.app_settings (
  id boolean primary key default true check (id = true),
  current_review_week smallint not null default 12 check (current_review_week between 1 and 52),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, current_review_week)
values (true, 12)
on conflict (id) do nothing;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function private.set_updated_at();

alter table public.app_settings enable row level security;

revoke all on public.app_settings from anon, authenticated;
grant select, update on public.app_settings to authenticated;

drop policy if exists app_settings_select_authenticated on public.app_settings;
create policy app_settings_select_authenticated
on public.app_settings
for select
to authenticated
using (true);

drop policy if exists app_settings_update_global_admin on public.app_settings;
create policy app_settings_update_global_admin
on public.app_settings
for update
to authenticated
using (private.is_global_admin())
with check (private.is_global_admin());

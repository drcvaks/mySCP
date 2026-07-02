-- Capture signup city metadata in public.profiles.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, city)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'city', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set
    email = coalesce(new.email, ''),
    full_name = coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      full_name
    ),
    city = coalesce(
      nullif(new.raw_user_meta_data ->> 'city', ''),
      city
    )
  where id = new.id;

  return new;
end;
$$;

revoke all on function public.handle_user_updated() from public;

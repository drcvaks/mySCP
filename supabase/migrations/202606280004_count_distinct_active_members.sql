-- Count unique active users per chaburah, defensively ignoring duplicate active rows.

create or replace function private.refresh_chaburah_member_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_chaburah_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_chaburah_id := old.chaburah_id;
  else
    affected_chaburah_id := new.chaburah_id;
  end if;

  update public.chaburos
  set member_count = (
    select count(distinct membership.user_id)::integer
    from public.chaburah_members membership
    join public.profiles profile
      on profile.id = membership.user_id
    where membership.chaburah_id = affected_chaburah_id
      and membership.status = 'active'
  )
  where id = affected_chaburah_id;

  if tg_op = 'UPDATE' and old.chaburah_id <> new.chaburah_id then
    update public.chaburos
    set member_count = (
      select count(distinct membership.user_id)::integer
      from public.chaburah_members membership
      join public.profiles profile
        on profile.id = membership.user_id
      where membership.chaburah_id = old.chaburah_id
        and membership.status = 'active'
    )
    where id = old.chaburah_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

update public.chaburos chaburah
set member_count = (
  select count(distinct membership.user_id)::integer
  from public.chaburah_members membership
  join public.profiles profile
    on profile.id = membership.user_id
  where membership.chaburah_id = chaburah.id
    and membership.status = 'active'
);

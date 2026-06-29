-- Treat joining/changing chaburah as leaving other participant chaburos.

create or replace function public.join_chaburah(target_chaburah_id uuid)
returns public.membership_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status public.membership_status;
  existing_role public.membership_role;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select
    case
      when chaburah.join_requires_approval then 'pending'::public.membership_status
      else 'active'::public.membership_status
    end
  into target_status
  from public.chaburos chaburah
  where chaburah.id = target_chaburah_id
    and chaburah.status = 'active';

  if target_status is null then
    raise exception 'Chaburah not found or inactive';
  end if;

  select membership.member_role
  into existing_role
  from public.chaburah_members membership
  where membership.user_id = (select auth.uid())
    and membership.chaburah_id = target_chaburah_id;

  update public.chaburah_members
  set
    status = 'left'::public.membership_status,
    updated_at = now()
  where user_id = (select auth.uid())
    and chaburah_id <> target_chaburah_id
    and member_role = 'participant'
    and status in ('pending', 'active');

  insert into public.chaburah_members (
    user_id,
    chaburah_id,
    member_role,
    status
  )
  values (
    (select auth.uid()),
    target_chaburah_id,
    coalesce(existing_role, 'participant'::public.membership_role),
    target_status
  )
  on conflict (user_id, chaburah_id)
  do update set
    status = case
      when public.chaburah_members.member_role in ('rabbi', 'admin')
        then 'active'::public.membership_status
      else excluded.status
    end,
    updated_at = now();

  select membership.status
  into target_status
  from public.chaburah_members membership
  where membership.user_id = (select auth.uid())
    and membership.chaburah_id = target_chaburah_id;

  if target_status = 'active' then
    update public.profiles
    set current_chaburah_id = target_chaburah_id
    where id = (select auth.uid());
  else
    update public.profiles
    set current_chaburah_id = null
    where id = (select auth.uid());
  end if;

  return target_status;
end;
$$;

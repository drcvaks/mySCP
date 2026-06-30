-- Manage existing chaburah members from the Admin screen.

create or replace function public.update_membership_status(
  target_membership_id uuid,
  new_status public.membership_status
)
returns public.chaburah_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership_record public.chaburah_members;
begin
  if new_status not in (
    'active'::public.membership_status,
    'suspended'::public.membership_status,
    'left'::public.membership_status
  ) then
    raise exception 'Unsupported membership status';
  end if;

  select *
  into membership_record
  from public.chaburah_members membership
  where membership.id = target_membership_id
  for update;

  if not found then
    raise exception 'Membership not found';
  end if;

  if not (
    private.is_global_admin()
    or private.can_manage_chaburah(membership_record.chaburah_id)
  ) then
    raise exception 'Chaburah manager access required';
  end if;

  if membership_record.member_role <> 'participant'::public.membership_role then
    raise exception 'Leadership memberships are managed through the leadership assignment tools';
  end if;

  update public.chaburah_members
  set
    status = new_status,
    updated_at = now()
  where id = target_membership_id
  returning *
  into membership_record;

  if new_status = 'active'::public.membership_status then
    update public.profiles
    set current_chaburah_id = membership_record.chaburah_id
    where id = membership_record.user_id;
  elsif new_status in ('suspended'::public.membership_status, 'left'::public.membership_status) then
    update public.profiles
    set current_chaburah_id = null
    where id = membership_record.user_id
      and current_chaburah_id = membership_record.chaburah_id;
  end if;

  return membership_record;
end;
$$;

revoke all on function public.update_membership_status(uuid, public.membership_status) from public;
grant execute on function public.update_membership_status(uuid, public.membership_status) to authenticated;

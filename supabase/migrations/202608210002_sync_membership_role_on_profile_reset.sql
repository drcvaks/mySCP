-- Keep chaburah membership labels in sync when a global admin resets a user
-- back to participant.

create or replace function public.admin_set_user_role(
  target_user_id uuid,
  new_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_global_admin() then
    raise exception 'Global admin access required';
  end if;

  update public.profiles
  set role = new_role
  where id = target_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  if new_role = 'participant'::public.app_role then
    update public.chaburah_members
    set
      member_role = 'participant'::public.membership_role,
      updated_at = now()
    where user_id = target_user_id
      and member_role in ('rabbi'::public.membership_role, 'admin'::public.membership_role);
  end if;
end;
$$;

-- Repair any existing members already reset to participant while still labeled
-- as chaburah leadership.
update public.chaburah_members membership
set
  member_role = 'participant'::public.membership_role,
  updated_at = now()
from public.profiles profile
where profile.id = membership.user_id
  and profile.role = 'participant'::public.app_role
  and membership.member_role in ('rabbi'::public.membership_role, 'admin'::public.membership_role);

revoke all on function public.admin_set_user_role(uuid, public.app_role) from public;
grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;

-- Assign a local rabbi or admin to a chaburah and keep the profile role in sync.

create or replace function public.assign_chaburah_leader(
  target_chaburah_id uuid,
  target_user_email text,
  target_member_role public.membership_role
)
returns public.chaburah_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile_id uuid;
  assigned_membership public.chaburah_members;
begin
  if not private.is_global_admin() then
    raise exception 'Global admin access required';
  end if;

  if target_member_role not in ('rabbi'::public.membership_role, 'admin'::public.membership_role) then
    raise exception 'Only rabbi or admin leadership roles can be assigned here';
  end if;

  select profile.id
  into target_profile_id
  from public.profiles profile
  where lower(profile.email) = lower(btrim(target_user_email));

  if target_profile_id is null then
    raise exception 'Profile not found for email %', target_user_email;
  end if;

  insert into public.chaburah_members (
    user_id,
    chaburah_id,
    member_role,
    status
  )
  values (
    target_profile_id,
    target_chaburah_id,
    target_member_role,
    'active'::public.membership_status
  )
  on conflict (user_id, chaburah_id)
  do update set
    member_role = excluded.member_role,
    status = 'active'::public.membership_status,
    updated_at = now()
  returning *
  into assigned_membership;

  update public.profiles
  set
    role = case
      when target_member_role = 'rabbi'::public.membership_role then 'local_rabbi'::public.app_role
      else 'local_admin'::public.app_role
    end,
    current_chaburah_id = target_chaburah_id
  where id = target_profile_id;

  return assigned_membership;
end;
$$;

revoke all on function public.assign_chaburah_leader(uuid, text, public.membership_role) from public;
grant execute on function public.assign_chaburah_leader(uuid, text, public.membership_role) to authenticated;

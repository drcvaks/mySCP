-- Read-only member directory for the My Chaburah screen.
-- Returns display-safe active member details without exposing email addresses.

create or replace function public.list_chaburah_member_directory(target_chaburah_id uuid)
returns table (
  id uuid,
  user_id uuid,
  chaburah_id uuid,
  member_role public.membership_role,
  joined_at timestamptz,
  full_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    membership.id,
    membership.user_id,
    membership.chaburah_id,
    membership.member_role,
    membership.joined_at,
    profile.full_name
  from public.chaburah_members membership
  join public.profiles profile
    on profile.id = membership.user_id
  where membership.chaburah_id = target_chaburah_id
    and membership.status = 'active'
    and (
      private.is_global_admin()
      or private.can_manage_chaburah(target_chaburah_id)
      or private.is_active_chaburah_member(target_chaburah_id)
    )
  order by
    case membership.member_role
      when 'rabbi'::public.membership_role then 1
      when 'admin'::public.membership_role then 2
      else 3
    end,
    profile.full_name;
$$;

revoke all on function public.list_chaburah_member_directory(uuid) from public;
grant execute on function public.list_chaburah_member_directory(uuid) to authenticated;

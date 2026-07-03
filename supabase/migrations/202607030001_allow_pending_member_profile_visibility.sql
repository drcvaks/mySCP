-- Let chaburah managers see profile basics for pending join requests.

create or replace function private.can_view_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id = (select auth.uid())
    or private.is_global_admin()
    or exists (
      select 1
      from public.chaburah_members target_membership
      join public.chaburah_members manager_membership
        on manager_membership.chaburah_id = target_membership.chaburah_id
      where target_membership.user_id = target_user_id
        and target_membership.status in ('active', 'pending')
        and manager_membership.user_id = (select auth.uid())
        and manager_membership.status = 'active'
        and manager_membership.member_role in ('rabbi', 'admin')
    );
$$;

grant execute on function private.can_view_profile(uuid) to authenticated;

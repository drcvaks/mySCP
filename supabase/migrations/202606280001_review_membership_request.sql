-- Approve or reject pending chaburah membership requests.

create or replace function public.review_membership_request(
  target_membership_id uuid,
  approve_request boolean
)
returns public.chaburah_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership_record public.chaburah_members;
begin
  select *
  into membership_record
  from public.chaburah_members membership
  where membership.id = target_membership_id
    and membership.status = 'pending'
  for update;

  if not found then
    raise exception 'Pending membership request not found';
  end if;

  if not (
    private.is_global_admin()
    or private.can_manage_chaburah(membership_record.chaburah_id)
  ) then
    raise exception 'Chaburah manager access required';
  end if;

  update public.chaburah_members
  set
    status = case
      when approve_request then 'active'::public.membership_status
      else 'left'::public.membership_status
    end,
    updated_at = now()
  where id = target_membership_id
  returning *
  into membership_record;

  if approve_request then
    update public.profiles
    set current_chaburah_id = membership_record.chaburah_id
    where id = membership_record.user_id;
  end if;

  return membership_record;
end;
$$;

revoke all on function public.review_membership_request(uuid, boolean) from public;
grant execute on function public.review_membership_request(uuid, boolean) to authenticated;

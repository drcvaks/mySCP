-- Recalculate cached chaburah member counts from active memberships only.

update public.chaburos chaburah
set member_count = (
  select count(*)::integer
  from public.chaburah_members membership
  where membership.chaburah_id = chaburah.id
    and membership.status = 'active'
);

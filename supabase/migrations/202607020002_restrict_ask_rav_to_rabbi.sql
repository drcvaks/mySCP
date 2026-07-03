-- Restrict Ask Rav visibility to the asker and the assigned active rabbi.

create or replace function private.can_answer_ask_rav(target_chaburah_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chaburah_members membership
    where membership.user_id = (select auth.uid())
      and membership.chaburah_id = target_chaburah_id
      and membership.status = 'active'
      and membership.member_role = 'rabbi'
  );
$$;

grant execute on function private.can_answer_ask_rav(uuid) to authenticated;

drop policy if exists ask_rav_questions_select on public.ask_rav_questions;
drop policy if exists ask_rav_questions_update_managers on public.ask_rav_questions;
drop policy if exists ask_rav_questions_delete_managers on public.ask_rav_questions;

create policy ask_rav_questions_select
on public.ask_rav_questions
for select
to authenticated
using (
  asker_id = (select auth.uid())
  or private.can_answer_ask_rav(chaburah_id)
);

create policy ask_rav_questions_update_rabbi
on public.ask_rav_questions
for update
to authenticated
using (private.can_answer_ask_rav(chaburah_id))
with check (private.can_answer_ask_rav(chaburah_id));

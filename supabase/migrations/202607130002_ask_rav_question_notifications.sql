-- Checkpoint 6: notify rabbonim when a participant submits an Ask Rav question.
-- Run after 202607130001_add_ask_rav_notification_type.sql.

alter table public.notification_preferences
  add column if not exists ask_rav_questions_email boolean not null default true,
  add column if not exists ask_rav_questions_in_app boolean not null default true;

create or replace function private.prefers_in_app(
  target_user_id uuid,
  target_type public.notification_type
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case target_type
    when 'review_questions'::public.notification_type then coalesce(pref.review_questions_in_app, true)
    when 'discussion_posts'::public.notification_type then coalesce(pref.discussion_posts_in_app, true)
    when 'ask_rav_questions'::public.notification_type then coalesce(pref.ask_rav_questions_in_app, true)
    when 'rabbi_answers'::public.notification_type then coalesce(pref.rabbi_answers_in_app, true)
    when 'uploads'::public.notification_type then coalesce(pref.uploads_in_app, true)
    else true
  end
  from (select target_user_id as user_id) target
  left join public.notification_preferences pref
    on pref.user_id = target.user_id;
$$;

create or replace function public.notify_ask_rav_question(target_question_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_question public.ask_rav_questions;
  inserted_count integer;
begin
  select *
  into source_question
  from public.ask_rav_questions question
  where question.id = target_question_id
    and question.asker_id = (select auth.uid())
    and question.status = 'submitted';

  if source_question.id is null then
    raise exception 'Submitted Ask Rav question not found';
  end if;

  insert into public.notifications (
    user_id,
    chaburah_id,
    type,
    title,
    body,
    action_route
  )
  select
    membership.user_id,
    source_question.chaburah_id,
    'ask_rav_questions'::public.notification_type,
    'New Ask Rav question',
    left(source_question.question, 180),
    '/(tabs)/rabbi-hub'
  from public.chaburah_members membership
  where membership.chaburah_id = source_question.chaburah_id
    and membership.status = 'active'
    and membership.member_role = 'rabbi'
    and membership.user_id <> source_question.asker_id
    and private.prefers_in_app(membership.user_id, 'ask_rav_questions'::public.notification_type);

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function private.prefers_in_app(uuid, public.notification_type) from public;
grant execute on function private.prefers_in_app(uuid, public.notification_type) to authenticated;

revoke all on function public.notify_ask_rav_question(uuid) from public;
grant execute on function public.notify_ask_rav_question(uuid) to authenticated;

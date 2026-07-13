-- Checkpoint 6: generate in-app notification rows for common app events.
-- These functions respect saved in-app notification preferences and do not use Realtime.

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
    when 'rabbi_answers'::public.notification_type then coalesce(pref.rabbi_answers_in_app, true)
    when 'uploads'::public.notification_type then coalesce(pref.uploads_in_app, true)
    else true
  end
  from (select target_user_id as user_id) target
  left join public.notification_preferences pref
    on pref.user_id = target.user_id;
$$;

create or replace function public.notify_discussion_post(target_message_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_message public.discussion_messages;
  inserted_count integer;
begin
  select *
  into source_message
  from public.discussion_messages message
  where message.id = target_message_id
    and message.author_id = (select auth.uid())
    and message.status = 'active';

  if source_message.id is null then
    raise exception 'Discussion message not found';
  end if;

  insert into public.notifications (
    user_id,
    chaburah_id,
    type,
    title,
    body,
    action_route,
    action_params
  )
  select
    membership.user_id,
    source_message.chaburah_id,
    'discussion_posts'::public.notification_type,
    'New discussion post',
    left(source_message.body, 180),
    '/(tabs)/chaburah',
    jsonb_build_object('section', 'discussion')
  from public.chaburah_members membership
  where membership.chaburah_id = source_message.chaburah_id
    and membership.status = 'active'
    and membership.user_id <> source_message.author_id
    and private.prefers_in_app(membership.user_id, 'discussion_posts'::public.notification_type);

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.notify_rabbi_answer(target_question_id uuid)
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
    and question.status = 'answered'
    and question.answer is not null
    and (
      question.answered_by = (select auth.uid())
      or private.is_global_admin()
      or private.can_manage_chaburah(question.chaburah_id)
    );

  if source_question.id is null then
    raise exception 'Answered question not found';
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
    source_question.asker_id,
    source_question.chaburah_id,
    'rabbi_answers'::public.notification_type,
    'Your Rav answered',
    'Your Ask Rav question has a new answer.',
    '/(tabs)/ask-rav'
  where private.prefers_in_app(source_question.asker_id, 'rabbi_answers'::public.notification_type);

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.notify_learning_file(target_file_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_file public.learning_files;
  inserted_count integer;
begin
  select *
  into source_file
  from public.learning_files file
  where file.id = target_file_id
    and (
      (file.visibility = 'everyone'::public.content_visibility and private.is_global_admin())
      or (
        file.visibility = 'chaburah'::public.content_visibility
        and file.chaburah_id is not null
        and private.can_manage_chaburah(file.chaburah_id)
      )
    );

  if source_file.id is null then
    raise exception 'Learning file not found or cannot notify';
  end if;

  insert into public.notifications (
    user_id,
    chaburah_id,
    type,
    title,
    body,
    action_route
  )
  select distinct
    recipient.user_id,
    source_file.chaburah_id,
    'uploads'::public.notification_type,
    'New file uploaded',
    source_file.title,
    '/(tabs)/files'
  from (
    select profile.id as user_id
    from public.profiles profile
    where source_file.visibility = 'everyone'::public.content_visibility
    union
    select membership.user_id
    from public.chaburah_members membership
    where source_file.visibility = 'chaburah'::public.content_visibility
      and membership.chaburah_id = source_file.chaburah_id
      and membership.status = 'active'
  ) recipient
  where recipient.user_id <> source_file.uploaded_by
    and private.prefers_in_app(recipient.user_id, 'uploads'::public.notification_type);

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.notify_review_questions_published(
  target_chaburah_id uuid,
  target_week smallint
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if not private.can_manage_chaburah(target_chaburah_id) then
    raise exception 'Not allowed to notify for this chaburah';
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
    target_chaburah_id,
    'review_questions'::public.notification_type,
    'New review questions',
    format('Week %s review questions are ready.', target_week),
    '/(tabs)/review'
  from public.chaburah_members membership
  where membership.chaburah_id = target_chaburah_id
    and membership.status = 'active'
    and membership.user_id <> (select auth.uid())
    and private.prefers_in_app(membership.user_id, 'review_questions'::public.notification_type);

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.notify_join_request(target_membership_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_membership public.chaburah_members;
  inserted_count integer;
begin
  select *
  into source_membership
  from public.chaburah_members membership
  where membership.id = target_membership_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'pending';

  if source_membership.id is null then
    raise exception 'Pending membership request not found';
  end if;

  insert into public.notifications (
    user_id,
    chaburah_id,
    type,
    title,
    body,
    action_route,
    action_params
  )
  select
    manager.user_id,
    source_membership.chaburah_id,
    'join_requests'::public.notification_type,
    'New join request',
    'A participant is waiting to join your chaburah.',
    '/(tabs)/admin',
    jsonb_build_object('section', 'requests')
  from public.chaburah_members manager
  where manager.chaburah_id = source_membership.chaburah_id
    and manager.status = 'active'
    and manager.member_role in ('rabbi', 'admin')
    and manager.user_id <> source_membership.user_id;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function private.prefers_in_app(uuid, public.notification_type) from public;
grant execute on function private.prefers_in_app(uuid, public.notification_type) to authenticated;

revoke all on function public.notify_discussion_post(uuid) from public;
revoke all on function public.notify_rabbi_answer(uuid) from public;
revoke all on function public.notify_learning_file(uuid) from public;
revoke all on function public.notify_review_questions_published(uuid, smallint) from public;
revoke all on function public.notify_join_request(uuid) from public;

grant execute on function public.notify_discussion_post(uuid) to authenticated;
grant execute on function public.notify_rabbi_answer(uuid) to authenticated;
grant execute on function public.notify_learning_file(uuid) to authenticated;
grant execute on function public.notify_review_questions_published(uuid, smallint) to authenticated;
grant execute on function public.notify_join_request(uuid) to authenticated;

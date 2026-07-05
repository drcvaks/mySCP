-- Add Rabbi Hub staging and public-library workflow for review questions.

alter table public.review_questions
  add column if not exists publication_status text not null default 'published'
    check (publication_status in ('draft', 'published', 'archived')),
  add column if not exists source_question_id uuid references public.review_questions(id) on delete set null,
  add column if not exists is_library_question boolean not null default false,
  add column if not exists published_at timestamptz;

alter table public.review_questions
  drop constraint if exists review_questions_library_scope_check;

alter table public.review_questions
  add constraint review_questions_library_scope_check
  check (
    is_library_question = false
    or (
      visibility = 'everyone'::public.content_visibility
      and chaburah_id is null
    )
  );

update public.review_questions
set published_at = coalesce(published_at, created_at)
where publication_status = 'published';

create index if not exists review_questions_publication_idx
  on public.review_questions (publication_status, week, visibility);

create index if not exists review_questions_library_idx
  on public.review_questions (is_library_question, week)
  where is_library_question = true;

create or replace function private.can_use_review_library()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_global_admin()
    or exists (
      select 1
      from public.chaburah_members membership
      where membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and membership.member_role in ('rabbi', 'admin')
    );
$$;

grant execute on function private.can_use_review_library() to authenticated;

create or replace function public.clone_review_question(
  source_review_question_id uuid,
  target_chaburah_id uuid,
  target_week smallint
)
returns public.review_questions
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_question public.review_questions;
  source_answer public.review_question_answers;
  cloned_question public.review_questions;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if target_week < 1 or target_week > 52 then
    raise exception 'Week must be between 1 and 52';
  end if;

  if not private.can_manage_chaburah(target_chaburah_id) then
    raise exception 'Chaburah manager access required';
  end if;

  select *
  into source_question
  from public.review_questions question
  where question.id = source_review_question_id
    and question.is_library_question = true
    and private.can_use_review_library();

  if not found then
    raise exception 'Library question not found or not accessible';
  end if;

  select *
  into source_answer
  from public.review_question_answers answer
  where answer.question_id = source_review_question_id;

  if not found then
    raise exception 'Library question is missing an answer key';
  end if;

  insert into public.review_questions (
    chaburah_id,
    topic,
    week,
    prompt,
    kind,
    choices,
    visibility,
    enabled,
    created_by,
    publication_status,
    source_question_id,
    is_library_question,
    published_at
  )
  values (
    target_chaburah_id,
    source_question.topic,
    target_week,
    source_question.prompt,
    source_question.kind,
    source_question.choices,
    'chaburah'::public.content_visibility,
    true,
    (select auth.uid()),
    'draft',
    source_question.id,
    false,
    null
  )
  returning * into cloned_question;

  insert into public.review_question_answers (
    question_id,
    correct_choice_index,
    explanation
  )
  values (
    cloned_question.id,
    source_answer.correct_choice_index,
    source_answer.explanation
  );

  return cloned_question;
end;
$$;

create or replace function public.publish_review_week(
  target_chaburah_id uuid,
  target_week smallint
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  published_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if target_week < 1 or target_week > 52 then
    raise exception 'Week must be between 1 and 52';
  end if;

  if not private.can_manage_chaburah(target_chaburah_id) then
    raise exception 'Chaburah manager access required';
  end if;

  update public.review_questions
  set publication_status = 'published',
      enabled = true,
      published_at = now()
  where chaburah_id = target_chaburah_id
    and week = target_week
    and publication_status = 'draft';

  get diagnostics published_count = row_count;
  return published_count;
end;
$$;

create or replace function public.check_review_answer(
  target_question_id uuid,
  selected_choice_index integer
)
returns table (
  is_correct boolean,
  explanation text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    answer.correct_choice_index = selected_choice_index,
    answer.explanation
  from public.review_questions question
  join public.review_question_answers answer
    on answer.question_id = question.id
  where question.id = target_question_id
    and question.enabled = true
    and question.publication_status = 'published'
    and private.can_read_content(question.visibility, question.chaburah_id);

  if not found then
    raise exception 'Question not found or not accessible';
  end if;
end;
$$;

create or replace function public.complete_review_session(
  target_week smallint,
  target_chaburah_id uuid,
  submitted_answers jsonb
)
returns public.review_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_session public.review_sessions;
  raw_count integer;
  submitted_count integer;
  accessible_count integer;
  correct_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(submitted_answers) <> 'array' then
    raise exception 'Answers must be a JSON array';
  end if;

  if target_chaburah_id is not null
    and not private.is_active_chaburah_member(target_chaburah_id)
  then
    raise exception 'An active membership is required';
  end if;

  raw_count := jsonb_array_length(submitted_answers);

  with submitted as (
    select
      answer.question_id,
      min(answer.choice_index) as choice_index
    from jsonb_to_recordset(submitted_answers)
      as answer(question_id uuid, choice_index integer)
    group by answer.question_id
  ),
  accessible as (
    select
      submitted.question_id,
      submitted.choice_index,
      correct.correct_choice_index
    from submitted
    join public.review_questions question
      on question.id = submitted.question_id
    join public.review_question_answers correct
      on correct.question_id = question.id
    where question.enabled = true
      and question.publication_status = 'published'
      and (target_week is null or question.week = target_week)
      and private.can_read_content(question.visibility, question.chaburah_id)
      and submitted.choice_index >= 0
      and submitted.choice_index < jsonb_array_length(question.choices)
  )
  select
    (select count(*) from submitted),
    (select count(*) from accessible),
    (
      select count(*)
      from accessible
      where choice_index = correct_choice_index
    )
  into submitted_count, accessible_count, correct_count;

  if submitted_count = 0 then
    raise exception 'At least one answer is required';
  end if;

  if raw_count <> submitted_count then
    raise exception 'Each question may only be answered once';
  end if;

  if accessible_count <> submitted_count then
    raise exception 'One or more questions are invalid or inaccessible';
  end if;

  insert into public.review_sessions (
    user_id,
    chaburah_id,
    week,
    total_questions,
    correct_answers
  )
  values (
    (select auth.uid()),
    target_chaburah_id,
    target_week,
    submitted_count,
    correct_count
  )
  returning * into created_session;

  with submitted as (
    select
      answer.question_id,
      min(answer.choice_index) as choice_index
    from jsonb_to_recordset(submitted_answers)
      as answer(question_id uuid, choice_index integer)
    group by answer.question_id
  )
  insert into public.review_session_answers (
    session_id,
    question_id,
    selected_choice_index,
    is_correct
  )
  select
    created_session.id,
    submitted.question_id,
    submitted.choice_index,
    submitted.choice_index = correct.correct_choice_index
  from submitted
  join public.review_question_answers correct
    on correct.question_id = submitted.question_id;

  return created_session;
end;
$$;

drop policy if exists review_questions_select on public.review_questions;

create policy review_questions_select
on public.review_questions
for select
to authenticated
using (
  private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
  or (
    is_library_question = true
    and private.can_use_review_library()
  )
  or (
    enabled = true
    and publication_status = 'published'
    and private.can_read_content(visibility, chaburah_id)
  )
);

revoke all on function public.clone_review_question(uuid, uuid, smallint) from public;
revoke all on function public.publish_review_week(uuid, smallint) from public;
grant execute on function public.clone_review_question(uuid, uuid, smallint) to authenticated;
grant execute on function public.publish_review_week(uuid, smallint) to authenticated;

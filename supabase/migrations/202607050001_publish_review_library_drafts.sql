-- Keep public review-library drafts hidden until Global Admin publishes them.

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
    and question.publication_status = 'published'
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
    and publication_status = 'published'
    and private.can_use_review_library()
  )
  or (
    enabled = true
    and publication_status = 'published'
    and private.can_read_content(visibility, chaburah_id)
  )
);

revoke all on function public.clone_review_question(uuid, uuid, smallint) from public;
grant execute on function public.clone_review_question(uuid, uuid, smallint) to authenticated;

-- Checkpoint 6: model questions in the public review library.
-- Model questions are published public-library questions intended as quick defaults for rabbonim.

alter table public.review_questions
  add column if not exists is_model_question boolean not null default false;

create index if not exists review_questions_model_library_idx
  on public.review_questions (week, is_model_question)
  where is_library_question = true
    and is_model_question = true;

update public.review_questions
set is_model_question = false
where is_library_question = false
  and is_model_question = true;

alter table public.review_questions
  drop constraint if exists review_questions_model_library_check;

alter table public.review_questions
  add constraint review_questions_model_library_check
  check (
    is_model_question = false
    or is_library_question = true
  );

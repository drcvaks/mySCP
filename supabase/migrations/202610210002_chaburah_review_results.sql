begin;

-- One immutable, server-scored first answer per published question and member.
create table if not exists public.review_first_answers (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.review_questions(id) on delete cascade,
  chaburah_id uuid not null references public.chaburos(id) on delete cascade,
  program_id text not null references public.learning_programs(id) on delete cascade,
  selected_choice_index smallint not null check (selected_choice_index >= 0),
  is_correct boolean not null,
  answered_at timestamptz not null default clock_timestamp(),
  primary key (user_id, question_id)
);
create index if not exists review_first_answers_scope
  on public.review_first_answers(chaburah_id, program_id, user_id);
alter table public.review_first_answers enable row level security;
-- No direct client reads or writes; access is only through the authorized RPCs.
revoke all on public.review_first_answers from public, anon, authenticated;

-- Recover the earliest recorded answer, not the best answer or first weekly quiz.
insert into public.review_first_answers
  (user_id, question_id, chaburah_id, program_id, selected_choice_index, is_correct, answered_at)
select distinct on (s.user_id, a.question_id)
  s.user_id, a.question_id, s.chaburah_id, s.program_id,
  a.selected_choice_index, a.is_correct, a.created_at
from public.review_session_answers a
join public.review_sessions s on s.id = a.session_id
join public.review_questions q on q.id = a.question_id
where s.chaburah_id is not null and q.chaburah_id = s.chaburah_id
  and q.program_id = s.program_id and not q.is_library_question
order by s.user_id, a.question_id, a.created_at, a.id
on conflict (user_id, question_id) do nothing;

create or replace function public.check_review_answer(target_question_id uuid, selected_choice_index integer)
returns table (is_correct boolean, explanation text)
language plpgsql security definer set search_path = '' as $$
declare
  question_record public.review_questions;
  correct_index integer;
  answer_explanation text;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select * into question_record from public.review_questions q
  where q.id = target_question_id and q.enabled and q.publication_status = 'published'
    and private.can_read_content(q.visibility, q.chaburah_id)
    and private.can_access_learning_program(q.program_id, q.chaburah_id);
  if not found then raise exception 'Question not found or not accessible'; end if;
  if selected_choice_index is null or selected_choice_index < 0
    or selected_choice_index >= jsonb_array_length(question_record.choices) then
    raise exception 'Invalid answer choice';
  end if;
  select a.correct_choice_index, a.explanation into correct_index, answer_explanation
  from public.review_question_answers a where a.question_id = target_question_id;
  if not found then raise exception 'Question answer not found'; end if;

  if question_record.chaburah_id is not null and not question_record.is_library_question
    and private.is_active_chaburah_member(question_record.chaburah_id) then
    insert into public.review_first_answers
      (user_id, question_id, chaburah_id, program_id, selected_choice_index, is_correct)
    values ((select auth.uid()), target_question_id, question_record.chaburah_id,
      question_record.program_id, selected_choice_index, selected_choice_index = correct_index)
    on conflict (user_id, question_id) do nothing;
  end if;
  return query select selected_choice_index = correct_index, answer_explanation;
end;
$$;
revoke all on function public.check_review_answer(uuid, integer) from public, anon;
grant execute on function public.check_review_answer(uuid, integer) to authenticated;

create or replace function public.get_chaburah_review_results(
  target_chaburah_id uuid, target_program_id text, target_week smallint default null
)
returns table (
  user_id uuid, display_name text, score_rank bigint, correct_answers bigint,
  answered_questions bigint, available_questions bigint, weeks_attempted bigint
)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if target_chaburah_id is null or target_program_id is null
    or not coalesce(private.can_manage_chaburah(target_chaburah_id), false)
    or not coalesce(private.can_access_learning_program(target_program_id, target_chaburah_id), false) then
    raise exception 'Chaburah manager access required';
  end if;
  if target_week is not null and (target_week < 1 or target_week > 52) then
    raise exception 'Invalid week';
  end if;
  return query
  with eligible as (
    select q.id, q.week from public.review_questions q
    where q.chaburah_id = target_chaburah_id and q.program_id = target_program_id
      and not q.is_library_question and q.enabled and q.publication_status = 'published'
      and (target_week is null or q.week = target_week)
  ), scores as (
    select m.user_id, coalesce(nullif(btrim(p.full_name), ''), 'Unnamed participant') as name,
      count(a.question_id) filter (where a.is_correct) as correct,
      count(a.question_id) as answered, count(distinct q.week) as weeks
    from public.chaburah_members m
    join public.profiles p on p.id = m.user_id
    left join public.review_first_answers a on a.user_id = m.user_id
      and a.chaburah_id = target_chaburah_id and a.program_id = target_program_id
      and a.question_id in (select e.id from eligible e)
    left join eligible q on q.id = a.question_id
    where m.chaburah_id = target_chaburah_id and m.status = 'active'
    group by m.user_id, p.full_name
  )
  select s.user_id, s.name,
    case when s.answered > 0 then rank() over (order by s.correct::numeric / nullif(s.answered, 0) desc nulls last) end,
    s.correct, s.answered, (select count(*) from eligible), s.weeks
  from scores s
  order by s.correct::numeric / nullif(s.answered, 0) desc nulls last,
    s.answered desc, lower(s.name), s.user_id;
end;
$$;
revoke all on function public.get_chaburah_review_results(uuid, text, smallint) from public, anon;
grant execute on function public.get_chaburah_review_results(uuid, text, smallint) to authenticated;
notify pgrst, 'reload schema';
commit;

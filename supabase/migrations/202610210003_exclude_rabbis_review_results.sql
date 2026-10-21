-- Exclude chaburah Rabbis before calculating ranks and participation totals.
-- Use the membership role here, not the person's role in a different chaburah.
begin;

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
      and m.member_role <> 'rabbi'
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

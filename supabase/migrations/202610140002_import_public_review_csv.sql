-- Atomic Global Admin-only public-library imports. No chaburah publication.
begin;
create function public.import_public_review_library(
  target_program_id text, questions jsonb, apply_import boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  item jsonb; row_no integer; row_errors text[]; errors jsonb := '[]'::jsonb;
  seen text[] := '{}'; identity_key text; existing public.review_questions;
  match_count integer; existing_id uuid; new_id uuid;
  new_count integer := 0; skipped_count integer := 0;
begin
  if (select auth.uid()) is null or not private.is_global_admin() then
    raise exception 'Only a Global Admin can import public-library questions';
  end if;
  if not exists (select 1 from public.learning_programs where id = target_program_id and not archived) then
    raise exception 'Choose an available, non-archived learning program';
  end if;
  if jsonb_typeof(questions) is distinct from 'array' then raise exception 'Questions must be an array'; end if;
  if jsonb_array_length(questions) not between 1 and 500 or octet_length(questions::text) > 2097152 then
    raise exception 'Import 1-500 questions, with a maximum payload of 2 MB';
  end if;
  -- Revalidate at commit. This also serializes manual question edits/creation
  -- with imports so the duplicate check and inserts cannot race.
  if apply_import then lock table public.review_questions in share row exclusive mode; end if;

  for item, row_no in select value, ordinality::integer + 1 from jsonb_array_elements(questions) with ordinality loop
    row_errors := '{}';
    if jsonb_typeof(item) is distinct from 'object' then
      errors := errors || jsonb_build_array(jsonb_build_object('row',row_no,'message','Question must be an object.'));
      continue;
    end if;
    if exists (select 1 from jsonb_object_keys(item) as keys(key)
      where key not in ('week','topic','prompt','kind','choices','correct_choice_index','explanation','is_model_question')) then
      row_errors := array_append(row_errors, 'Unsupported question fields.');
    end if;
    if jsonb_typeof(item->'week') is distinct from 'number' or (item->>'week') !~ '^[0-9]{1,2}$' then
      row_errors := array_append(row_errors,'Week must be a whole number from 1 to 52.');
    elsif (item->>'week')::integer not between 1 and 52 then
      row_errors := array_append(row_errors,'Week must be a whole number from 1 to 52.');
    end if;
    if coalesce(item->>'kind','') not in ('true_false','multiple_choice') then row_errors := array_append(row_errors,'Invalid question type.'); end if;
    if jsonb_typeof(item->'is_model_question') is distinct from 'boolean' then row_errors := array_append(row_errors,'Model flag must be a boolean.'); end if;
    if jsonb_typeof(item->'topic') is distinct from 'string' or coalesce(length(btrim(item->>'topic')),0) not between 1 and 200 then
      row_errors := array_append(row_errors,'Topic must contain 1-200 characters.');
    end if;
    if jsonb_typeof(item->'prompt') is distinct from 'string' or coalesce(length(btrim(item->>'prompt')),0) not between 1 and 4000 then
      row_errors := array_append(row_errors,'Prompt must contain 1-4000 characters.');
    end if;
    if jsonb_typeof(item->'explanation') is distinct from 'string' or coalesce(length(btrim(item->>'explanation')),0) not between 1 and 10000 then
      row_errors := array_append(row_errors,'Explanation must contain 1-10000 characters.');
    end if;
    if jsonb_typeof(item->'choices') is distinct from 'array' then
      row_errors := array_append(row_errors,'Choices must be an array.');
    else
      if (item->>'kind' = 'true_false' and item->'choices' <> '["True","False"]'::jsonb)
        or (item->>'kind' = 'multiple_choice' and jsonb_array_length(item->'choices') <> 4) then
        row_errors := array_append(row_errors,'Use two True/False choices or four multiple-choice choices.');
      end if;
      if exists(select 1 from jsonb_array_elements(item->'choices') choice
        where jsonb_typeof(choice) <> 'string' or length(btrim(choice #>> '{}')) not between 1 and 1000)
        or (select count(distinct lower(btrim(choice #>> '{}'))) from jsonb_array_elements(item->'choices') choice) <> jsonb_array_length(item->'choices') then
        row_errors := array_append(row_errors,'Choices must be distinct nonempty strings, at most 1000 characters each.');
      end if;
    end if;
    if jsonb_typeof(item->'correct_choice_index') is distinct from 'number' or coalesce(item->>'correct_choice_index','') !~ '^[0-3]$' then
      row_errors := array_append(row_errors,'Invalid answer index.');
    elsif jsonb_typeof(item->'choices') = 'array' then
      if (item->>'correct_choice_index')::integer >= jsonb_array_length(item->'choices') then row_errors := array_append(row_errors,'Answer index is outside the choices.'); end if;
    end if;
    if cardinality(row_errors) > 0 then
      errors := errors || jsonb_build_array(jsonb_build_object('row',row_no,'message',array_to_string(row_errors,' ')));
      continue;
    end if;
    identity_key := (item->>'week') || ':' || lower(btrim(item->>'prompt'));
    if identity_key = any(seen) then
      errors := errors || jsonb_build_array(jsonb_build_object('row',row_no,'message','Duplicate prompt in the same week within this import.'));
      continue;
    end if;
    seen := array_append(seen,identity_key);
    select count(*), min(id::text)::uuid into match_count, existing_id from public.review_questions
    where program_id = target_program_id and week = (item->>'week')::smallint
      and is_library_question and chaburah_id is null and visibility = 'everyone'
      and lower(btrim(prompt)) = lower(btrim(item->>'prompt'));
    if match_count = 0 then
      new_count := new_count + 1;
    elsif match_count = 1 then
      select * into existing from public.review_questions where id = existing_id;
      if existing.kind::text = item->>'kind' and existing.choices = item->'choices'
        and existing.is_model_question = (item->>'is_model_question')::boolean
        and existing.enabled and existing.publication_status = 'published'
        and exists (select 1 from public.review_question_answers answer where answer.question_id = existing_id
          and answer.correct_choice_index = (item->>'correct_choice_index')::smallint
          and btrim(answer.explanation) = btrim(item->>'explanation')) then
        skipped_count := skipped_count + 1;
      else
        errors := errors || jsonb_build_array(jsonb_build_object('row',row_no,'message','This prompt already exists with different answers, explanation, model flag, or publication status. Review it in Rabbi Hub before importing.'));
      end if;
    else
      errors := errors || jsonb_build_array(jsonb_build_object('row',row_no,'message','Multiple library entries already match this prompt and week. Resolve them before importing.'));
    end if;
  end loop;
  if apply_import and jsonb_array_length(errors) > 0 then
    raise exception 'Import blocked. Row %: %', errors->0->>'row', errors->0->>'message';
  end if;
  if apply_import then
    for item in select value from jsonb_array_elements(questions) loop
      if exists (select 1 from public.review_questions where program_id = target_program_id
        and week = (item->>'week')::smallint and is_library_question and visibility = 'everyone'
        and chaburah_id is null and lower(btrim(prompt)) = lower(btrim(item->>'prompt'))) then continue; end if;
      insert into public.review_questions(program_id,chaburah_id,topic,week,prompt,kind,choices,
        visibility,enabled,created_by,publication_status,source_question_id,is_library_question,published_at,is_model_question)
      values (target_program_id,null,btrim(item->>'topic'),(item->>'week')::smallint,btrim(item->>'prompt'),
        (item->>'kind')::public.review_question_kind,item->'choices','everyone',true,(select auth.uid()),
        'published',null,true,now(),(item->>'is_model_question')::boolean) returning id into new_id;
      insert into public.review_question_answers(question_id,correct_choice_index,explanation)
      values(new_id,(item->>'correct_choice_index')::smallint,btrim(item->>'explanation'));
    end loop;
  end if;
  return jsonb_build_object('program_id',target_program_id,'row_count',jsonb_array_length(questions),
    'new_count',new_count,'skipped_count',skipped_count,'errors',errors,'committed',apply_import);
end;
$$;
revoke all on function public.import_public_review_library(text,jsonb,boolean) from public;
grant execute on function public.import_public_review_library(text,jsonb,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;

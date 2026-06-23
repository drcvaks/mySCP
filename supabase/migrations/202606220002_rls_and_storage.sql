-- mySCP Checkpoint 3 authorization, RPC, and private Storage policies.

create or replace function private.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'global_admin'
  );
$$;

create or replace function private.is_active_chaburah_member(target_chaburah_id uuid)
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
  );
$$;

create or replace function private.can_manage_chaburah(target_chaburah_id uuid)
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
        and membership.chaburah_id = target_chaburah_id
        and membership.status = 'active'
        and membership.member_role in ('rabbi', 'admin')
    );
$$;

create or replace function private.can_view_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id = (select auth.uid())
    or private.is_global_admin()
    or exists (
      select 1
      from public.chaburah_members target_membership
      join public.chaburah_members manager_membership
        on manager_membership.chaburah_id = target_membership.chaburah_id
      where target_membership.user_id = target_user_id
        and target_membership.status = 'active'
        and manager_membership.user_id = (select auth.uid())
        and manager_membership.status = 'active'
        and manager_membership.member_role in ('rabbi', 'admin')
    );
$$;

create or replace function private.can_read_content(
  target_visibility public.content_visibility,
  target_chaburah_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_visibility = 'everyone'
    or private.is_global_admin()
    or (
      target_visibility = 'chaburah'
      and private.is_active_chaburah_member(target_chaburah_id)
    );
$$;

create or replace function private.can_manage_learning_file_path(target_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.learning_files file
    where file.storage_path = target_storage_path
      and (
        private.is_global_admin()
        or (
          file.chaburah_id is not null
          and private.can_manage_chaburah(file.chaburah_id)
        )
      )
  );
$$;

create or replace function private.can_read_learning_file_path(target_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.learning_files file
    where file.storage_path = target_storage_path
      and private.can_read_content(file.visibility, file.chaburah_id)
  );
$$;

revoke all on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

create or replace function public.join_chaburah(target_chaburah_id uuid)
returns public.membership_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status public.membership_status;
  existing_role public.membership_role;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select
    case
      when chaburah.join_requires_approval then 'pending'::public.membership_status
      else 'active'::public.membership_status
    end
  into target_status
  from public.chaburos chaburah
  where chaburah.id = target_chaburah_id
    and chaburah.status = 'active';

  if target_status is null then
    raise exception 'Chaburah not found or inactive';
  end if;

  select membership.member_role
  into existing_role
  from public.chaburah_members membership
  where membership.user_id = (select auth.uid())
    and membership.chaburah_id = target_chaburah_id;

  insert into public.chaburah_members (
    user_id,
    chaburah_id,
    member_role,
    status
  )
  values (
    (select auth.uid()),
    target_chaburah_id,
    coalesce(existing_role, 'participant'::public.membership_role),
    target_status
  )
  on conflict (user_id, chaburah_id)
  do update set
    status = case
      when public.chaburah_members.member_role in ('rabbi', 'admin')
        then 'active'::public.membership_status
      else excluded.status
    end,
    updated_at = now();

  select membership.status
  into target_status
  from public.chaburah_members membership
  where membership.user_id = (select auth.uid())
    and membership.chaburah_id = target_chaburah_id;

  if target_status = 'active' then
    update public.profiles
    set current_chaburah_id = target_chaburah_id
    where id = (select auth.uid());
  end if;

  return target_status;
end;
$$;

create or replace function public.leave_chaburah(target_chaburah_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  update public.chaburah_members
  set status = 'left'
  where user_id = (select auth.uid())
    and chaburah_id = target_chaburah_id
    and member_role = 'participant';

  update public.profiles
  set current_chaburah_id = null
  where id = (select auth.uid())
    and current_chaburah_id = target_chaburah_id;
end;
$$;

create or replace function public.set_current_chaburah(target_chaburah_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_chaburah_member(target_chaburah_id) then
    raise exception 'An active membership is required';
  end if;

  update public.profiles
  set current_chaburah_id = target_chaburah_id
  where id = (select auth.uid());
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

create or replace function public.admin_set_user_role(
  target_user_id uuid,
  new_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_global_admin() then
    raise exception 'Global admin access required';
  end if;

  update public.profiles
  set role = new_role
  where id = target_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

create or replace function public.review_role_request(
  target_request_id uuid,
  approve_request boolean,
  reviewer_note text default null
)
returns public.role_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.role_requests;
  target_membership_role public.membership_role;
begin
  if not private.is_global_admin() then
    raise exception 'Global admin access required';
  end if;

  select *
  into request_record
  from public.role_requests request
  where request.id = target_request_id
    and request.status = 'pending'
  for update;

  if not found then
    raise exception 'Pending role request not found';
  end if;

  if approve_request and request_record.chaburah_id is null then
    raise exception 'A chaburah is required for local roles';
  end if;

  update public.role_requests
  set
    status = case
      when approve_request then 'approved'::public.role_request_status
      else 'rejected'::public.role_request_status
    end,
    review_note = reviewer_note,
    reviewed_by = (select auth.uid()),
    reviewed_at = now()
  where id = request_record.id
  returning * into request_record;

  if approve_request then
    update public.profiles
    set
      role = request_record.requested_role,
      current_chaburah_id = coalesce(
        current_chaburah_id,
        request_record.chaburah_id
      )
    where id = request_record.user_id;

    target_membership_role := case request_record.requested_role
      when 'local_rabbi' then 'rabbi'::public.membership_role
      when 'local_admin' then 'admin'::public.membership_role
      else 'participant'::public.membership_role
    end;

    insert into public.chaburah_members (
      user_id,
      chaburah_id,
      member_role,
      status
    )
    values (
      request_record.user_id,
      request_record.chaburah_id,
      target_membership_role,
      'active'
    )
    on conflict (user_id, chaburah_id)
    do update set
      member_role = excluded.member_role,
      status = 'active',
      updated_at = now();
  end if;

  return request_record;
end;
$$;

revoke all on function public.join_chaburah(uuid) from public;
revoke all on function public.leave_chaburah(uuid) from public;
revoke all on function public.set_current_chaburah(uuid) from public;
revoke all on function public.check_review_answer(uuid, integer) from public;
revoke all on function public.complete_review_session(smallint, uuid, jsonb) from public;
revoke all on function public.admin_set_user_role(uuid, public.app_role) from public;
revoke all on function public.review_role_request(uuid, boolean, text) from public;

grant execute on function public.join_chaburah(uuid) to authenticated;
grant execute on function public.leave_chaburah(uuid) to authenticated;
grant execute on function public.set_current_chaburah(uuid) to authenticated;
grant execute on function public.check_review_answer(uuid, integer) to authenticated;
grant execute on function public.complete_review_session(smallint, uuid, jsonb) to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.review_role_request(uuid, boolean, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.chaburos enable row level security;
alter table public.chaburah_members enable row level security;
alter table public.role_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.learning_files enable row level security;
alter table public.review_questions enable row level security;
alter table public.review_question_answers enable row level security;
alter table public.review_sessions enable row level security;
alter table public.review_session_answers enable row level security;
alter table public.ask_rav_questions enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.chaburos from anon, authenticated;
revoke all on public.chaburah_members from anon, authenticated;
revoke all on public.role_requests from anon, authenticated;
revoke all on public.announcements from anon, authenticated;
revoke all on public.learning_files from anon, authenticated;
revoke all on public.review_questions from anon, authenticated;
revoke all on public.review_question_answers from anon, authenticated;
revoke all on public.review_sessions from anon, authenticated;
revoke all on public.review_session_answers from anon, authenticated;
revoke all on public.ask_rav_questions from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, phone, city, state, country, avatar_url)
  on public.profiles to authenticated;

grant select, insert, update, delete on public.chaburos to authenticated;
grant select, insert, update, delete on public.chaburah_members to authenticated;
grant select, insert on public.role_requests to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;
grant select, insert, update, delete on public.learning_files to authenticated;
grant select, insert, update, delete on public.review_questions to authenticated;
grant select, insert, update, delete on public.review_question_answers to authenticated;
grant select on public.review_sessions to authenticated;
grant select on public.review_session_answers to authenticated;
grant select, insert, update, delete on public.ask_rav_questions to authenticated;

create policy profiles_select
on public.profiles
for select
to authenticated
using (private.can_view_profile(id));

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy chaburos_select
on public.chaburos
for select
to authenticated
using (
  status = 'active'
  or private.is_global_admin()
  or private.can_manage_chaburah(id)
);

create policy chaburos_insert_global_admin
on public.chaburos
for insert
to authenticated
with check (private.is_global_admin());

create policy chaburos_update_managers
on public.chaburos
for update
to authenticated
using (private.is_global_admin() or private.can_manage_chaburah(id))
with check (private.is_global_admin() or private.can_manage_chaburah(id));

create policy chaburos_delete_global_admin
on public.chaburos
for delete
to authenticated
using (private.is_global_admin());

create policy chaburah_members_select
on public.chaburah_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
);

create policy chaburah_members_insert_managers
on public.chaburah_members
for insert
to authenticated
with check (
  private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
);

create policy chaburah_members_update_managers
on public.chaburah_members
for update
to authenticated
using (
  private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
)
with check (
  private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
);

create policy chaburah_members_delete_managers
on public.chaburah_members
for delete
to authenticated
using (
  private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
);

create policy role_requests_select
on public.role_requests
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
);

create policy role_requests_insert_self
on public.role_requests
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

create policy announcements_select
on public.announcements
for select
to authenticated
using (private.can_read_content(visibility, chaburah_id));

create policy announcements_insert
on public.announcements
for insert
to authenticated
with check (
  posted_by = (select auth.uid())
  and (
    (visibility = 'everyone' and private.is_global_admin())
    or (
      visibility = 'chaburah'
      and private.can_manage_chaburah(chaburah_id)
    )
  )
);

create policy announcements_update
on public.announcements
for update
to authenticated
using (
  private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
)
with check (
  private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
);

create policy announcements_delete
on public.announcements
for delete
to authenticated
using (
  private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
);

create policy learning_files_select
on public.learning_files
for select
to authenticated
using (private.can_read_content(visibility, chaburah_id));

create policy learning_files_insert
on public.learning_files
for insert
to authenticated
with check (
  uploaded_by = (select auth.uid())
  and (
    (visibility = 'everyone' and private.is_global_admin())
    or (
      visibility = 'chaburah'
      and private.can_manage_chaburah(chaburah_id)
    )
  )
);

create policy learning_files_update
on public.learning_files
for update
to authenticated
using (
  private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
)
with check (
  private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
);

create policy learning_files_delete
on public.learning_files
for delete
to authenticated
using (
  private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
);

create policy review_questions_select
on public.review_questions
for select
to authenticated
using (
  (
    enabled = true
    and private.can_read_content(visibility, chaburah_id)
  )
  or private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
);

create policy review_questions_insert
on public.review_questions
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    (visibility = 'everyone' and private.is_global_admin())
    or (
      visibility = 'chaburah'
      and private.can_manage_chaburah(chaburah_id)
    )
  )
);

create policy review_questions_update
on public.review_questions
for update
to authenticated
using (
  private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
)
with check (
  private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
);

create policy review_questions_delete
on public.review_questions
for delete
to authenticated
using (
  private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
);

create policy review_question_answers_select_managers
on public.review_question_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.review_questions question
    where question.id = public.review_question_answers.question_id
      and (
        private.is_global_admin()
        or (
          question.chaburah_id is not null
          and private.can_manage_chaburah(question.chaburah_id)
        )
      )
  )
);

create policy review_question_answers_insert_managers
on public.review_question_answers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.review_questions question
    where question.id = public.review_question_answers.question_id
      and (
        private.is_global_admin()
        or (
          question.chaburah_id is not null
          and private.can_manage_chaburah(question.chaburah_id)
        )
      )
  )
);

create policy review_question_answers_update_managers
on public.review_question_answers
for update
to authenticated
using (
  exists (
    select 1
    from public.review_questions question
    where question.id = public.review_question_answers.question_id
      and (
        private.is_global_admin()
        or (
          question.chaburah_id is not null
          and private.can_manage_chaburah(question.chaburah_id)
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.review_questions question
    where question.id = public.review_question_answers.question_id
      and (
        private.is_global_admin()
        or (
          question.chaburah_id is not null
          and private.can_manage_chaburah(question.chaburah_id)
        )
      )
  )
);

create policy review_question_answers_delete_managers
on public.review_question_answers
for delete
to authenticated
using (
  exists (
    select 1
    from public.review_questions question
    where question.id = public.review_question_answers.question_id
      and (
        private.is_global_admin()
        or (
          question.chaburah_id is not null
          and private.can_manage_chaburah(question.chaburah_id)
        )
      )
  )
);

create policy review_sessions_select
on public.review_sessions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_global_admin()
  or (
    chaburah_id is not null
    and private.can_manage_chaburah(chaburah_id)
  )
);

create policy review_session_answers_select
on public.review_session_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.review_sessions session
    where session.id = public.review_session_answers.session_id
      and (
        session.user_id = (select auth.uid())
        or private.is_global_admin()
        or (
          session.chaburah_id is not null
          and private.can_manage_chaburah(session.chaburah_id)
        )
      )
  )
);

create policy ask_rav_questions_select
on public.ask_rav_questions
for select
to authenticated
using (
  asker_id = (select auth.uid())
  or private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
);

create policy ask_rav_questions_insert_self
on public.ask_rav_questions
for insert
to authenticated
with check (
  asker_id = (select auth.uid())
  and status = 'submitted'
  and answer is null
  and answered_by is null
  and answered_at is null
  and private.is_active_chaburah_member(chaburah_id)
);

create policy ask_rav_questions_update_managers
on public.ask_rav_questions
for update
to authenticated
using (
  private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
)
with check (
  private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
);

create policy ask_rav_questions_delete_managers
on public.ask_rav_questions
for delete
to authenticated
using (
  private.is_global_admin()
  or private.can_manage_chaburah(chaburah_id)
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('learning-files', 'learning-files', false, 104857600)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

create policy learning_files_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'learning-files'
  and private.can_read_learning_file_path(name)
);

create policy learning_files_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'learning-files'
  and private.can_manage_learning_file_path(name)
);

create policy learning_files_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'learning-files'
  and private.can_manage_learning_file_path(name)
)
with check (
  bucket_id = 'learning-files'
  and private.can_manage_learning_file_path(name)
);

create policy learning_files_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'learning-files'
  and private.can_manage_learning_file_path(name)
);

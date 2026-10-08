-- Add program identities without deleting/recreating existing content or scores.
begin;

create table public.learning_programs (
  id text primary key,
  name text not null,
  topic text not null,
  default_week smallint not null check (default_week between 1 and 52),
  archived boolean not null default false
);
-- These are program definitions, not test/seed learning content.
insert into public.learning_programs (id, name, topic, default_week)
values ('summer-5786', 'Summer 5786', 'Nat Bar Nat',
        coalesce((select current_review_week from public.app_settings where id = true), 12)),
       ('winter-5787', 'Winter 5787', 'Challah & Terumos/Maasros', 1);

alter table public.chaburos add column default_program_id text not null default 'summer-5786'
  references public.learning_programs(id);
alter table public.content_chunks add column program_id text not null default 'summer-5786'
  references public.learning_programs(id);
alter table public.review_questions add column program_id text not null default 'summer-5786'
  references public.learning_programs(id);
alter table public.review_packets add column program_id text not null default 'summer-5786'
  references public.learning_programs(id);
alter table public.learning_files add column program_id text not null default 'summer-5786'
  references public.learning_programs(id);
alter table public.review_sessions add column program_id text not null default 'summer-5786'
  references public.learning_programs(id);

create table public.chaburah_programs (
  chaburah_id uuid not null references public.chaburos(id) on delete cascade,
  program_id text not null references public.learning_programs(id),
  current_week smallint not null check (current_week between 1 and 52),
  primary key (chaburah_id, program_id)
);
insert into public.chaburah_programs (chaburah_id, program_id, current_week)
select chaburah.id, program.id, program.default_week
from public.chaburos chaburah cross join public.learning_programs program;

create function private.initialize_chaburah_programs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.chaburah_programs (chaburah_id, program_id, current_week)
  select new.id, id, default_week from public.learning_programs;
  return new;
end;
$$;
create trigger initialize_chaburah_programs after insert on public.chaburos
for each row execute function private.initialize_chaburah_programs();

alter table public.learning_programs enable row level security;
alter table public.chaburah_programs enable row level security;
revoke all on public.learning_programs, public.chaburah_programs from anon, authenticated;
grant select on public.learning_programs, public.chaburah_programs to authenticated;
grant update (current_week) on public.chaburah_programs to authenticated;
create policy learning_programs_read on public.learning_programs for select to authenticated using (true);
create policy chaburah_programs_read on public.chaburah_programs for select to authenticated
using (private.is_global_admin() or private.can_manage_chaburah(chaburah_id)
       or private.is_active_chaburah_member(chaburah_id));
create policy chaburah_programs_manage on public.chaburah_programs for update to authenticated
using (private.can_manage_chaburah(chaburah_id))
with check (private.can_manage_chaburah(chaburah_id));

create index review_questions_program_week on public.review_questions (program_id, chaburah_id, week);
create index learning_files_program_week on public.learning_files (program_id, chaburah_id, week);
create index review_packets_program_week on public.review_packets (program_id, chaburah_id, week);
create index review_sessions_program_user on public.review_sessions (program_id, user_id, chaburah_id);
create index content_chunks_program on public.content_chunks (program_id);

-- Capability marker is not authorization: existing role/membership RLS still applies.
-- Old mobile builds have no program filter, so they must continue seeing Summer only.
create function private.learning_program_client()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb
    ->> 'x-myscp-learning-programs') = '1', false);
$$;
create policy program_client_questions on public.review_questions as restrictive for select to authenticated
using (program_id = 'summer-5786' or private.learning_program_client());
create policy program_client_chunks on public.content_chunks as restrictive for select to authenticated
using (program_id = 'summer-5786' or private.learning_program_client());
create policy program_client_packets on public.review_packets as restrictive for select to authenticated
using (program_id = 'summer-5786' or private.learning_program_client());
create policy program_client_files on public.learning_files as restrictive for select to authenticated
using (program_id = 'summer-5786' or private.learning_program_client());
create policy program_client_sessions on public.review_sessions as restrictive for select to authenticated
using (program_id = 'summer-5786' or private.learning_program_client());

-- Prevent program changes from silently moving existing scores/content.
create function private.lock_learning_program()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.program_id is distinct from new.program_id then
    raise exception 'Existing content cannot be moved between learning programs';
  end if;
  return new;
end;
$$;
create trigger lock_question_program before update on public.review_questions
for each row execute function private.lock_learning_program();
create trigger lock_packet_program before update on public.review_packets
for each row execute function private.lock_learning_program();
create trigger lock_chunk_program before update on public.content_chunks
for each row execute function private.lock_learning_program();
create trigger lock_session_program before update on public.review_sessions
for each row execute function private.lock_learning_program();

-- Legacy clone RPC still works; a clone always inherits its library question's program.
create function private.inherit_question_program()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source_question_id is not null then
    select program_id into new.program_id from public.review_questions where id = new.source_question_id;
  end if;
  return new;
end;
$$;
create trigger inherit_question_program before insert on public.review_questions
for each row execute function private.inherit_question_program();

-- Existing publish/update RPCs need no duplicated image/content payload.
create function private.inherit_packet_program()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.review_packet_id is not null then
    select program_id into new.program_id from public.review_packets where id = new.review_packet_id;
  elsif tg_op = 'UPDATE' and old.program_id is distinct from new.program_id then
    raise exception 'Existing files cannot be moved between learning programs';
  end if;
  return new;
end;
$$;
create trigger inherit_packet_program before insert or update on public.learning_files
for each row execute function private.inherit_packet_program();

create function private.validate_packet_program()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.review_packets p join public.content_chunks c on c.id = new.chunk_id
    where p.id = new.packet_id and p.program_id = c.program_id
  ) then
    raise exception 'Packet and material must belong to the same learning program';
  end if;
  return new;
end;
$$;
create trigger validate_packet_program before insert or update on public.review_packet_items
for each row execute function private.validate_packet_program();

create function private.validate_content_link_program()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.content_chunks a join public.content_chunks b on b.id = new.related_chunk_id
    where a.id = new.parent_chunk_id and a.program_id = b.program_id
  ) then
    raise exception 'Suggestions cannot link different learning programs';
  end if;
  return new;
end;
$$;
create trigger validate_content_link_program before insert or update on public.content_chunk_links
for each row execute function private.validate_content_link_program();

create or replace view public.review_packet_content_coverage as
select packet.chaburah_id, packet.week, packet.id as packet_id, packet.title as packet_title,
  item.chunk_id, chunk.chunk_code, chunk.section_key, chunk.section_title, chunk.source_type,
  packet.published_at, packet.program_id
from public.review_packets packet
join public.review_packet_items item on item.packet_id = packet.id
join public.content_chunks chunk on chunk.id = item.chunk_id
where packet.status = 'published'::public.review_packet_status
  and (packet.program_id = 'summer-5786' or private.learning_program_client());

-- RPC replacements are appended below; the entire migration commits atomically.
drop function public.publish_review_week(uuid, smallint);
create or replace function public.publish_review_week(
  target_chaburah_id uuid,
  target_week smallint,
  target_program_id text default 'summer-5786'
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
    and program_id = target_program_id
    and week = target_week
    and publication_status = 'draft';

  get diagnostics published_count = row_count;
  return published_count;
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
  session_program text;
  program_count integer;
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

  select min(q.program_id), count(distinct q.program_id)
  into session_program, program_count
  from public.review_questions q
  where q.id in (select a.question_id from jsonb_to_recordset(submitted_answers) as a(question_id uuid));
  if program_count <> 1 then
    raise exception 'A review session must contain questions from one learning program';
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
      and question.program_id = session_program
      and question.chaburah_id = target_chaburah_id
      and not question.is_library_question
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
    program_id,
    user_id,
    chaburah_id,
    week,
    total_questions,
    correct_answers
  )
  values (
    session_program,
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


revoke all on function public.publish_review_week(uuid, smallint, text) from public;
grant execute on function public.publish_review_week(uuid, smallint, text) to authenticated;
drop function public.notify_review_questions_published(uuid, smallint);
create or replace function public.notify_review_questions_published(
  target_chaburah_id uuid,
  target_week smallint,
  target_program_id text default 'summer-5786'
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
    action_route,
    action_params
  )
  select
    membership.user_id,
    target_chaburah_id,
    'review_questions'::public.notification_type,
    'New review questions',
    format('%s - Week %s review questions are ready.', (select name from public.learning_programs where id = target_program_id), target_week),
    '/(tabs)/review',
    jsonb_build_object('program_id', target_program_id)
  from public.chaburah_members membership
  where membership.chaburah_id = target_chaburah_id
    and membership.status = 'active'
    and membership.user_id <> (select auth.uid())
    and private.prefers_in_app(membership.user_id, 'review_questions'::public.notification_type);

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
    action_route,
    action_params
  )
  select distinct
    recipient.user_id,
    source_file.chaburah_id,
    'uploads'::public.notification_type,
    'New file uploaded',
    (select name from public.learning_programs where id = source_file.program_id) || ' - ' || source_file.title,
    '/(tabs)/files',
    jsonb_build_object('program_id', source_file.program_id)
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

revoke all on function public.notify_review_questions_published(uuid, smallint, text) from public;
grant execute on function public.notify_review_questions_published(uuid, smallint, text) to authenticated;
notify pgrst, 'reload schema';
commit;

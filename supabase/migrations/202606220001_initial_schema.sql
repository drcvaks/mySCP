-- mySCP Checkpoint 3 initial schema
-- Apply to a clean Supabase project before the RLS migration.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

create type public.app_role as enum (
  'participant',
  'local_rabbi',
  'local_admin',
  'global_admin'
);

create type public.chaburah_status as enum (
  'pending',
  'active',
  'inactive'
);

create type public.membership_role as enum (
  'participant',
  'rabbi',
  'admin'
);

create type public.membership_status as enum (
  'pending',
  'active',
  'suspended',
  'left'
);

create type public.content_visibility as enum (
  'everyone',
  'chaburah'
);

create type public.learning_file_type as enum (
  'source_sheet',
  'review_sheet',
  'recording',
  'pdf',
  'link'
);

create type public.review_question_kind as enum (
  'multiple_choice',
  'true_false'
);

create type public.ask_rav_status as enum (
  'submitted',
  'answered',
  'archived'
);

create type public.role_request_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  city text,
  state text,
  country text not null default 'United States',
  avatar_url text,
  role public.app_role not null default 'participant',
  current_chaburah_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chaburos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text,
  city text not null,
  state text,
  country text not null default 'United States',
  rabbi_name text,
  schedule_text text,
  contact_email text,
  zoom_url text,
  description text,
  status public.chaburah_status not null default 'pending',
  discussion_enabled boolean not null default false,
  join_requires_approval boolean not null default false,
  member_count integer not null default 0 check (member_count >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_current_chaburah_id_fkey
  foreign key (current_chaburah_id)
  references public.chaburos(id)
  on delete set null;

create table public.chaburah_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chaburah_id uuid not null references public.chaburos(id) on delete cascade,
  member_role public.membership_role not null default 'participant',
  status public.membership_status not null default 'pending',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, chaburah_id)
);

create table public.role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chaburah_id uuid references public.chaburos(id) on delete cascade,
  requested_role public.app_role not null,
  status public.role_request_status not null default 'pending',
  request_note text,
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requested_role in ('local_rabbi', 'local_admin')),
  check (
    (status = 'pending' and reviewed_at is null)
    or status <> 'pending'
  )
);

create unique index role_requests_one_pending_per_user_role
  on public.role_requests (user_id, requested_role)
  where status = 'pending';

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  chaburah_id uuid references public.chaburos(id) on delete cascade,
  title text not null,
  body text not null,
  visibility public.content_visibility not null default 'chaburah',
  is_pinned boolean not null default false,
  posted_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (visibility = 'everyone' and chaburah_id is null)
    or (visibility = 'chaburah' and chaburah_id is not null)
  )
);

create table public.learning_files (
  id uuid primary key default gen_random_uuid(),
  chaburah_id uuid references public.chaburos(id) on delete cascade,
  title text not null,
  description text,
  topic text not null,
  week smallint not null check (week between 1 and 52),
  file_type public.learning_file_type not null,
  visibility public.content_visibility not null default 'chaburah',
  storage_path text unique,
  external_url text,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (visibility = 'everyone' and chaburah_id is null)
    or (visibility = 'chaburah' and chaburah_id is not null)
  ),
  check (
    storage_path is not null
    or external_url is not null
  )
);

create table public.review_questions (
  id uuid primary key default gen_random_uuid(),
  chaburah_id uuid references public.chaburos(id) on delete cascade,
  topic text not null,
  week smallint not null check (week between 1 and 52),
  prompt text not null,
  kind public.review_question_kind not null,
  choices jsonb not null,
  visibility public.content_visibility not null default 'chaburah',
  enabled boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(choices) = 'array'),
  check (jsonb_array_length(choices) >= 2),
  check (
    (visibility = 'everyone' and chaburah_id is null)
    or (visibility = 'chaburah' and chaburah_id is not null)
  )
);

create table public.review_question_answers (
  question_id uuid primary key references public.review_questions(id) on delete cascade,
  correct_choice_index smallint not null check (correct_choice_index >= 0),
  explanation text not null,
  updated_at timestamptz not null default now()
);

create table public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chaburah_id uuid references public.chaburos(id) on delete set null,
  week smallint check (week between 1 and 52),
  total_questions integer not null check (total_questions > 0),
  correct_answers integer not null check (
    correct_answers >= 0
    and correct_answers <= total_questions
  ),
  completed_at timestamptz not null default now()
);

create table public.review_session_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  question_id uuid not null references public.review_questions(id) on delete restrict,
  selected_choice_index smallint not null check (selected_choice_index >= 0),
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create table public.ask_rav_questions (
  id uuid primary key default gen_random_uuid(),
  chaburah_id uuid not null references public.chaburos(id) on delete cascade,
  asker_id uuid not null references public.profiles(id) on delete cascade,
  question text not null check (char_length(btrim(question)) >= 10),
  status public.ask_rav_status not null default 'submitted',
  answer text,
  answered_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  answered_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (status = 'submitted' and answer is null and answered_at is null)
    or (status = 'answered' and answer is not null and answered_by is not null and answered_at is not null)
    or status = 'archived'
  )
);

create index profiles_current_chaburah_id_idx
  on public.profiles (current_chaburah_id);
create index chaburos_status_city_idx
  on public.chaburos (status, city);
create index chaburah_members_user_status_idx
  on public.chaburah_members (user_id, status);
create index chaburah_members_chaburah_status_idx
  on public.chaburah_members (chaburah_id, status);
create index announcements_chaburah_created_idx
  on public.announcements (chaburah_id, created_at desc);
create index learning_files_chaburah_week_idx
  on public.learning_files (chaburah_id, week);
create index learning_files_visibility_created_idx
  on public.learning_files (visibility, created_at desc);
create index review_questions_chaburah_week_idx
  on public.review_questions (chaburah_id, week)
  where enabled = true;
create index review_sessions_user_completed_idx
  on public.review_sessions (user_id, completed_at desc);
create index review_session_answers_session_idx
  on public.review_session_answers (session_id);
create index ask_rav_questions_asker_submitted_idx
  on public.ask_rav_questions (asker_id, submitted_at desc);
create index ask_rav_questions_chaburah_status_idx
  on public.ask_rav_questions (chaburah_id, status, submitted_at desc);
create index role_requests_chaburah_status_idx
  on public.role_requests (chaburah_id, status);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger chaburos_set_updated_at
before update on public.chaburos
for each row execute function private.set_updated_at();

create trigger chaburah_members_set_updated_at
before update on public.chaburah_members
for each row execute function private.set_updated_at();

create trigger role_requests_set_updated_at
before update on public.role_requests
for each row execute function private.set_updated_at();

create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function private.set_updated_at();

create trigger learning_files_set_updated_at
before update on public.learning_files
for each row execute function private.set_updated_at();

create trigger review_questions_set_updated_at
before update on public.review_questions
for each row execute function private.set_updated_at();

create trigger review_question_answers_set_updated_at
before update on public.review_question_answers
for each row execute function private.set_updated_at();

create trigger ask_rav_questions_set_updated_at
before update on public.ask_rav_questions
for each row execute function private.set_updated_at();

create or replace function private.validate_review_answer()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  choice_count integer;
begin
  select jsonb_array_length(q.choices)
  into choice_count
  from public.review_questions q
  where q.id = new.question_id;

  if choice_count is null or new.correct_choice_index >= choice_count then
    raise exception 'Correct choice index is outside the question choice range';
  end if;

  return new;
end;
$$;

create trigger review_question_answers_validate
before insert or update on public.review_question_answers
for each row execute function private.validate_review_answer();

create or replace function private.refresh_chaburah_member_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_chaburah_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_chaburah_id := old.chaburah_id;
  else
    affected_chaburah_id := new.chaburah_id;
  end if;

  update public.chaburos
  set member_count = (
    select count(*)::integer
    from public.chaburah_members membership
    where membership.chaburah_id = affected_chaburah_id
      and membership.status = 'active'
  )
  where id = affected_chaburah_id;

  if tg_op = 'UPDATE' and old.chaburah_id <> new.chaburah_id then
    update public.chaburos
    set member_count = (
      select count(*)::integer
      from public.chaburah_members membership
      where membership.chaburah_id = old.chaburah_id
        and membership.status = 'active'
    )
    where id = old.chaburah_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger chaburah_members_refresh_count
after insert or update or delete on public.chaburah_members
for each row execute function private.refresh_chaburah_member_count();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set
    email = coalesce(new.email, ''),
    full_name = coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      full_name
    )
  where id = new.id;

  return new;
end;
$$;

revoke all on function public.handle_user_updated() from public;

create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_user_updated();

insert into public.profiles (id, email, full_name)
select
  users.id,
  coalesce(users.email, ''),
  coalesce(users.raw_user_meta_data ->> 'full_name', '')
from auth.users users
on conflict (id) do nothing;

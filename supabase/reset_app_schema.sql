-- DESTRUCTIVE: removes all mySCP application schema objects and data.
-- This preserves Supabase Auth users and Supabase system schemas.
-- Run only when intentionally rebuilding a disposable development project.

begin;

-- Remove Storage policies created by the mySCP RLS migration, if present.
drop policy if exists learning_files_storage_select on storage.objects;
drop policy if exists learning_files_storage_insert on storage.objects;
drop policy if exists learning_files_storage_update on storage.objects;
drop policy if exists learning_files_storage_delete on storage.objects;

-- Remove current and legacy mySCP tables. CASCADE also removes their RLS
-- policies, triggers, foreign keys, and dependent objects.
drop table if exists public.ask_rav_questions cascade;
drop table if exists public.review_session_answers cascade;
drop table if exists public.review_sessions cascade;
drop table if exists public.review_question_answers cascade;
drop table if exists public.review_questions cascade;
drop table if exists public.learning_files cascade;
drop table if exists public.resources cascade;
drop table if exists public.announcements cascade;
drop table if exists public.role_requests cascade;
drop table if exists public.schedules cascade;
drop table if exists public.chaburah_members cascade;
drop table if exists public.group_members cascade;
drop table if exists public.profiles cascade;
drop table if exists public.chaburos cascade;
drop table if exists public.groups cascade;

-- Remove public RPC/helper functions from both the old starter schema and
-- the new draft. Catalog lookup avoids referencing an enum type that may
-- already have been removed by a partial reset.
do $$
declare
  function_record record;
begin
  for function_record in
    select procedure.oid::regprocedure as function_signature
    from pg_proc procedure
    join pg_namespace namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'handle_new_user',
        'handle_user_updated',
        'is_global_admin',
        'is_group_member',
        'can_manage_group',
        'join_chaburah',
        'leave_chaburah',
        'set_current_chaburah',
        'check_review_answer',
        'complete_review_session',
        'admin_set_user_role',
        'review_role_request'
      )
  loop
    execute format(
      'drop function if exists %s cascade',
      function_record.function_signature
    );
  end loop;
end;
$$;

-- Remove the private helper schema from the new draft, if it was partially
-- applied. It contains only mySCP helper functions.
drop schema if exists private cascade;

-- Remove current and legacy enum types after dependent tables/functions.
drop type if exists public.role_request_status cascade;
drop type if exists public.ask_rav_status cascade;
drop type if exists public.review_question_kind cascade;
drop type if exists public.learning_file_type cascade;
drop type if exists public.content_visibility cascade;
drop type if exists public.membership_status cascade;
drop type if exists public.membership_role cascade;
drop type if exists public.chaburah_status cascade;
drop type if exists public.group_member_role cascade;
drop type if exists public.app_role cascade;

-- Supabase intentionally blocks direct SQL deletion from Storage tables.
-- Leave the learning-files bucket in place. Migration 2 safely creates it or
-- updates its configuration with ON CONFLICT.

commit;

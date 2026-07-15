-- Pilot cleanup for disposable test content.
--
-- Run this only when you are ready to replace test content with real pilot data.
-- This keeps Auth users, profiles, chaburos, memberships, roles, chaburah
-- settings, and notification preferences intact.
--
-- Storage note:
-- Supabase blocks direct deletion from storage tables.
-- Before or after this script, delete old objects from the `learning-files`
-- bucket through the Supabase Storage UI or Storage API.
--
-- Optional checks before running:
-- select 'announcements' as table_name, count(*) from public.announcements
-- union all select 'ask_rav_questions', count(*) from public.ask_rav_questions
-- union all select 'discussion_messages', count(*) from public.discussion_messages
-- union all select 'discussion_reads', count(*) from public.discussion_reads
-- union all select 'learning_files', count(*) from public.learning_files
-- union all select 'notifications', count(*) from public.notifications
-- union all select 'review_questions', count(*) from public.review_questions
-- union all select 'review_sessions', count(*) from public.review_sessions;

begin;

delete from public.notifications;

delete from public.discussion_reads;
delete from public.discussion_messages;

delete from public.review_session_answers;
delete from public.review_sessions;
delete from public.review_question_answers;
delete from public.review_questions;

delete from public.ask_rav_questions;
delete from public.learning_files;
delete from public.announcements;

commit;

-- Checkpoint 6: notification type for new Ask Rav questions.
-- Run this before 202607130002_ask_rav_question_notifications.sql.

do $$
begin
  if not exists (
    select 1
    from pg_type typ
    join pg_enum enum_value
      on enum_value.enumtypid = typ.oid
    join pg_namespace namespace
      on namespace.oid = typ.typnamespace
    where namespace.nspname = 'public'
      and typ.typname = 'notification_type'
      and enum_value.enumlabel = 'ask_rav_questions'
  ) then
    alter type public.notification_type add value 'ask_rav_questions';
  end if;
end
$$;

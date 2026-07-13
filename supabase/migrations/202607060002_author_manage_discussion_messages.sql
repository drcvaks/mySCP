-- Checkpoint 6: allow authors to edit or remove their own active discussion messages.
-- These RPCs avoid granting broad participant update access to the table.

create or replace function public.update_discussion_message(
  target_message_id uuid,
  new_body text
)
returns public.discussion_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_message public.discussion_messages;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if length(btrim(new_body)) = 0 or length(new_body) > 4000 then
    raise exception 'Message must be between 1 and 4000 characters';
  end if;

  update public.discussion_messages message
  set body = btrim(new_body)
  where message.id = target_message_id
    and message.author_id = (select auth.uid())
    and message.status = 'active'
    and private.is_active_chaburah_member(message.chaburah_id)
  returning *
  into updated_message;

  if updated_message.id is null then
    raise exception 'Message not found or cannot be edited';
  end if;

  return updated_message;
end;
$$;

create or replace function public.delete_discussion_message(target_message_id uuid)
returns public.discussion_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_message public.discussion_messages;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  update public.discussion_messages message
  set
    body = 'Message deleted by author.',
    status = 'deleted'
  where message.id = target_message_id
    and message.author_id = (select auth.uid())
    and message.status = 'active'
    and private.is_active_chaburah_member(message.chaburah_id)
  returning *
  into deleted_message;

  if deleted_message.id is null then
    raise exception 'Message not found or cannot be deleted';
  end if;

  return deleted_message;
end;
$$;

revoke all on function public.update_discussion_message(uuid, text) from public;
revoke all on function public.delete_discussion_message(uuid) from public;
grant execute on function public.update_discussion_message(uuid, text) to authenticated;
grant execute on function public.delete_discussion_message(uuid) to authenticated;

-- Summer 5787 pilot. Apply after learning programs and rich learning content.
-- No learning content is imported, deleted, or moved between programs.
begin;

do $target$
begin
  if not exists (select 1 from public.chaburos where id = '70a993a2-7668-4775-aa46-7ac82117d35b') then
    raise exception 'Rabbi Elyada chaburah 70a993a2-7668-4775-aa46-7ac82117d35b was not found. Nothing changed.';
  end if;
end;
$target$;

alter table public.learning_programs add column early_access boolean not null default false;
create table public.learning_program_chaburos (
  program_id text not null references public.learning_programs(id) on delete cascade,
  chaburah_id uuid not null references public.chaburos(id) on delete cascade,
  primary key (program_id, chaburah_id)
);
alter table public.learning_program_chaburos enable row level security;
revoke all on public.learning_program_chaburos from anon, authenticated;
grant select on public.learning_program_chaburos to authenticated;
create policy program_grants_read on public.learning_program_chaburos for select to authenticated
using (private.is_global_admin() or private.is_active_chaburah_member(chaburah_id));

create function private.can_access_learning_program(target_program_id text, target_chaburah_id uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.learning_programs program where program.id = target_program_id
    and (not program.early_access or private.is_global_admin() or exists (
      select 1 from public.learning_program_chaburos access
      join public.chaburah_members member on member.chaburah_id = access.chaburah_id
      where access.program_id = program.id and member.user_id = (select auth.uid())
        and member.status = 'active'
        and (target_chaburah_id is null or access.chaburah_id = target_chaburah_id)
    ))
  );
$$;
revoke all on function private.can_access_learning_program(text, uuid) from public;
grant execute on function private.can_access_learning_program(text, uuid) to authenticated;

drop policy learning_programs_read on public.learning_programs;
create policy learning_programs_read on public.learning_programs for select to authenticated
using (private.can_access_learning_program(id));

-- Restrictive policies supplement, not replace, all existing role/membership rules.
do $policies$
declare target text;
begin
  foreach target in array array['review_questions','review_packets','learning_files','review_sessions','chaburah_programs'] loop
    execute format('create policy early_access_scope on public.%I as restrictive for all to authenticated
      using (private.can_access_learning_program(program_id, chaburah_id))
      with check (private.can_access_learning_program(program_id, chaburah_id))', target);
  end loop;
end;
$policies$;
create policy early_access_scope on public.content_chunks as restrictive for all to authenticated
using (private.can_access_learning_program(program_id))
with check (private.can_access_learning_program(program_id));
create policy early_access_links on public.content_chunk_links as restrictive for select to authenticated
using (exists (select 1 from public.content_chunks where id = parent_chunk_id)
   and exists (select 1 from public.content_chunks where id = related_chunk_id));
create policy early_access_items on public.review_packet_items as restrictive for all to authenticated
using (exists (select 1 from public.review_packets where id = packet_id))
with check (exists (select 1 from public.review_packets where id = packet_id));
create policy early_access_answers on public.review_question_answers as restrictive for all to authenticated
using (exists (select 1 from public.review_questions where id = question_id))
with check (exists (select 1 from public.review_questions where id = question_id));

-- Definer RPCs bypass RLS, so validate writes after clone/file inheritance triggers.
-- SQL Editor/service imports with no signed-in user remain possible.
create function private.guard_program_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_row jsonb;
begin
  -- The existing chaburah-creation trigger initializes counters for every
  -- program. An empty counter grants no access; RLS still protects direct inserts.
  if tg_table_name = 'chaburah_programs' and tg_op = 'INSERT' then return new; end if;
  target_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if (select auth.uid()) is not null and not private.can_access_learning_program(
    target_row->>'program_id', (target_row->>'chaburah_id')::uuid
  ) then
    raise exception 'This learning program is not available for your chaburah';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
do $guards$
declare target text;
begin
  foreach target in array array['review_questions','review_packets','learning_files','review_sessions','chaburah_programs','content_chunks'] loop
    execute format('create trigger zz_guard_program_access before insert or update or delete on public.%I
      for each row execute function private.guard_program_write()', target);
  end loop;
end;
$guards$;

create function private.guard_default_program()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not private.can_access_learning_program(new.default_program_id, new.id) then
    raise exception 'This learning program cannot be the default for your chaburah';
  end if;
  return new;
end;
$$;
create trigger guard_default_program before insert or update of default_program_id on public.chaburos
for each row execute function private.guard_default_program();
revoke all on function private.guard_program_write(), private.guard_default_program() from public;

create or replace view public.review_packet_content_coverage as
select packet.chaburah_id, packet.week, packet.id as packet_id, packet.title as packet_title,
  item.chunk_id, chunk.chunk_code, chunk.section_key, chunk.section_title, chunk.source_type,
  packet.published_at, packet.program_id
from public.review_packets packet
join public.review_packet_items item on item.packet_id = packet.id
join public.content_chunks chunk on chunk.id = item.chunk_id
where packet.status = 'published'::public.review_packet_status
  and (packet.program_id = 'summer-5786' or private.learning_program_client())
  and private.can_access_learning_program(packet.program_id, packet.chaburah_id);

create or replace function public.check_review_answer(target_question_id uuid, selected_choice_index integer)
returns table (is_correct boolean, explanation text)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  return query select answer.correct_choice_index = selected_choice_index, answer.explanation
  from public.review_questions question
  join public.review_question_answers answer on answer.question_id = question.id
  where question.id = target_question_id and question.enabled and question.publication_status = 'published'
    and private.can_read_content(question.visibility, question.chaburah_id)
    and private.can_access_learning_program(question.program_id, question.chaburah_id);
  if not found then raise exception 'Question not found or not accessible'; end if;
end;
$$;
revoke all on function public.check_review_answer(uuid, integer) from public;
grant execute on function public.check_review_answer(uuid, integer) to authenticated;

-- Official assets are shared by hash. Authorize through any permitted referring
-- chunk, including images in footnotes, rather than duplicating the asset.
create function private.can_read_official_material(target_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_global_admin() or exists (
    select 1 from public.content_chunks chunk
    where private.can_access_learning_program(chunk.program_id)
      and jsonb_path_exists(coalesce(chunk.content_document, '{}'::jsonb),
        '$.**.storagePath ? (@ == $path)', jsonb_build_object('path', target_path))
  );
$$;
revoke all on function private.can_read_official_material(text) from public;
grant execute on function private.can_read_official_material(text) to authenticated;
drop policy official_materials_read on storage.objects;
create policy official_materials_read on storage.objects for select to authenticated
using (bucket_id = 'official-learning-materials' and private.can_read_official_material(name));

create or replace function private.can_read_learning_file_path(target_storage_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.learning_files file
    where file.storage_path = target_storage_path
      and private.can_read_content(file.visibility, file.chaburah_id)
      and private.can_access_learning_program(file.program_id, file.chaburah_id));
$$;

create or replace function private.can_manage_learning_file_path(target_storage_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.learning_files file
    where file.storage_path = target_storage_path
      and (private.is_global_admin() or (file.chaburah_id is not null and private.can_manage_chaburah(file.chaburah_id)))
      and private.can_access_learning_program(file.program_id, file.chaburah_id));
$$;

insert into public.learning_programs(id, name, topic, default_week, archived, early_access)
values ('summer-5787', 'Summer 5787', 'Hilchos Tefillin', 1, false, true);
insert into public.learning_program_chaburos(program_id, chaburah_id)
values ('summer-5787', '70a993a2-7668-4775-aa46-7ac82117d35b');
-- Counters exist independently for all chaburos, but access is NOT granted by a counter row.
insert into public.chaburah_programs(chaburah_id, program_id, current_week)
select id, 'summer-5787', 1 from public.chaburos;
update public.chaburos set default_program_id = 'summer-5787'
where id = '70a993a2-7668-4775-aa46-7ac82117d35b';

notify pgrst, 'reload schema';
commit;

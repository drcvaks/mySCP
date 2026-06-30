-- Separate file coverage from weekly numbering.
-- Weekly files keep a week number. Bechina Review and Entire Zman files do not.

do $$
begin
  create type public.file_coverage as enum ('week', 'bechina_review', 'entire_zman');
exception
  when duplicate_object then null;
end $$;

alter table public.learning_files
  add column if not exists coverage public.file_coverage not null default 'week';

update public.learning_files
set coverage = 'entire_zman'
where week is null;

alter table public.learning_files
  drop constraint if exists learning_files_week_coverage_check;

alter table public.learning_files
  add constraint learning_files_week_coverage_check
  check (
    (coverage = 'week'::public.file_coverage and week is not null)
    or (coverage <> 'week'::public.file_coverage and week is null)
  );

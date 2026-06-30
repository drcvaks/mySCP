-- Allow learning files to apply to the whole zman/test instead of one specific week.

alter table public.learning_files
  alter column week drop not null;

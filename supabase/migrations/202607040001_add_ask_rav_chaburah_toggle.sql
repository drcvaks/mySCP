-- Allow each chaburah to opt in or out of participant Ask Rav submissions.

alter table public.chaburos
  add column if not exists ask_rav_enabled boolean not null default true;

-- Development-only seed data.
-- This file does not create users because Supabase Auth owns auth.users.

insert into public.chaburos (
  id,
  name,
  slug,
  address,
  city,
  state,
  country,
  rabbi_name,
  schedule_text,
  status,
  discussion_enabled,
  join_requires_approval
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Ohel Moshe',
    'ohel-moshe-baltimore',
    '2808 Smith Avenue, Baltimore, MD 21209',
    'Baltimore',
    'MD',
    'United States',
    'Rav Shmuel Kimche',
    'Sunday 9:15 AM',
    'active',
    false,
    false
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Shomrei Emunah',
    'shomrei-emunah-baltimore',
    '6221 Greenspring Ave, Baltimore, MD 21209',
    'Baltimore',
    'MD',
    'United States',
    'Rav Binyamin Marwick',
    'Wednesday 8:00 PM',
    'active',
    false,
    false
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Suburban Orthodox Congregation Toras Chaim',
    'suburban-orthodox-baltimore',
    '7504 Seven Mile Lane, Baltimore, MD 21208',
    'Baltimore',
    'MD',
    'United States',
    'Rav Shmuel Silber',
    'Monday 8:00 PM',
    'active',
    false,
    false
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'Vaks Test Chaburah',
    'vaks-test-chaburah',
    'Wonderful Place, Baltimore, MD 21208',
    'Baltimore',
    'MD',
    'United States',
    'Rav Chaim Vaks',
    'Sunday 8:00 PM',
    'active',
    false,
    false
  )
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  address = excluded.address,
  city = excluded.city,
  state = excluded.state,
  country = excluded.country,
  rabbi_name = excluded.rabbi_name,
  schedule_text = excluded.schedule_text,
  status = excluded.status,
  discussion_enabled = excluded.discussion_enabled,
  join_requires_approval = excluded.join_requires_approval;

with actor as (
  select id
  from public.profiles
  where role = 'global_admin'
  order by created_at
  limit 1
)
insert into public.announcements (
  id,
  chaburah_id,
  title,
  body,
  visibility,
  is_pinned,
  posted_by
)
select
  '20000000-0000-4000-8000-000000000001'::uuid,
  null::uuid,
  'Practical Kashrus zman has begun',
  'This zman focuses on kitchen kashrus, Nat Bar Nat, and the wine sugya.',
  'everyone'::public.content_visibility,
  true,
  actor.id
from actor
union all
select
  '20000000-0000-4000-8000-000000000002'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  'Week 1 source sheet is ready',
  'Please review the mareh mekomos before Sunday''s chaburah.',
  'chaburah'::public.content_visibility,
  false,
  actor.id
from actor
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  visibility = excluded.visibility,
  is_pinned = excluded.is_pinned,
  posted_by = excluded.posted_by;

with actor as (
  select id
  from public.profiles
  where role = 'global_admin'
  order by created_at
  limit 1
)
insert into public.learning_files (
  id,
  chaburah_id,
  title,
  description,
  topic,
  week,
  file_type,
  visibility,
  external_url,
  uploaded_by
)
select
  '30000000-0000-4000-8000-000000000001'::uuid,
  null::uuid,
  'Week 1 Source Sheet: Nat Bar Nat Foundations',
  'Official starter source sheet for Week 1.',
  'Nat Bar Nat & Kitchen Kashrus',
  1,
  'source_sheet'::public.learning_file_type,
  'everyone'::public.content_visibility,
  'https://www.sefaria.org/',
  actor.id
from actor
union all
select
  '30000000-0000-4000-8000-000000000002'::uuid,
  null::uuid,
  'Week 1 Review Summary',
  'Official review summary for Week 1.',
  'Nat Bar Nat & Kitchen Kashrus',
  1,
  'review_sheet'::public.learning_file_type,
  'everyone'::public.content_visibility,
  'https://www.sefaria.org/',
  actor.id
from actor
union all
select
  '30000000-0000-4000-8000-000000000003'::uuid,
  null::uuid,
  'Stam Yeinam Intro Link',
  'Introductory link for the wine section.',
  'Stam Yeinam & Wine',
  7,
  'link'::public.learning_file_type,
  'everyone'::public.content_visibility,
  'https://www.sefaria.org/',
  actor.id
from actor
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  topic = excluded.topic,
  week = excluded.week,
  file_type = excluded.file_type,
  visibility = excluded.visibility,
  external_url = excluded.external_url,
  uploaded_by = excluded.uploaded_by;

with actor as (
  select id
  from public.profiles
  where role = 'global_admin'
  order by created_at
  limit 1
)
insert into public.review_questions (
  id,
  chaburah_id,
  topic,
  week,
  prompt,
  kind,
  choices,
  visibility,
  enabled,
  created_by
)
select
  '40000000-0000-4000-8000-000000000001'::uuid,
  null::uuid,
  'Nat Bar Nat & Kitchen Kashrus',
  1,
  'Nat Bar Nat discussions often begin with which general kitchen scenario?',
  'multiple_choice'::public.review_question_kind,
  '["Clean pareve food cooked in a clean meat pot", "Wine touched by a non-Jew", "Checking lettuce", "Lighting candles"]'::jsonb,
  'everyone'::public.content_visibility,
  true,
  actor.id
from actor
union all
select
  '40000000-0000-4000-8000-000000000002'::uuid,
  null::uuid,
  'Nat Bar Nat & Kitchen Kashrus',
  1,
  'A chaburah review quiz should show feedback after an answer.',
  'true_false'::public.review_question_kind,
  '["True", "False"]'::jsonb,
  'everyone'::public.content_visibility,
  true,
  actor.id
from actor
union all
select
  '40000000-0000-4000-8000-000000000003'::uuid,
  null::uuid,
  'Stam Yeinam & Wine',
  7,
  'Week 7 begins the wine section of the zman.',
  'true_false'::public.review_question_kind,
  '["True", "False"]'::jsonb,
  'everyone'::public.content_visibility,
  true,
  actor.id
from actor
on conflict (id) do update set
  topic = excluded.topic,
  week = excluded.week,
  prompt = excluded.prompt,
  kind = excluded.kind,
  choices = excluded.choices,
  visibility = excluded.visibility,
  enabled = excluded.enabled,
  created_by = excluded.created_by;

with answers(question_id, correct_choice_index, explanation) as (
  values
    (
      '40000000-0000-4000-8000-000000000001'::uuid,
      0::smallint,
      'The core kitchen case starts with transferred taste from clean utensils and pareve food.'
    ),
    (
      '40000000-0000-4000-8000-000000000002'::uuid,
      0::smallint,
      'Immediate feedback helps participants review before the bechina.'
    ),
    (
      '40000000-0000-4000-8000-000000000003'::uuid,
      0::smallint,
      'The roadmap places Stam Yeinam and wine from Week 7 onward.'
    )
)
insert into public.review_question_answers (
  question_id,
  correct_choice_index,
  explanation
)
select
  answers.question_id,
  answers.correct_choice_index,
  answers.explanation
from answers
join public.review_questions question
  on question.id = answers.question_id
on conflict (question_id) do update set
  correct_choice_index = excluded.correct_choice_index,
  explanation = excluded.explanation;

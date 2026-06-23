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

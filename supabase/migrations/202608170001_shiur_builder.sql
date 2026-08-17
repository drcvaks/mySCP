-- Add the Rabbi Hub Shiur Builder pilot.
-- Review packets are built from controlled official content chunks and published into Files.

do $$
begin
  create type public.content_source_type as enum ('notes', 'qa', 'intro', 'pace');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.content_difficulty as enum ('core', 'advanced', 'practical');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.review_packet_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

alter type public.learning_file_type add value if not exists 'custom_review_packet';

create table if not exists public.content_chunks (
  id uuid primary key default gen_random_uuid(),
  chunk_code text not null unique,
  source_type public.content_source_type not null,
  siman text not null,
  workbook_title text not null,
  section_key text not null,
  section_title text not null,
  chunk_title text not null,
  chunk_summary text,
  content_markdown text not null,
  sort_order integer not null,
  official_shiur_number smallint,
  estimated_minutes smallint,
  difficulty public.content_difficulty not null default 'core',
  tags text[] not null default '{}',
  source_file_name text,
  source_start_page integer,
  source_end_page integer,
  is_selectable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_chunk_links (
  id uuid primary key default gen_random_uuid(),
  parent_chunk_id uuid not null references public.content_chunks(id) on delete cascade,
  related_chunk_id uuid not null references public.content_chunks(id) on delete cascade,
  relation_type text not null default 'related_qa' check (relation_type in ('related_qa', 'related_note')),
  created_at timestamptz not null default now(),
  unique (parent_chunk_id, related_chunk_id, relation_type)
);

create table if not exists public.review_packets (
  id uuid primary key default gen_random_uuid(),
  chaburah_id uuid not null references public.chaburos(id) on delete cascade,
  title text not null,
  week smallint not null check (week between 1 and 52),
  siman text not null default 'Siman 95 Part 1',
  status public.review_packet_status not null default 'draft',
  created_by uuid not null references public.profiles(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_packet_items (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.review_packets(id) on delete cascade,
  chunk_id uuid not null references public.content_chunks(id) on delete restrict,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  unique (packet_id, chunk_id),
  unique (packet_id, sort_order)
);

alter table public.learning_files
  add column if not exists review_packet_id uuid references public.review_packets(id) on delete set null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'learning_files'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%storage_path%'
      and pg_get_constraintdef(con.oid) like '%external_url%'
  loop
    execute format('alter table public.learning_files drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.learning_files
  add constraint learning_files_location_or_packet_check
  check (
    storage_path is not null
    or external_url is not null
    or review_packet_id is not null
  );

create index if not exists content_chunks_source_idx
  on public.content_chunks (siman, source_type, sort_order);

create index if not exists review_packets_chaburah_week_idx
  on public.review_packets (chaburah_id, week, status, updated_at desc);

create index if not exists review_packet_items_packet_idx
  on public.review_packet_items (packet_id, sort_order);

create unique index if not exists learning_files_review_packet_id_idx
  on public.learning_files (review_packet_id)
  where review_packet_id is not null;

drop trigger if exists content_chunks_set_updated_at on public.content_chunks;
create trigger content_chunks_set_updated_at
before update on public.content_chunks
for each row execute function private.set_updated_at();

drop trigger if exists review_packets_set_updated_at on public.review_packets;
create trigger review_packets_set_updated_at
before update on public.review_packets
for each row execute function private.set_updated_at();

alter table public.content_chunks enable row level security;
alter table public.content_chunk_links enable row level security;
alter table public.review_packets enable row level security;
alter table public.review_packet_items enable row level security;

grant select on public.content_chunks to authenticated;
grant select on public.content_chunk_links to authenticated;
grant select, insert, update, delete on public.review_packets to authenticated;
grant select, insert, update, delete on public.review_packet_items to authenticated;

drop policy if exists content_chunks_select on public.content_chunks;
create policy content_chunks_select
on public.content_chunks
for select
to authenticated
using (is_selectable = true or private.is_global_admin());

drop policy if exists content_chunk_links_select on public.content_chunk_links;
create policy content_chunk_links_select
on public.content_chunk_links
for select
to authenticated
using (true);

drop policy if exists review_packets_select on public.review_packets;
create policy review_packets_select
on public.review_packets
for select
to authenticated
using (
  private.is_global_admin()
  or created_by = (select auth.uid())
  or private.can_manage_chaburah(chaburah_id)
  or (
    status = 'published'::public.review_packet_status
    and private.is_active_chaburah_member(chaburah_id)
  )
);

drop policy if exists review_packets_insert on public.review_packets;
create policy review_packets_insert
on public.review_packets
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and private.can_manage_chaburah(chaburah_id)
  and status = 'draft'::public.review_packet_status
);

drop policy if exists review_packets_update on public.review_packets;
create policy review_packets_update
on public.review_packets
for update
to authenticated
using (
  status = 'draft'::public.review_packet_status
  and (
    created_by = (select auth.uid())
    or private.can_manage_chaburah(chaburah_id)
  )
)
with check (
  status = 'draft'::public.review_packet_status
  and (
    created_by = (select auth.uid())
    or private.can_manage_chaburah(chaburah_id)
  )
);

drop policy if exists review_packets_delete on public.review_packets;
create policy review_packets_delete
on public.review_packets
for delete
to authenticated
using (
  status = 'draft'::public.review_packet_status
  and (
    created_by = (select auth.uid())
    or private.can_manage_chaburah(chaburah_id)
  )
);

drop policy if exists review_packet_items_select on public.review_packet_items;
create policy review_packet_items_select
on public.review_packet_items
for select
to authenticated
using (
  exists (
    select 1
    from public.review_packets packet
    where packet.id = review_packet_items.packet_id
      and (
        private.is_global_admin()
        or packet.created_by = (select auth.uid())
        or private.can_manage_chaburah(packet.chaburah_id)
        or (
          packet.status = 'published'::public.review_packet_status
          and private.is_active_chaburah_member(packet.chaburah_id)
        )
      )
  )
);

drop policy if exists review_packet_items_insert on public.review_packet_items;
create policy review_packet_items_insert
on public.review_packet_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.review_packets packet
    where packet.id = review_packet_items.packet_id
      and packet.status = 'draft'::public.review_packet_status
      and (
        packet.created_by = (select auth.uid())
        or private.can_manage_chaburah(packet.chaburah_id)
      )
  )
);

drop policy if exists review_packet_items_delete on public.review_packet_items;
create policy review_packet_items_delete
on public.review_packet_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.review_packets packet
    where packet.id = review_packet_items.packet_id
      and packet.status = 'draft'::public.review_packet_status
      and (
        packet.created_by = (select auth.uid())
        or private.can_manage_chaburah(packet.chaburah_id)
      )
  )
);

create or replace function public.publish_review_packet(target_packet_id uuid)
returns public.learning_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_packet public.review_packets;
  file_record public.learning_files;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select *
  into source_packet
  from public.review_packets packet
  where packet.id = target_packet_id;

  if not found then
    raise exception 'Packet not found';
  end if;

  if not private.can_manage_chaburah(source_packet.chaburah_id) then
    raise exception 'Chaburah manager access required';
  end if;

  if not exists (
    select 1
    from public.review_packet_items item
    where item.packet_id = source_packet.id
  ) then
    raise exception 'Add at least one section before publishing';
  end if;

  update public.review_packets
  set status = 'published'::public.review_packet_status,
      published_at = coalesce(published_at, now())
  where id = source_packet.id;

  insert into public.learning_files (
    chaburah_id,
    title,
    description,
    topic,
    coverage,
    week,
    file_type,
    visibility,
    review_packet_id,
    uploaded_by
  )
  values (
    source_packet.chaburah_id,
    source_packet.title,
    'Custom review packet prepared from official SCP material.',
    source_packet.siman,
    'week'::public.file_coverage,
    source_packet.week,
    'custom_review_packet'::public.learning_file_type,
    'chaburah'::public.content_visibility,
    source_packet.id,
    (select auth.uid())
  )
  on conflict (review_packet_id) where review_packet_id is not null
  do update set
    title = excluded.title,
    description = excluded.description,
    topic = excluded.topic,
    coverage = excluded.coverage,
    week = excluded.week,
    file_type = excluded.file_type,
    visibility = excluded.visibility,
    chaburah_id = excluded.chaburah_id,
    uploaded_by = excluded.uploaded_by
  returning * into file_record;

  return file_record;
end;
$$;

revoke all on function public.publish_review_packet(uuid) from public;
grant execute on function public.publish_review_packet(uuid) to authenticated;

insert into public.content_chunks (
  chunk_code, source_type, siman, workbook_title, section_key, section_title,
  chunk_title, chunk_summary, content_markdown, sort_order, official_shiur_number,
  estimated_minutes, difficulty, tags, source_file_name
)
values
('95-A1', 'notes', 'Siman 95 Part 1', 'Notes for Siman 95 (part 1)', 'intro', 'Introduction', 'Introduction to the Zman', 'Overview of the zman and the opening topic of parve food cooked in meat or dairy utensils.', $chunk$סימן צה

Introduction to Zman

Bez”H, this zman we will learn some of the most common halachosin יורה דעה, including whether you are allowed to use a dishwasher for meat and milk, how to manage a kitchen with one sink, buying canned vegetables without a hechsher, drinking wine that was poured by a non-Jew or non-religious Jew, whether you may leave wine unattended in your home with a non-Jew,and much more! We will begin the zmanwith siman 95, which discusses one of the most prevalent issues in our kitchens – the status of parve food cooked in a fleishig or dairy pot. Even if you werenot with us last zmanwhen we learned the halachosof basar b’chalav, you will still be able to jump in easily to this limud.$chunk$, 10, 1, 3, 'core', ARRAY['intro','siman-95'], 'Notes for Siman 95 (part 1).docx'),
('95-B1', 'notes', 'Siman 95 Part 1', 'Notes for Siman 95 (part 1)', 'nat-bar-nat', 'נ״ט בר נ״ט', 'Nat Bar Nat — Opening Kitchen Cases', 'Kitchen examples that introduce the sugya.', $chunk$נ״ט בר נ״ט

In this section, we will learn the halachosof parve food cooked in a fleishig pot and whether you may eat it with cheese. For example, if you make pasta in a fleishig pot, can you later add cheese and heat it up in the microwave? If you fryparve eggs in a dairy pan, can you eat them with leftover potatoes from Shabbos that were baked in a fleishig oven? Are you allowed to fry fish in a dairy pan and place it on a fleishig plate? This sugyais known as “נ״ט בר נ״ט,” as will be explained below, and we will learn it from its original sources in the Gemarathrough the modern-day posskim.$chunk$, 20, 1, 4, 'core', ARRAY['nat-bar-nat','cases'], 'Notes for Siman 95 (part 1).docx'),
('95-B2', 'notes', 'Siman 95 Part 1', 'Notes for Siman 95 (part 1)', 'nat-bar-nat', 'נ״ט בר נ״ט', 'Basar B’chalav Flavor Background', 'Taam kikar, ben-yomo, and eino ben-yomo background.', $chunk$As a mini-introduction, the Torah in three places forbids cooking meat and milk together, and included in this prohibition is eating meat and milk that were cooked together. The גמרא פסחים (מד.) teaches that not only is the mixture of actual meat and milk forbidden, but even the mixture and fusion of meat and milk flavor is prohibited. This is known as טעם כעיקר – the flavor of meat/milk has the status of meat/milk itself. Therefore, milk cooked in a clean fleishig pot is forbidden because the meat flavor absorbed in the walls of the pot enters the milk (see גמרא חולין (צז.)). However, the גמרא עבודה זרה (עה:) teaches that flavor absorbed in the walls of a pot only stays potent for 24 hours (while the pot is ben-yomo). After 24 hours, the absorbed flavor becomes pagum– defective, and can no longer forbid food subsequently cooked inside the pot. Therefore, if you cook milk in a fleishig pot that hasnot been used for 24 hours (eino ben-yomo), the milk is permitted (but the pot needs to be kashered). All of the above is passkinedin the S”A in סימן פז-א וסימן צג-א.$chunk$, 30, 1, 5, 'core', ARRAY['basar-bchalav','taam'], 'Notes for Siman 95 (part 1).docx'),
('95-B3', 'notes', 'Siman 95 Part 1', 'Notes for Siman 95 (part 1)', 'gemara', 'Gemara', 'Gemara: Rav vs. Shmuel', 'The Gemara in Chullin and the basic definition of Nat Bar Nat.', $chunk$In our siman, we will discuss the status of parve food cooked in a fleishigor dairy pot and whether it may be eaten with the opposite type of food. The גמרא חולין (קיא:) (1) quotes a dispute between Rav and Shmuel regarding the status of hot parve fish placed on a fleishig ben-yomo plate.  According to Rav, the fish may not be eaten with dairy because it absorbed meat flavor from the plate. Shmuelpasskins that the fish may be eaten with dairy because the meat flavor in the fish is ״נותן טעם בר נותן טעם (נ"ט בר נ"ט)״ – lit. “imparts flavor to something which itself imparts flavor.” In other words, the meat flavor in the fish is weakened because it first transferred from the meat to the plate and only afterward from the plate to the fish. When you later eחat dairy together with the fish, this indirect transfer does not create a sufficiently significant fusion of meat and milk flavor that would forbid the fish. The Gemarapasskins like Shmuel.$chunk$, 40, 1, 5, 'core', ARRAY['gemara','rav','shmuel'], 'Notes for Siman 95 (part 1).docx'),
('95-B4', 'notes', 'Siman 95 Part 1', 'Notes for Siman 95 (part 1)', 'tosfos', 'Tosfos', 'Why Nat Bar Nat Works', 'Tosfos explains why weakened meat or milk flavor does not create basar b’chalav.', $chunk$Tosfos in זבחים (צו.) ד״ה ואם(2)explains that the prohibition of basar b’chalav takes effect only when both the meat and milk flavor are strong and fuse together (e.g., cooking milk in a fleishig pot).But in our case, the meat flavor in the fish was weakened twice (from the meat to the plate and from the plate to the fish);thus, when the fish is later mixed with dairy, there is no fusion of strong meat and milk flavor.$chunk$, 50, 1, 4, 'core', ARRAY['tosfos','reason'], 'Notes for Siman 95 (part 1).docx'),
('95-B5', 'notes', 'Siman 95 Part 1', 'Notes for Siman 95 (part 1)', 'tosfos', 'Tosfos', 'Nat Bar Nat Does Not Apply to Issurim', 'Tosfos limits the leniency to basar b’chalav.', $chunk$What emerges from here is that the leniencyof נ״ט בר נ״ט applies only to basar b’chalav (where the fusion of flavors forbids the food), but if something is inherently forbidden,נ״ט בר נ״טdoes not apply. Therefore, if you cook non-kosher meat in a pot, then clean the pot and cook water in it, the water is forbidden and not considered נ״ט בר נ״ט. Furthermore, if you transfer that water to another pot after it cooled off and heat it up, the second pot becomes treif because it absorbed flavor from the non-kosher water.$chunk$, 60, 1, 4, 'core', ARRAY['tosfos','issurim'], 'Notes for Siman 95 (part 1).docx'),
('95-B6', 'notes', 'Siman 95 Part 1', 'Notes for Siman 95 (part 1)', 'rishonim', 'Rishonim', 'Rishonim Dispute', 'The main Rishonim positions about cooked, fried, and plated fish.', $chunk$Although we passkinlike Shmuel, the בית יוסף (3) quotes a three-way dispute among the Rishonim on how to understand the words of the Gemara״דגים שעלו בקערה״, which Shmuel permitted, and the דרכי משהquotes a fourth opinion which contains elements of several of the opinions quoted in the בית יוסף.

ריב״ןquoting his father-in-law, Rashi – Shmuel only allowed eating the fish with dairy when the hot fish was placed on a fleishig plate, but if the fish was cooked or fried in a fleishig pot/pan, it may not be eaten with dairy. He explains that when a hot piece of fish is placed on a cold fleishig plate, only a little bit of flavor is absorbed in the fish – up to a כדי קליפה. However, when the fish is cooked or fried in a fleishig pot/pan, the fish completely absorbs the flavor of the meat and may not be eaten with dairy.

ספר התרומה, רא״ש וטור– Shmuel even allowed fish that was cooked in a fleishig pot because the meat flavor is weakened 3 times:from the meat to the pot, from the pot to the water, and from the water to the fish. However, fish that was fried in a pan may not be eaten with dairy because it was only weakened twice: From the meat to the pan and from the pan directly into the fish.

רמב״ם – Shmuel allows eating the fish with dairy even if it was fried in a fleishig pan because the meat flavor was weakened twice: from meat to the pan and from pan to the fish; the cheese was added only after.

איסור והיתר(quoted by the דרכי משה) – le’chatchilla, if fish was either cooked or fried in a fleishig pot/pan, you should not eat it with dairy (like the ריב"ן), but if dairy was mistakenly added to it, it may be eaten, even if the fish was fried in afleishig pan (like the רמב״ם). Furthermore, everyone would agree that you are allowed to place hot fish that was cooked in a fleishig pot/pan on a dairy plate. Lastly, we are only machmirnot to eat fish cooked in a fleishig pot/pan with dairy if the pot/pan is ben-yomo (and the meat flavor is still strong). However, if the pot/pan is eino ben-yomo, the fish may be eaten with dairy le’chatchilla.$chunk$, 70, 1, 10, 'core', ARRAY['rishonim'], 'Notes for Siman 95 (part 1).docx'),
('95-B7', 'notes', 'Siman 95 Part 1', 'Notes for Siman 95 (part 1)', 'psak', 'S”A and Rama', 'S”A vs. Rama', 'How the S”A, Rama, Kitzur, and practical takeaway fit together.', $chunk$The S”A in סעיף א׳passkins like the רמב״ם that fish which has already been cooked or fried in a clean fleishig pot may be eaten with dairy. However, if the pot/pan was not cleaned properly (and there are still meat particles on them), you may only eat the fish with dairy if there is shishimin the fish against the meat. The S”A in סעיף ב׳clarifies that the halacha of נ״ט בר נ״ט (that the flavor weakens through multiple transfers) applies only when the parve item is cooked without meat after the pot was previously used for meat, but if the parve item is cooked in the pot together with meat, the parve item absorbs strong meat flavor. Therefore, an egg cooked together with meat may not be eaten with dairy.

The Rama in סעיף ב'argues on the S”A and passkins like the איסור והיתר that fish cooked or fried in a fleishig ben-yomo pot/pan may not be eaten le’chatchillawith dairy, but if dairy was already added to it, it may be eaten, because in truth, we follow the opinion thatנ״ט בר נ״ט is permitted. The פרי חדש (א) and יד יהודה (ט) explain that the prohibition of intentionally adding cheese to the fishis an added הרחקה, a safeguard to the laws of basar b’chalav,but in essence, it is permitted.Therefore, if the food was already mixed with dairy, it is permitted (even if it was intentionally mixed).

The קיצור שו״ע (ס״ו פ״א-ז)clarifies that although according to the Rama, it is prohibited to intentionally mix parve food cooked in a fleishig pot with dairy (and vice versa), you are allowed to eat parve food cooked in a ben-yomo dairy pot during a fleishig meal, either before or after the meat.

TheRama adds four more halachos, three of which we will learn now: 1) Fish that was cooked in a fleishig ben-yomo pan may be placed on a clean dairy plate. 2) If the fish was cooked in a parve pan and placed on a fleishig plate, you may le’chatchillaeat the fish with dairy (after removing it from the plate). 3) Fish cooked in an eino ben-yomo fleishigfrying pan may le’chatchillabe eaten with dairy (and vice versa).

What emerges according to the S”A is that if plain spaghetti was cooked in a fleishig ben-yomo pot, you may le’chatchillaadd cheese to the spaghetti. The Rama would forbid deliberately adding cheese, but if cheese was already added, you may eat it. Additionally, if the spaghetti was made in an eino ben-yomo pot, the Rama allows le’chatchillaadding cheese to it.$chunk$, 80, 1, 10, 'core', ARRAY['shulchan-aruch','rama'], 'Notes for Siman 95 (part 1).docx'),
('95-B8', 'notes', 'Siman 95 Part 1', 'Notes for Siman 95 (part 1)', 'intentional-cooking', 'Intentional Cooking', 'Intentionally Cooking Pareve for Later Dairy/Meat', 'Whether one may cook pareve in one type of pot intending to eat with the other type.', $chunk$The question we need to ask, both according to the S”A and Rama,is whether one is allowed to intentionally cook parve food in a fleishig pot knowing that he will later add cheese to it (according to the S”A, even a ben-yomo pot, and according to the Rama,only an eino ben-yomo pot). This could happen on erev-Shabbos when all your fleishig pots are already being used and you would like to make spaghetti for a spaghetti and meat dish. According to the S”A, are you allowed to deliberately use a ben-yomo dairy pot to cook the spaghetti, and according to the Rama are you allowed to deliberately use an eino ben-yomo dairy pot?

Rav Yosef Karo in בדק הבית (4) (the edits he made to his בית יוסף) quotes רבינו ירוחם, who only allows eating the fish with dairy once it was already cooked, but intentionally cooking it in a ben-yomo fleishig pan to be eaten with dairy is forbidden (and in our case, one would not be allowed to cook the spaghetti in a dairy pot knowing it will later be mixed with meat). Rav Yosef Karo argues and passkins that it is permitted even intentionally.

From the language of the S”A, ״שנתבשלו או שנצלו״ – “that were already cooked or fried,” it seems that one may not deliberately cook fish in fleishig dishes with the intention of eating it with dairy, and this is how the ש״ך(ג), בן איש חי (קרח שנה ב-יג),and כף החיים (צה-ט)passkin. However, Rav Ovadya in הליכות עולם (ח״ז-עמ׳ עד)(5)passkins that even cooking fish with intention to eat it later with dairy is allowed. In the footnote,he brings many proofs to this, including that the בדק הבית was written by Rav Yosef Karo after he wrote the S”A, and thus he retracted what he wrote in the S”A.

Regarding the Rama, the גר״א(י), as explained by the בדה״ש (ביאורים ד״ה אם היה) (6), writes that the Rama allows cookingparve food in an eino ben-yomo dairy pot even if you intend to later add meat to it. He explains that in general, one is not allowed to cook meat in a dairy eino ben-yomo pot, even though the food will not become forbidden since the dairy flavor is pagum, because Chazal were concerned that you might come to use a ben-yomo pot. However, in our case, even if you cook parve in a dairy ben-yomo pot, the Rama agrees that m’ikarha’dinit may be eaten with meat.Therefore, Chazal would never forbid cooking parve in an eino ben-yomo pot lest you come to use a ben-yomo pot, because strictly speaking, the ben-yomo pot itself is permitted.

The חכמת אדם (מח-ב) (7) argues that the Rama only allows eating the fish with dairy if it was already cooked in an eino ben-yomo fleishig pot, but you may not intentionally cook it in aneino ben-yomo fleishig pot in order to add dairy to it later. However, the חכמת אדם (מח-ב)passkins that if you do not have other pots or cannot borrow, you may rely on the גר״א.Rav Elyashivquoted by Rav Forst (p. 162) passkins like the חכמת אדם.$chunk$, 90, 1, 10, 'advanced', ARRAY['intentional-cooking'], 'Notes for Siman 95 (part 1).docx'),
('95-B9', 'notes', 'Siman 95 Part 1', 'Notes for Siman 95 (part 1)', 'summary', 'Summary', 'Summary Rules', 'Concise review of the main practical rules.', $chunk$To summarize:

Everyone agrees that if dairy was already added to parve food cooked in a ben-yomo pot or pan (after the food was removed from the pot), it may be eaten.

Everyone agrees that dairy may be added to parve food cooked in an eino ben-yomo fleishig pot/pan.

S”A – You may add dairy to parve food cooked in a ben-yomo fleishig pot (after the food was removed from pot).

ש״ך – You may not cook parve food with intention to add dairy.

Rav Ovadya – You may even cook it with intention to add dairy.

Rama –You may not add dairy to parve food cooked in a ben-yomo pot, but if added it is permitted.

Rama –Dairy may be added to parve food cooked in an eino ben-yomo fleishig pot/pan.

Gra – You may cook the parve food in eino ben-yomo pot with intention to later add dairy.

חכ״א –You may later add dairy only if parve food was already cooked in an eino ben-yomo pot, but if you have no other pots, you may rely on the Gra.

According to the Rama, parve food cooked in a ben-yomo fleishig pot may be placed on a dairy plate.

Hot parve food cooked in a parve pot and placed on a fleishig plate may be eaten later with dairy (Gemara above quoted by Rama).$chunk$, 100, 1, 6, 'core', ARRAY['summary'], 'Notes for Siman 95 (part 1).docx')
on conflict (chunk_code) do update set
  chunk_title = excluded.chunk_title,
  chunk_summary = excluded.chunk_summary,
  content_markdown = excluded.content_markdown,
  sort_order = excluded.sort_order,
  tags = excluded.tags,
  updated_at = now();

insert into public.content_chunks (
  chunk_code, source_type, siman, workbook_title, section_key, section_title,
  chunk_title, chunk_summary, content_markdown, sort_order, official_shiur_number,
  estimated_minutes, difficulty, tags, source_file_name
)
values
('95-Q1', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'What does נ״ט בר נ״ט stand for?', null, $chunk$What does נ״ט בר נ״ט stand for? What does it mean?

It stands for נותן טעם בר נותן טעםand literally means “imparts flavor to something which itself imparts flavor.”The גמרא חולין (1) records a dispute regarding whether parve food which was placed on a fleishigben yomo plate may be eaten with dairy –Rav forbids and Shmuel permits. Tosfos (2) explains that the halacha follows Shmuel because basarb’chalav is only forbidden when there is a fusion of strong meat and dairy flavor. However, the meat flavor in the fish is weakened because it was transferred from the meat to the plate and then from the plate to the fish (i.e., it is נ״ט בר נ״ט), and when the fish is subsequently mixed with dairy, there isno fusion of strong meat and milk flavor.$chunk$, 200, 1, 3, 'core', ARRAY['qa','model'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q2', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Cottage cheese with spaghetti from a fleishig pot', null, $chunk$Your wife enters the kitchen and sees you eating cottage cheese with spaghetti that you just took out of the fridge. She yells, “Stop! I made the spaghetti in a fleishigpot!” What do you do?

There is a dispute between the S”A and Rama whether you may add cheese to parve food cooked in a ben-yomo pot. The S”A permits, and the Rama forbids, but the Ramaagrees that if cheese was already added, it may be eaten. Therefore, in the above question, everyone agrees you may eat the mixture of cottage cheese and spaghetti. See the answer to the next question for the halacha concerning an eino ben-yomo pot.$chunk$, 210, 1, 3, 'core', ARRAY['qa','model'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q3', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Adding more cottage cheese and spaghetti', null, $chunk$Before you answer her, you get up and add some more cottage cheese and spaghetti to your bowl from the fridge. A stare-off ensues. What are you doing?

If the pot used to cook the pasta was ben-yomo, only Sephardim allow intentionally adding cheese. However, if the pot was eino ben-yomo, even the Rama agrees that you may add cheese to the spaghetti.$chunk$, 220, 1, 3, 'core', ARRAY['qa','model'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q4', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Heating the spaghetti in a dairy pan', null, $chunk$You then tell your wife, “I’m in the mood for plain hot pasta.” You take out the spaghetti from the fridge, place it in a dairy ben-yomo pan and heat it up. She is aghast. Is it time you join SCP?

If the spaghetti was made in an eino ben-yomo pot, everyone agrees it is permitted. If it  was made in a ben-yomo pot, Sephardim would permit. Regarding Ashkenazim, the ט״זpasskins that according to the Rama,this should not be done le’chatchilla, because it is similar to adding actual cheese to pasta cooked in a ben-yomo fleishig pot. However, the ערה״ש (12) permits because ultimately, the meat flavor in the pasta is weakened.$chunk$, 230, 1, 3, 'advanced', ARRAY['qa'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q5', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Hot spaghetti on a dairy plate', null, $chunk$The next night, your wife makes parve spaghetti in a fleishig ben-yomo pot. You really want to drive her crazy so you place the hot spaghetti on a dairy ben-yomo plate. Did you now cross the line? Did you treif-up the plate?

The Rama passkins that the food is permitted and Rav Moshe (11) adds that you may even do this le’chatchilla(assuming you are placing a solidon the plate, such as spaghetti, as we will discuss in the future), though the פמ״ג is machmir.$chunk$, 240, 1, 3, 'advanced', ARRAY['qa'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q6', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Cooking eggs in a dairy pot erev Shabbos', null, $chunk$You make a special meat egg salad every Shabbos. It’s erev-Shabbos, you forgot to boil the eggs earlier on Friday and now all the fleishig pots are already being used. Can you intentionally use a dairy pot to cook the eggs?

According to Sephardim, Rav Ovadya (5) permits even if the pot is ben-yomo(though some Sephardi posskimare machmirlike the Rama). According to Ashkenazim, if the pot is ben-yomo it is certainly forbidden. If the pot is eino ben-yomo, the גר״א, as understood by the בדה״ש (6), permits, but the חכ״א(7) forbids unless, like in the question, you have no other pots and no one to borrow from.$chunk$, 250, 1, 3, 'advanced', ARRAY['qa','model'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q7', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Mixing potatoes and broccoli cooked in different pots', null, $chunk$You come home from work late at night and are starving. In the fridge, you see potatoes that were cooked in a ben-yomo fleishig pot and broccoli that was boiled in a ben-yomo dairy pot. Can you mix them together and eat them?

Everyone agrees this is permitted because both meat and cheese flavors are weakened (i.e., they are נ״ט בר נ״ט) and there is no fusion of strong meat and dairy flavor.$chunk$, 260, 1, 2, 'core', ARRAY['qa','model'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q8', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'What is DE?', null, $chunk$What’s the deal with “DE” on hechsheirim?

DE stands for Dairy Equipment and means that the product was made on dairy machines. According to Sephardim, it is fully parve and may be eaten with meat. According to Ashkenazim, if they were made on ben-yomo machines, they are נ״ט בר נ״ט and may not be eaten with meat. They may be eaten at the same meal that meat is served, either before or after the meat, but not together. (According to the ערה״ש, you may heat up parve food cooked in DE in a fleishig ben-yomo pot, but the ט״ז argues).$chunk$, 270, 1, 3, 'practical', ARRAY['qa','de'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q9', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Fried onions from an eino ben-yomo fleishig pan', null, $chunk$You decide to be an amazing husband and offer to make breakfast – an onion omelet with cheese. Luckily, there are already fried onions in the fridge that were made with an eino ben-yomo fleishig pan. As you are about to add the cheese, your wife says “Wait! You can’t do that!” Is she right? Why would it be forbidden if it’s נ״ט בר נ״ט from an eino ben-yomo pan?

The Rama in סעיף ב׳passkins that a davarcharif, such as onions, has the power to reawaken and strengthen eino ben-yomo flavor to the point that it doesnot get weakened when transferred from the pan to the onion. Therefore, the onions are not viewed as נ״ט בר נ״ט from an eino ben-yomo pan, but as actual fleishig,because the meat flavor went from the meat to the pan, and when it transfers from the pan to the onion, it didnot weaken. Therefore, the above onions may not be used with cheese. The S”A in סימן צוpasskins that a davarcharifcan only retain the strong flavor from a ben-yomo pot. Therefore, in the above case,Sephardim would allow eating the onions with cheese, but if the onions were made in a ben-yomo fleishig pan, they may not be eaten with cheese.$chunk$, 280, 1, 4, 'practical', ARRAY['qa','davar-charif'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q10', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Does Nat Bar Nat work from food to food?', null, $chunk$A yeshiva guy is making a geshmaksalami sandwich and finds a grilled portobello mushroom in the fridge. He is about to add it to his sandwich when one roommate says that it was made in a dairy pot. The other roommate says that the pan was eino ben-yomo, and a third roommate adds that it was made with broccoli, which was in the same pan with cheese two days ago. Does נ״ט בר נ״ט only work from food to the pot and from the pot to food, or also from one food to another?

There is a three-way dispute regarding whether נ״ט בר נ״טappliesonly when the first transfer of flavor is into a pot or whether it applies even when the flavor transfers first to food. The פמ״ג, כף החייםand ערה״ש(13) hold that נ״ט בר נ״ט applies only when the first transfer of flavor is into a pot, and in the above case the mushroom may not be added to the meat sandwich. The חוות דעת and יד יהודה(14) passkinthat as long as there is one transfer of flavor into a kli, נ״ט בר נ״ט is applied, even if it is the second transfer of flavor. But in the above case, where the dairy flavor went from cheese to broccoli and from broccoli to mushroom, the mushroom may still not be eaten with meat. The פני אריהand Rav Ovadya (15) passkinthat נ״ט בר נ״ט applies even when the flavor only transfers between foods, and the above mushroom may be eaten with meat because it is considered נ״ט בר נ״ט.$chunk$, 290, 1, 5, 'advanced', ARRAY['qa'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q11', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Can you use one sous vide for meat and dairy?', null, $chunk$Can you use the same sous vide for meat and dairy?

Rav Ovadya (17) passkins like the בית אפרים, who holds that נ״ט בר נ״ט applies even while cooking.Accordingly, a sous vide may be used for both meat and milk because it only absorbs נ״ט בר נ״ט flavor from the food being cooked. The מנחת חן (17) passkins le’chatchillalike the חוות דעת, who holds that נ״ט בר נ״ט does not apply during cooking. Therefore, a sous vide is considered to absorb flavor directly from the food being cooked, and you would need two sous vides, one for dairy and one for meat. The מנחת חןadds that if a great loss of money is involved, we rely on the opinion that נ״ט בר נ״ט applies during cooking as well.$chunk$, 300, 1, 4, 'practical', ARRAY['qa','sous-vide'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q12', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Challah on a cholent pot', null, $chunk$Before going to shul on Shabbos morning, you place the challahdirectly on the cholent pot. Can you eat that challah with dairy?

According to the חוות דעת and מנחת חן (16), the challah is fleishig and may not be eaten with dairy. According to the בית אפרים and Rav Ovadya (17), the challah is נ״ט בר נ״ט (such that according to the S”A it may be eaten with dairy, and according to the Rama,it may not be eaten with dairy, but if it already came in contact with dairy, it is permitted).$chunk$, 310, 1, 3, 'practical', ARRAY['qa'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q13', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Canned green beans without a hechsher', null, $chunk$You are traveling for business and are very hungry. You enter the local supermarket and see canned green beans with a label that says “Ingredients: Green beans and water” – that’s it. You are about to buy them when your frum friend, who is traveling with you, yells, “Hey! I thought you keep kosher!” Are you not allowed to buy them?

Canned vegetables without a hechsher should not be bought, both according to the S”A and Rama, because they are heated in machines either together with non-kosher food or with water that was used to cook non-kosher foods (see notes for more details on how canned foods are heated). Since נ״ט בר נ״ט only applies to basar b’chalav and not to non-kosher foods, as the ערה״ש (18) explains, the non-kosher flavor enters the canned green beans and forbids them.$chunk$, 320, 1, 3, 'practical', ARRAY['qa','canned'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q14', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Grilling meat and fish', null, $chunk$The next Sunday you make a BBQ for your friends.When your frum friend arrives, he’s in shock! “What are you, a goy?How are you grilling meat and fish on the same grill?” Is he right?

As long as the grill is clean(which might be hard to achieve) and uncovered, and the meat and fish are not touching one another, you are allowed to grill fish and meat simultaneously (see ילקוט יוסף (30)). If you accidentally close the lid of the grill, the Rama(23) wouldpasskinthat it is still permitted because there was only a fusion of ריחא, but you should not do so intentionally.$chunk$, 330, 1, 3, 'practical', ARRAY['qa','fish-meat'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q15', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Gefilte fish dropped into chicken soup', null, $chunk$True story: You had one job – to place the frozen gefilte fish in the pot of water that is on the fire. You were not paying attention and dropped it instead into the chicken soup. What is the status of the soup and fish?

The S”A (23) passkins that fish and meat which mix together are forbidden if there isn’t shishim in one against the other.However,Rav Wosner (32) passkins that in the above case, if you quickly remove the fish before it defrosts, it is permitted, but otherwise everything is forbidden.$chunk$, 340, 1, 3, 'practical', ARRAY['qa','fish-meat'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q16', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Le’chaim between fish and meat', null, $chunk$The le’chaimbetween fish and meat – isthat a real thing or another Jewish excuse to drink?

It’s a real thing. The S”A (23) passkins that one is obligated to wash his hands and mouth in between fish and meat, and theRama writes that it is onlybest to rinse the mouth. The מאיר עוז (34) quotes that the חזו״א, Steipler,and Rav Shach would wash their hands in between fish and meatand rinse their mouths by making a le’chaim.$chunk$, 350, 1, 2, 'practical', ARRAY['qa','fish-meat'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q17', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Sushi and meat on the same table', null, $chunk$You are at a Japanese restaurant and they serve you sushi and a meat dish.Can you keep them both on the table at the same time? What do you need to do in between eating them?

Rav Yochanan Wosner (35) passkins that you may place them on same table.He explains that we are not worried you will eat them together since mixing them is dangerous. The כף החיים (קטזסקל״ה) (36) argues that you are not allowed to place fish and meat at the table on which you are eating because we are worried that you might grab a piece of meat and then fish without washing in between. However, everyone agrees that in between eating the sushi and meat, you must make sure to clean your utensils so you don’t come to eat meat and fish together. Additionally, the S”A requires washing your hands and mouth in between eating them, while the Rama passkins that it is best to rinse your mouth in between.$chunk$, 360, 1, 4, 'practical', ARRAY['qa','fish-meat'], 'Q&A''s Siman 95 (part 1).docx'),
('95-Q18', 'qa', 'Siman 95 Part 1', 'Q&A''s Siman 95 (part 1)', 'qa', 'Q&A', 'Worcestershire sauce with meat', null, $chunk$The sauce that no one can pronounce – Worcestershire sauce – can you use it with meat?

There is a halachic debate whether something that is prohibited due to its dangerous nature can ever be batelb’shishim.Most posskimassume that a mixture of meat and fish can be batelb’shishim. The Worcestershire sauces that do not have a “fish” label are either made with no fish or with fish that was alreadybatelb’shishim. Rav Belsky (37) passkins that when the fish is batelb’shishim, the manufacture should still write “fish” in the ingredients for those who want to be machmirand not relyon bitulof dangerous substances. When a “fish” label is added to thehechsher,that means the fish content in the sauce is not batelb’shishimand should not be eaten with meat. Rav Belsky writes that although some may end up eating the sauce with meat, a hechsher may still be given because those individuals can rely on the מג״א(24), who passkins that the danger of mixing meat and fish might not apply today.$chunk$, 370, 1, 4, 'practical', ARRAY['qa','fish-meat'], 'Q&A''s Siman 95 (part 1).docx')
on conflict (chunk_code) do update set
  chunk_title = excluded.chunk_title,
  chunk_summary = excluded.chunk_summary,
  content_markdown = excluded.content_markdown,
  sort_order = excluded.sort_order,
  tags = excluded.tags,
  updated_at = now();

insert into public.content_chunk_links (parent_chunk_id, related_chunk_id, relation_type)
select parent.id, related.id, 'related_qa'
from public.content_chunks parent
join public.content_chunks related
  on (
    (parent.chunk_code in ('95-B3', '95-B4') and related.chunk_code in ('95-Q1', '95-Q2'))
    or (parent.chunk_code = '95-B7' and related.chunk_code in ('95-Q2', '95-Q3', '95-Q4', '95-Q5', '95-Q6', '95-Q7', '95-Q8'))
    or (parent.chunk_code = '95-B5' and related.chunk_code = '95-Q13')
  )
on conflict (parent_chunk_id, related_chunk_id, relation_type) do nothing;

# mySCP — Worldwide Beis Midrash
## Codex implementation specification and product brief

**Status:** Proposed feature; build incrementally inside the existing mySCP Expo/React Native + Supabase app.  
**Audience:** SCP Rabbonim worldwide, plus authorized SCP administrators/content editors.  
**Not:** A replacement for the participant-facing My Chaburah discussion, or an automatically authoritative halachic ruling system.

---

## 1. The goal, in plain English

SCP Rabbonim worldwide currently exchange Torah questions, explanations, notes corrections, practical chaburah teaching advice, handouts, recordings, and administrative questions in a single WhatsApp group. Valuable discussions get buried among unrelated messages; questions are revisited without finding previous answers; resources and corrections are difficult to retrieve.

Build a **worldwide, Rabbi-only Beis Midrash** inside **Rabbi Hub** that makes those exchanges searchable, organized, and connected to the official SCP curriculum. A Rav should be able to ask a question in seconds, link it optionally to a specific official Notes chunk, receive threaded replies, find an earlier discussion, and save useful resources. Other Rabbonim should be able to reuse shared material when preparing their shiurim. Keep distinctions between informal Rabbi contributions and officially reviewed SCP content very clear.

**Primary outcomes:**
1. Find old questions by zman, section, Notes chunk, keyword, category, author, or status.
2. Preserve one topic per thread, with replies grouped under it instead of in one continuous feed.
3. Use stable Notes chunk codes to connect discussions with existing Shiur Builder and review preparation.
4. Build a shared, reusable Rabbi resource collection (PDFs, documents, audio/video links, websites, quizzes, teaching ideas).
5. Provide an editorial feedback pipeline for possible Notes/source/question corrections without silently editing official material.
6. Keep WhatsApp for quick alerts initially; share deep links to permanent app discussions.

### Example of how this works
A Rav teaching Hafrashas Challah encounters the discussion around the Chazon Ish and entering Eretz Yisrael with a king or Navi. In Rabbi Hub > Beis Midrash he posts **“What is the basis of the Chazon Ish's king/Navi requirement?”**, selects the current zman and chunk **HC1-B3**, and adds the relevant source. Replies stay together. Later another Rav opens **HC1-B3** from Shiur Builder and sees the discussion and related handouts. If someone believes the official Notes need clarification, an authorized editor may link an editorial issue to the thread. **A discussion being marked Answered is never equivalent to an official p'sak.**

---

## 2. Site navigation and information architecture

**Rabbi Hub** (existing)
- **Shiur Builder** (existing; integrate, do not rewrite)
- **Beis Midrash** (new worldwide cross-chaburah community)
  - **Torah Discussions** (structured threads)
  - **Resources** (shared resource library; can also be accessed as a filtered view within Beis Midrash)
  - **Notes & Question Feedback** (editorial issues; restricted actions)
  - **SCP Program & Chaburah Questions** (logistics, curriculum distribution, bechina dates, teaching arrangements, admin)
- Existing Rabbi question tools and other Rabbi Hub items (preserve)
- Existing admin screens (preserve; expose new moderation/editorial tools where authorized)

Do NOT confuse or merge **worldwide Rabbi Beis Midrash** with **My Chaburah** discussions/files. My Chaburah is local and may be participant-visible; worldwide Beis Midrash is for authenticated, authorized Rabbonim and administrators only. Neither participants nor the public should see Beis Midrash posts, metadata, attachments, search results, or deep-link previews.

### Categories (user-facing)
- **Torah & Halacha** — questions, lomdus, sources, practical cases
- **Notes Clarification** — explanations/interpretations of official notes
- **Teaching Ideas** — demonstrations, presentation strategies, classroom approaches
- **Resources & Materials** — handouts, recordings, quizzes, external links
- **SCP Program** — scheduling, bechinos, booklets, certificates, program logistics
- **General SCP** — other SCP-related discussions (including prior zmanim)

Categories should be selectable but not overcomplicated. One main category per thread; optional tags. A thread may link to **zero, one, or several** Notes chunks; do not require a chunk to create a post. `zman_id` may also be nullable for general cross-zman topics. Support Hebrew and English and RTL content.

---

## 3. Key screens and interactions

### A. Beis Midrash home / discussion list
- Prominent **Ask a Question / Start Discussion** action.
- Search across thread titles, body text, replies (subject to RLS); consider full-text search later.
- Filters: current/previous zman, category, section, official Notes chunk, Open/Answered/Needs Clarification/Archived, unanswered, following, bookmarked, newest/recent activity.
- Thread cards: title, concise excerpt, author display name, zman, chunk badges, category, reply count, last activity, discussion status; official editorial badge ONLY when authorized.
- Empty states and mobile-friendly layout; pagination (or server-side infinite scroll), not entire thread collection loaded at once.

### B. New discussion
Required: title, question/body, category. Optional: zman, multiple linked Notes chunks, sources/citations, file or link attachment, tags.
- Notes chunks picker uses existing `content_chunks` rows and stable `chunk_code` values, with section/title filters.
- Make chunk selection optional and forgiving: do not force Rabbonim to identify the exact code.
- The user can revise or add chunk links later, within permission rules.
- Save is immediate. Errors must not silently discard drafted text.

### C. Thread page
- Original post followed by chronological **threaded replies** (one nesting level is sufficient for v1; show who replies to whom). No disconnected global chat feed.
- Reply, edit own post/reply, add link/file, quote, bookmark/follow, share deep link, report content.
- Clearly show discussion status and related Notes chunks; link back to official Notes preview and Shiur Builder.
- Status: **Open**, **Answered** (questioner/moderator marked addressed), **Needs Official Clarification** (editorial issue), **Archived**.
- A different, access-controlled **Official SCP Clarification** marker may be applied ONLY by authorized content editors, with the approving identity/date and content-version context. Do not label informal opinions as definitive halacha.
- Avoid likes/downvotes in v1; value careful, sourced discussion over popularity.

### D. Shared Resources
- **Share Resource**: title, type (`pdf`, `document`, `audio_link`, `video_link`, `website`, `quiz`, `teaching_tip`, `other`), description, link or upload, optional zman/chunk links, tags, attribution/credit, language, and visibility.
- Resource cards: type icon, concise title, author, linked topic, preview/open/download and discussion link.
- Filter by zman/section/chunk/type/keyword and perhaps language.
- Distinguish **Official SCP**, **Rabbi-Contributed**, and **My Chaburah** resources. *Official SCP* is an authority-controlled designation; not any uploader's choice.
- For videos and large recordings, prefer an external YouTube (unlisted if appropriate), Google Drive, or other approved streaming link rather than uploading big videos to Supabase. Check URL reachability and permission from the submitter.
- Resource submitted to worldwide library is visible to authorized worldwide Rabbonim. If existing Files architecture is reused, keep its public/participant scopes separate from this new visibility.

### E. Notes & Question Feedback (editorial pipeline)
- Any authorized Rav can flag a possible typo, source reference, inaccurate formulation, ambiguous ruling, or review question issue; ideally initiated directly from chunk or question.
- Link to `content_chunk` and/or existing review question identifier; attach discussion and supporting references.
- Editorial states: `submitted`, `under_review`, `needs_more_info`, `accepted`, `declined`, `fixed_in_version`.
- Only named content editors/global admins can set official editorial dispositions or change published official material.
- Preserve original claim, reporter, conversation, decision, approver, time, and content version; do not mutate official notes automatically.
- An official clarification is separate from community thread status. If editors accept a change, update the source through the **existing source publication workflow** after review.

### F. Shiur Builder integration
For each selected `content_chunks.chunk_code`, show contextual links to:
1. Related Rabbi discussions, sorted by relevance/activity.
2. Shared teaching resources.
3. Notes feedback/official clarifications.
4. Existing related review questions (do not duplicate that logic).

A Rav may open these while planning. Do NOT automatically insert private Rabbi replies into a participant-facing review packet. An explicit, separately permissioned action could later copy/attach an approved resource into a local chaburah packet.

### G. Notifications
- v1: **Follow thread** and an in-app unread indicator for new replies; an optional email digest is later phase.
- Mentions and notifications should avoid leaking thread contents to unauthorized recipients.
- Use persistent DB storage for replies; Supabase Realtime is an **optional** enhancement for actively opened threads, not the source of truth. Subscribe only while viewing a thread; unsubscribe upon leaving; avoid per-user global subscriptions.

---

## 4. Permissions and safety

This is a **worldwide private professional space**. Access must be enforced in Supabase RLS and backend, not only hidden from the app navigation.

Roles (map to existing auth/role implementation; do NOT create parallel role systems blindly):
- **Participant** — no access to worldwide Beis Midrash tables, storage objects, or search.
- **Rabbi** — read all worldwide discussions/resources, start thread, reply, upload/share permitted resources, edit/delete own content, report/flag issues, follow/bookmark. Cannot grant official approval.
- **Local admin** — grant access **only if already authorized as a Rabbi or explicitly empowered for worldwide access**. Do not assume every local admin is a worldwide Rabbi.
- **Global admin / designated moderator** — moderate, archive/hide reported content, enforce community rules; not automatically an authority for halachic editorial approval unless designated.
- **Official content editor** — can issue approved clarification, change editorial states, and manage official-resource designations subject to existing publication controls.

Privacy/abuse controls:
- No anonymous/public viewing. Avoid leaking phone numbers, emails, hidden permissions, or file paths in UI/URLs.
- Sanitize rich text/Markdown and validate external links; prevent XSS and unsafe HTML.
- Validate MIME, extension, size, and access for uploads; use **private** Supabase Storage bucket and signed URLs or authenticated download endpoint for authorized Rabbis. Never assume that an unguessable public URL is private.
- Constrain upload rates/sizes and posts per account to discourage spam. Keep audit trail of moderation and official approvals.
- Soft-delete/moderate rather than hard-destroy threads with valuable replies. Enforce foreign keys and indexes.
- Avoid exposing private discussions via search engine indexing, public exports, or push/email previews.
- Separate community opinion from official curriculum; include a notice: discussions are for Rabbonim and not a substitute for responsible halachic review/psak.

**Existing WhatsApp export privacy warning:** It contains phone numbers, personal discussion, missing media and at least one set of login credentials. Do NOT ingest it into the live app, commit it to the repo, upload it to public storage, or treat it as public material. Ask owners to change shared credentials if active. If importing later, create a private staging queue with redaction and consent/permission before posting historical authorship or excerpts. Do not build automatic WhatsApp scraping/sync in v1.

---

## 5. Supabase data model — proposed, adapt to existing schema

**FIRST inspect** the existing repo, existing Supabase migrations, auth profiles/roles, `content_chunks`, `review_packets`, `review_packet_items`, question tables, chaburah scopes, file storage architecture, and RLS helpers. Reuse stable identifiers and conventions. Do not rename or rewrite those objects merely for this feature. Names below are proposed; adjust to existing names while preserving behavior.

### Core tables

**`bm_threads`**
- `id uuid PK default gen_random_uuid()`
- `author_id uuid NOT NULL REFERENCES auth.users(id)`
- `title text NOT NULL`, `body text NOT NULL`
- `category text NOT NULL` (CHECK enum-like values)
- `zman_id uuid NULL` referencing existing zman/program entity when available
- `status text NOT NULL DEFAULT 'open'` (`open`,`answered`,`needs_clarification`,`archived`)
- `language text NULL` (`en`,`he`,`mixed`)
- `tags text[] NOT NULL DEFAULT '{}'`
- `is_hidden boolean NOT NULL DEFAULT false` (moderation)
- `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`, `last_activity_at timestamptz DEFAULT now()`
- Optional `accepted_reply_id uuid NULL` for a community-highlighted response; **never label it official automatically**.

**`bm_replies`**
- `id uuid PK`, `thread_id uuid NOT NULL FK bm_threads ON DELETE CASCADE`, `author_id uuid NOT NULL FK auth.users`
- `parent_reply_id uuid NULL FK bm_replies` (limit nesting in UI)
- `body text NOT NULL`, `is_hidden boolean DEFAULT false`, `created_at`, `updated_at`.

**`bm_thread_chunks`** (many-to-many)
- `thread_id uuid NOT NULL FK bm_threads ON DELETE CASCADE`
- `content_chunk_id uuid NOT NULL FK existing content_chunks` (if stable)
- `PRIMARY KEY (thread_id, content_chunk_id)`.
- Always resolve by `chunk_code` when ingesting/migrating and maintain the existing code; do **not** duplicate Notes text.
- If chunks can be versioned/replaced, use a stable `chunk_code` plus existing content-version reference rather than a transient row id.

**`bm_resources`**
- `id uuid PK`, `author_id uuid FK auth.users`, `thread_id uuid NULL FK bm_threads`
- `title text NOT NULL`, `description text`, `resource_type text NOT NULL`, `language text`.
- `external_url text NULL`, `storage_path text NULL` — at least one; private storage for uploaded files.
- `zman_id uuid NULL`, `tags text[] DEFAULT '{}'`, `source_label text DEFAULT 'rabbi_contributed'` (`rabbi_contributed`, `official_scp` controlled by role)
- `visibility text DEFAULT 'worldwide_rabbonim'` for this feature; do not implement public export through it.
- `is_hidden boolean DEFAULT false`, `created_at`, `updated_at`.

**`bm_resource_chunks`**
- `resource_id uuid FK bm_resources ON DELETE CASCADE`, `content_chunk_id uuid FK content_chunks`, composite PK.

**`bm_follows`**
- `user_id uuid FK auth.users`, `thread_id uuid FK bm_threads ON DELETE CASCADE`, `created_at`, composite PK.

**`bm_bookmarks`** (optional if follow is distinct)
- `user_id`, `thread_id`, `created_at`, composite PK.

**`bm_content_feedback`**
- `id uuid PK`, `author_id uuid FK auth.users`, `thread_id uuid NULL FK bm_threads`
- `content_chunk_id uuid NULL FK existing content_chunks`, `question_id uuid NULL FK existing questions (if available)`
- `issue_type text NOT NULL` (`typo`,`source_reference`,`halachic_clarification`,`question_wording`,`other`)
- `description text NOT NULL`, `suggested_change text NULL`, `status text DEFAULT 'submitted'`
- `editor_id uuid NULL FK auth.users`, `editor_note text NULL`, `resolved_content_version text NULL`, `decided_at timestamptz NULL`, `created_at`, `updated_at`.

**`bm_official_clarifications`**
- `id uuid PK`, `thread_id uuid NOT NULL FK bm_threads`, `content_chunk_id uuid NULL FK content_chunks`
- `body text NOT NULL`, `approved_by uuid NOT NULL FK auth.users`, `approved_at timestamptz NOT NULL`, `source_version text NULL`, `created_at`.
- Only approved editors can insert/update. Keep immutable approval audit or append-only history.

**`bm_reports`**
- `id uuid PK`, `reporter_id uuid FK auth.users`, `thread_id uuid NULL`, `reply_id uuid NULL`, `resource_id uuid NULL`
- `reason text`, `status text DEFAULT 'open'`, `handled_by uuid NULL`, `handled_at timestamptz NULL`, `created_at`.

**`bm_notifications`** (optional v1)
- `id uuid PK`, `recipient_id uuid FK auth.users`, `thread_id uuid FK bm_threads`, `event_type text`, `actor_id uuid`, `read_at timestamptz NULL`, `created_at`.

### Keys, constraints, indexes
- Validate category/status/type via CHECK constraints or existing Postgres enums (avoid unnecessary type churn).
- Index `bm_threads(zman_id, last_activity_at DESC)`, `bm_threads(category, last_activity_at DESC)`, `bm_threads(status, last_activity_at DESC)`, `bm_replies(thread_id, created_at)`, and both chunk junction tables on their `content_chunk_id`.
- Create a search index for title/body (Postgres FTS, optionally `pg_trgm` if extension available); respect RLS on search RPC.
- Maintain `updated_at`, `last_activity_at` via safe trigger or application mutation. Realtime only on scoped threads if needed.
- Apply reasonable lengths (e.g. title 160 characters, body 20,000) and paginated queries.
- Avoid storing a separate count that drifts unless using an update trigger.

### RLS design (must be actually implemented)
Write/verify one stable SQL predicate such as `can_access_worldwide_bm(auth.uid())` using the app's **existing** verified membership/role data. Avoid trusting role values passed by a client. Define helpers for `is_bm_moderator`, `is_official_content_editor`, and `is_bm_author` using trusted existing tables and secure function practices.

- `SELECT`: permitted only when `can_access_worldwide_bm(auth.uid())` (plus hidden-content restrictions where appropriate).
- `INSERT` threads/replies/resources/follows: authorized worldwide Rabbi/admin, `author_id = auth.uid()` / `user_id = auth.uid()`.
- `UPDATE`/`DELETE`: author can edit own allowed fields and not escalate status/official labels; moderator can manage moderation fields; content editor alone manages official approvals. **Use separate mutation RPCs/server functions or column-level grants** to prevent authors from changing protected fields through an unrestricted UPDATE policy.
- `bm_content_feedback`: Rabbis create/read permitted reports, official editors process. `bm_reports` should be private to reporter/moderators rather than displayed globally.
- Storage private bucket: allow authorized worldwide Rabbonim to read attachments, upload only into approved per-user namespace; enforce object path ownership and content restrictions; no unauthenticated public bucket or unrestricted signed URL generation.
- Any server-side service-role operations should remain on server with authorization checks and secrets never shipped to Expo client.

**Important:** A RLS policy alone cannot safely enforce per-column immutability when a row UPDATE is allowed. Codex must explicitly design server-side RPCs, triggers, or restricted grants for status, official approvals, and file visibility transitions.

---

## 6. User journeys and acceptance criteria

### Journey 1 — Ask and discuss
1. Authorized Rav opens Rabbi Hub > Beis Midrash > Torah Discussions.
2. Taps Start Discussion; writes title/body; sets category and optionally zman and HC1-B3.
3. Publishes; thread appears only to authorized Rabbonim worldwide.
4. Another Rav responds; replies remain grouped; followers get an in-app unread notification.
5. Search for “Chazon Ish king Navi” finds this thread; HC1-B3 page links to it.

**Pass**: participants/public are blocked by DB RLS even when guessing exact URL/row id.

### Journey 2 — Publish shared material
1. Rav shares a visual handout or external chazara video link.
2. Categorizes resource and optionally links to relevant chunk.
3. Another Rav finds it from Resources filters or the selected chunk in Shiur Builder.
4. Attribution and Rabbi-contributed label appear. Files remain private to worldwide authorized audience.

**Pass**: works for PDF and link; no accidental public exposure; no need to download an external video into Supabase.

### Journey 3 — Flag a Notes issue
1. Rav reading a chunk flags a possible mistaken source citation and links his evidence.
2. Issue appears in an editorial queue with relevant thread and original chunk code.
3. Editor reviews and records decision.
4. If fixed, the approved source publication workflow creates the revision and links its version to the issue.

**Pass**: reporter cannot mark own correction officially approved; no automatic mutation of Notes on submission.

### Journey 4 — General SCP question
Rav posts about bechina schedules with no Notes chunk; categorized SCP Program. Other Rabbonim can find it via category search. Formal announcements remain distinct from casual answers.

### Journey 5 — English/Hebrew
Hebrew title/body display RTL, English code `HC1-B3` remains readable, mixed Hebrew/English citations do not break layout, and search finds Hebrew text.

### Journey 6 — Existing functionality
Current Rabbi Hub, participant Review, My Chaburah Files, existing public Files, and Shiur Builder continue to work unchanged; no extra access granted to participants.

---

## 7. Build phases — resist overengineering

**Phase 0 — Repository + schema discovery (mandatory before writing migrations)**
- Inspect existing navigation, roles, role claims vs trusted DB rows, `content_chunks` stable IDs/codes, current zman tables, file scopes, existing comments/forums, RLS helpers, and storage buckets.
- Report what will be reused and planned migrations. Do not invent existing table names or deploy destructive migrations.

**Phase 1 — Useful minimum worldwide Beis Midrash**
- Private Rabbi navigation entry; threads; single-level threaded replies; categories; optional zman and multi-chunk association; search/filter; bookmark/follow; authorization/RLS; responsive mobile/web + Hebrew RTL.
- Screens: list, create, thread detail, edit own thread/reply. Simple moderation/report pathway.

**Phase 2 — Resource Library + Shiur Builder links**
- Share/list/search documents/URLs; private upload storage; attribution and official/contributor labels; resource-to-chunk links; discussion/resource panel in Shiur Builder and Notes chunk views.

**Phase 3 — Editorial Feedback + admin queue**
- Structured correction suggestions, editor decision workflow, official clarification badge, source-version linkage, audit log.

**Phase 4 — Optional engagement improvements**
- Follow notifications, mention support, digest emails, suggested related threads, AI-assisted summaries reviewed or explicitly labeled, and careful WhatsApp deep-link promotion.

No auto-generated halachic answers, no uncontrolled automatic posting from WhatsApp, no automatic Notes rewriting, no full ChatGPT search integration requirement in MVP.

---

## 8. Suggested Codex task / direct prompt

> Build a new **worldwide Rabbi-only Beis Midrash** inside the existing mySCP Rabbi Hub, following the attached `mySCP_Worldwide_Beis_Midrash_Codex_Spec.md`.
>
> **Before changing code** inspect existing Expo/React Native navigation, Supabase schema/migrations, auth and roles, Notes `content_chunks` and stable `chunk_code`, Shiur Builder, resource/files scopes and RLS policies. Summarize what you found and identify any conflicts or needed schema adaptations. Reuse existing entities instead of duplicating them.
>
> Implement **Phase 1** first: a worldwide, authorized-Rabbonim-only discussion board with categories, optional zman, links to zero/multiple Notes chunks, discussion list/search/filter, thread detail, threaded replies, author editing, bookmarks/follows, and moderation basics. Add secure SQL migrations/RLS policies/storage approach. No participant/public access, including direct DB queries. Include Hebrew RTL and mobile-friendly UI.
>
> Then implement **Phase 2**: private shared resources (files and external links), Notes chunk associations, author attribution, and the related discussions/resources panel in Shiur Builder. Keep local `My Chaburah` features completely separate.
>
> Do **not** publish imported WhatsApp messages, expose contact information, grant public resource URLs, treat community opinions as official p'sak, or modify official Notes automatically. Preserve all existing functionality. Implement tests, explain setup/migration steps, and give me clear instructions for testing with two Rabbis and one normal participant.

### Technical deliverables from Codex
- Reviewed/reusable entity map and any assumptions still requiring confirmation.
- Supabase migration SQL with RLS policies, private storage and indexes, **idempotent or safe migrations**.
- Expo screens/components and navigation integration.
- Reusable client hooks/services/types; server-side protected mutation endpoints where necessary.
- Tests: authorized view/post/reply; unauthorized read/write denial; author vs admin vs editor permissions; status/official label escalation denial; attachment privacy; source link; RTL.
- Manual walkthrough: how to assign Rabbi role using established flow; how to publish a resource; how the selected chunk displays related discussions.
- No secrets or sample passwords committed to source control.

---

## 9. Design principles / things not to lose

- **One worldwide space for Rabbonim**, not one discussion board per chaburah. Preserve local chaburah separation elsewhere.
- **One topic per thread**, searchable indefinitely, not another endless chat.
- **Notes chunks are anchors**, not barriers to participation. Use same codes as English/Hebrew chunks.
- **Community vs official source** must always be visually and permission-wise distinct.
- **Useful before perfect**: release discussions first; enhance after Rabbonim are actually using them.
- **Do not overload UI**: post in a few taps; offer optional metadata afterwards.
- **Do not mistake “answered” for p'sak** or unresolved disputes for consensus.
- **Safe migration of historical discussions** must be consent-based, curated, and redact private data.

# Worldwide Beis Midrash - Phase 1

## Activate

1. Review and apply `supabase/migrations/202610220001_worldwide_beis_midrash.sql`
   in Supabase SQL Editor, after the existing learning-program migrations. It is
   transactional and additive. Apply once; it does not replace existing messages,
   files, questions, packets, or official content.
2. Apply `supabase/migrations/202610230001_beis_midrash_boards.sql` after the first
   migration. This preserves existing discussions/replies/links, adds Official
   Questions, enables board-scoped pagination, and adds the Notes/Q&A picker API.
   If the first migration was already applied, run ONLY this follow-up migration.
3. Deploy the app changes or reload local Expo. Rabbi Hub now includes Beis Midrash.
   Wide web screens use four equal-width descriptive tool cards in one row,
   including open Ask Rav and current-week published/draft quiz counts. Native
   apps and smaller browser windows keep the compact tool row. No new bottom
   tab is added. Disabled tools stay hidden.
4. Use the existing Global Admin leadership/role-approval flow to approve Rabbonim.
   Access requires Global Admin, or BOTH a `local_rabbi` profile and an active
   `rabbi` membership somewhere. A local admin alone does not qualify.

The migrations have not been applied to the live database by this task. Before
deployment, compare the project's applied migrations with the checked-in history.
An app without this migration displays a database-update message in Beis Midrash;
the new feature is not part of the app-wide data hydration request.

## What is included

- Visible Message Board, Resources & Materials, and Teaching & Chaburah areas.
  Message Board contains Official Notes, Official Questions, and Other Learning
  Questions. Existing category keys are retained so no discussions are discarded.
- Private worldwide threads, optional program and up to 20 official material links.
  Official Notes lists Notes only; Official Questions lists official Q&A only (not
  participant Quick Review quiz questions). Other topics have a collapsed optional
  picker for either. Changing topic removes incompatible links but keeps typed text.
  Posting defaults to the area/topic and zeman currently being browsed.
- Official material is grouped in collapsible section folders. Challah prefixes
  are hidden in display codes only; canonical IDs/codes and links stay unchanged.
  Click a chunk title/eye to preview it before linking, or use its checkbox.
- Following, Unread, and Bookmarked initially search all areas; an area/topic can
  then narrow the view. Search and pagination apply to the selected area on the server.
- Search across titles, body text, and visible replies; program/category/status,
  section, author-name, official material, unanswered, following, unread, and bookmark filters.
- Server pagination: 25 discussions and 50 replies per page. Recent activity or
  newest sorting. Body text is plain selectable text, not arbitrary HTML.
- Chronological replies with one nesting level, quoting, editing and soft removal
  of one's own content. Thread authors can mark Open, Answered, Needs Official
  Clarification, or Archived. These are community discussion statuses only.
- Following is automatic on posting/replying; bookmarks are independent. Unread
  counts consider other people's visible replies. Reading the final reply page
  marks a followed thread read. There are no email/push notifications yet.
- Reports are private to the reporter and Global Admin moderators. Moderators can
  hide/restore threads/replies, archive threads, and review reports. Actions have
  an append-only audit log. No official editorial-approval capability is granted.
- Failed saves preserve the form's text. Cancel prompts before discarding changed
  text; the existing unsaved-program/sign-out guard is reused. Forms are not yet
  persisted as server-side drafts across a device restart.
- Paragraph-level English/Hebrew direction, readable Latin chunk references, and
  the existing rich official Notes viewer. No duplication of official Notes text.
- Shareable web links with UUID only, preserving the requested thread through
  sign-in. No post content, email addresses, or names are included in shared URLs.

## Isolation and permissions

Worldwide access is separate from local chaburah tool access. A verified Rabbi
visiting another chaburah can open Beis Midrash through Rabbi Hub but cannot use
that chaburah's Shiur Builder, Quick Review authoring, or Admin tools. Beis Midrash
uses the shared header zeman selector, matching the rest of Rabbi Hub. Changing
that selector changes the app's selected zeman, but never edits a week counter.
The post composer can independently choose another accessible zeman or General.
Advanced search can also search General or all accessible zemanim.

Pilot-program restrictions apply to threads AND all linked chunks, even on a
General/Cross-Zeman thread. The API returns author names only, without changing
existing profile policies. Participants, unauthenticated callers, unapproved
leaders, and suspended Rabbonim cannot read or post. Revoking approval/membership
affects subsequent database requests without depending on a refreshed JWT.

All new tables have RLS and explicit SELECT grants. Client INSERT/UPDATE/DELETE
grants are withheld: protected, allowlisted RPCs validate identity, ownership,
status, linked programs/chunks, and same-thread/depth reply relationships. Global
Admins moderate; formal editors can be added later without changing app roles.
Posting limits are serialized per account: 30 new threads/hour, 10 replies/minute,
and 20 reports/hour. Soft-removed contributions still count toward these limits.

## Test with two Rabbonim and one participant

1. Approve Rabbi A and Rabbi B in different chaburos. Sign in as Rabbi A.
2. Open Rabbi Hub > Beis Midrash. Start a discussion linked to Winter 5787 and
   one or several Notes chunks. Confirm View Notes opens the original material.
3. Sign in separately as Rabbi B. Find the discussion by title, Notes, or section;
   reply, reply to another response, and bookmark it.
4. Back as Rabbi A, use Following > Unread. Open the discussion and read replies;
   confirm it leaves Unread. Edit the original post and mark it Answered.
5. Copy/share the discussion link. Open it while signed out, sign in, and confirm
   the requested discussion opens without showing private content before sign-in.
6. As the participant, confirm Rabbi Hub/Beis Midrash is unavailable and a direct
   thread link does not display content. Test a local admin similarly.
7. Report a response as a Rabbi. As Global Admin, open Review Reports, inspect the
   discussion, hide/restore the response, and mark the report reviewed.
8. Verify a non-pilot Rabbi cannot see Summer 5787 pilot threads or linked Notes,
   including via search or direct links. General threads must not bypass this.
9. Visit another chaburah as a Rabbi: worldwide access remains; local authoring
   tools remain unavailable. Verify My Chaburah, Files, Review and packets still work.
10. Test a Hebrew paragraph, an English paragraph, and mixed citations on a narrow
    phone, landscape phone, and desktop. Verify no whole-page horizontal overflow.

## Automated verification

- `node node_modules/typescript/bin/tsc --noEmit`
- `node scripts/test_beis_midrash_sql.cjs`
- `node scripts/test_beis_midrash_access.cjs`
- `node scripts/test_beis_midrash_boards.cjs`
- `node scripts/test_beis_midrash_material.cjs`
- `node scripts/test_beis_midrash_resources.cjs`
- `node scripts/test_beis_midrash_resource_client.cjs`
- `node scripts/test_beis_midrash_links.cjs`
- `node scripts/test_rabbi_tool_cards.cjs`
- `node scripts/test_beis_midrash_webkit.cjs`
- Existing sidebar/tool-switcher and builder regression tests.

SQL tests use local PGlite, not Supabase. Browser tests intercept every non-local
request and connect synthetic accounts to that same local SQL implementation.
They use the existing `tmp/review-results-tests/node_modules/@electric-sql/pglite`
and `tmp/webkit-tests/node_modules/playwright` runtimes. To use a separate Expo
port in PowerShell, set `$env:MYSCP_TEST_URL='http://localhost:8087'` before running.

## Later phases

The resource attachment foundation is now prepared in
`supabase/migrations/202610240001_beis_midrash_resources.sql` (after the two earlier
Beis Midrash migrations). Apply it before deploying the updated composer.
This migration has not been applied to live Supabase by this development task.

Official Notes and Official Questions now require an appropriate official link on
creation and editing. Existing discussions are preserved unchanged until edited.
Section/workbook titles are read from official content, not hard-coded in the app.

Resources & Materials supports up to five files per discussion, 10 MB each:
PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG and WebP. Files use a separate private
`bm-resources` bucket, never participant Files. Server-allocated immutable paths,
owner reservations, actual stored size/MIME checks, and RLS protect publication
and download. Pending uploads are private to their uploader; they expire for
publication after 24 hours. Only approved Rabbonim with discussion/program access
can download attached resources. Hidden/deleted discussions and detached files
stop authorizing new downloads, including for the original author. Signed URLs
last 60 seconds; already downloaded copies cannot be revoked.

Optional external web links are prepared in
`supabase/migrations/202610250001_beis_midrash_resource_links.sql`, after the
attachment migration. This task has not applied that migration to live Supabase.
Resources & Materials posts may include one HTTP(S) link, an optional display name,
and/or attachments. Creation/editing validates links in the app and database;
existing discussions and older clients' edits preserve saved links. Links are
plain data, not embedded HTML or automatically fetched previews. The web opens
them with `noopener,noreferrer`; native apps use the system URL handler. Private
discussion access does not make a public destination private: the destination
retains its own permissions. Participants cannot read the saved resource post/link.

Cancel/removal cleans pending uploads best-effort. Successful edits detach omitted
attachments transactionally, then try to remove their objects. Closing the browser
or a network failure can leave private pending objects. Before broad rollout,
schedule storage maintenance: list `bm_resources` rows with null `thread_id` older
than 24 hours using a server-side service-role job, remove their objects through
the Supabase Storage API, then delete their metadata only after successful object
removal. Never delete `storage.objects` rows directly; that leaves the underlying
file behind. The upload quota is 20 unfinished reservations per user; maintenance
must also remove expired reservations without objects. No service-role key belongs
in the app. Downloads are not virus-scanned: allow only trusted uploads, and open
Office files in protected view. All runtime/browser verification here uses local
SQL and synthetic Storage, not a live Storage service or physical phone.

Phase 2 can further add resource attribution and contextual Shiur Builder panels.
Do not reuse participant Files visibility for worldwide material.

Phase 3 adds explicit editorial capabilities, feedback dispositions, immutable
approval records and real source-version references. Existing `updated_at` or
document-format version 1 is not a curriculum revision number. Current imports
upsert chunk codes and preserve IDs; future language variants should use canonical
topic identities so Hebrew/English discussions stay connected.

Phase 4 can add generic, authorization-checked notifications, mentions, digests,
and optional scoped Realtime. No WhatsApp history, shared credentials, or automatic
halachic answers are imported or generated by this implementation.

# Codex Work Log

Last updated: July 5, 2026

## Project State

`mySCPcodex` is an Expo SDK 54 and Expo Router application using TypeScript, Supabase Auth, Supabase database reads/writes, protected review RPCs, and role-aware navigation. Checkpoint 5 is feature-complete, and Checkpoint 6 has started with chaburah discussion.

The project remains the source of truth. `C:\Users\Family\ws\ReplitSCP` was used only as a visual reference.

## Changes Completed

### Checkpoint 6 Chaburah Communication

- Started Checkpoint 6 with a forum-style Chaburah Discussion feature.
- Added `discussion_messages` with row-level security for active chaburah members, local managers, and Global Admin.
- Used the existing `chaburos.discussion_enabled` setting as the MVP on/off switch.
- Added app state loading for recent discussion messages.
- Added participant posting from My Chaburah when discussion is enabled.
- Added author-owned Edit/Delete controls for active discussion messages.
- Replaced full-size discussion message action buttons with compact inline actions so Edit/Delete/Hide fit cleanly on Android.
- Fixed Discussion delete confirmation on web by using the browser confirmation dialog while keeping native alerts on Android/iOS.
- Moved the Discussion compose box below the message board so users read posts first and reply afterward.
- Added `discussion_reads` tracking so Discussion index badges represent unread messages since the user last viewed Discussion.
- Added RPCs to count unread discussion messages and mark the current chaburah discussion as read.
- My Chaburah marks Discussion read when the section is jumped to or becomes visible while scrolling.
- Added a Dashboard attention card for unread chaburah discussion messages.
- Dashboard's Open Discussion action deep-links to the Discussion section inside My Chaburah.
- Added public-library model review questions so Global Admin can mark ready-to-use questions for rabbonim.
- Added a Rabbi Hub Model Questions section where rabbonim can quickly stage model public-library questions into their selected week.
- Added a Stage All Model Questions action so rabbonim can copy all matching model questions into their selected week in one step.
- After staging all model questions, Rabbi Hub now scrolls down to Staged Questions so the Publish Week action is immediately available.
- Made Rabbi Hub's Publish Week action use the primary dark style.
- Kept the Rabbi Hub Model Question selection sticky after staging a library question so Global Admin can enter multiple model questions without reselecting it.
- Clarified Public Question Library copy to say it includes both model and regular public questions.
- Removed the Dashboard Missed Last Shiur card.
- Made the Dashboard My Chaburah button use the primary dark style.
- Replaced Latest Source Sheet with Latest Uploaded Files and added a New Upload Available attention card when files exist.
- Made the Dashboard Open Files action use the primary dark style.
- Made the Dashboard Review Requests action use the primary dark style.
- Changed Dashboard Bechina Readiness to Cumulative Review Score, calculated from all saved review sessions.
- Changed Dashboard Review Questions count to use only visible/assigned review questions for the current user/chaburah.
- Added Settings notification preferences for email and in-app channels across new review questions, discussion posts, Rabbi answers, and uploads.
- Added a Supabase `notification_preferences` table with self-only RLS for saved notification choices.
- Moved My Chaburah Announcements directly under the chaburah information card.
- Added a compact My Chaburah index with jump links for Announcements, Discussion, Members, Files, Review, and Ask Rav when available.
- Removed Announcements from the My Chaburah index because it is directly visible near the top.
- Put the My Chaburah Members list in an internal scroll area so large rosters do not stretch the page.
- Moved Review Assigned from My Chaburah to Dashboard so participants see their review action immediately after login.
- Removed Review from the My Chaburah index after moving the card to Dashboard.
- Reordered the My Chaburah index so Members appears first, matching the page order.
- Fixed My Chaburah index jumps on web by using DOM section targets with `scrollIntoView` while keeping native `ScrollView.scrollTo` behavior on Android/iOS.
- Reworked My Chaburah files into a Recent Files preview with per-file Open actions and a View All Files action.
- Limited My Chaburah Recent Files to selected-chaburah files only, excluding Everyone files from that local preview.
- Tightened My Chaburah Recent Files rows so Open stays aligned at the right edge on Android.
- Increased My Chaburah Recent Files preview from 3 to 5 local files.
- Tightened the My Chaburah Recent Files header so View All Files stays aligned on Android.
- Made My Chaburah Recent Files a scrollable preview of up to 10 local files with a note pointing users to View All Files for more.
- Adjusted My Chaburah Recent Files so about 5 files are visible before scrolling through up to 10.
- Extracted shared learning-file opening logic so My Chaburah and Files use the same signed-URL/external-link behavior.
- Added RPCs so authors can edit/delete only their own active messages without broad table update permission.
- Added Rabbi/Admin/Global Admin moderation by hiding active messages instead of hard deleting them.
- Kept the Discussion card compact by putting messages in an internal scroll area so long conversations do not stretch My Chaburah endlessly.
- Kept this first part query/refresh based; realtime subscriptions are intentionally deferred until the discussion behavior is stable.

Primary files:

- `app/(tabs)/chaburah.tsx`
- `src/state/AppState.tsx`
- `src/shared/types.ts`
- `src/lib/database.types.ts`
- `supabase/migrations/202607060001_add_chaburah_discussion.sql`
- `supabase/migrations/202607060002_author_manage_discussion_messages.sql`
- `supabase/migrations/202607060003_discussion_reads.sql`
- `supabase/migrations/202607120001_add_model_review_questions.sql`
- `supabase/migrations/202607120002_notification_preferences.sql`

### Checkpoint 5 Community Usability and Uploads

- Added a read-only active member roster to My Chaburah.
- Kept the participant-facing roster privacy-light: names, roles, and joined dates only.
- Added a display-safe Supabase RPC so regular participants can see active roster entries without receiving member email addresses.
- Updated signup to collect first name, last name, and optional city, saving full name/city into the profile.
- Added Profile editing for first name, last name, and city while keeping email, role, and current chaburah read-only.
- Added `expo-document-picker` with the SDK-compatible Expo install flow.
- Added `expo-file-system` explicitly so native uploads can read selected files reliably.
- Added native file selection to the Admin publishing form.
- Admin file publishing now supports either native upload to the private `learning-files` Supabase Storage bucket or an external URL.
- Replaced the Admin file week text input with Coverage choices: Week, Bechina Review, and Entire Zman.
- Week coverage shows week chips that default to the current week; Bechina Review and Entire Zman files have no week number.
- Added `learning_files.coverage` and a database check constraint so week numbers are only used for weekly files.
- Upload publishing creates the `learning_files` row first, uploads to the matching `storage_path`, and removes the row if upload fails.
- Hardened native uploads after a `Network request failed` error by reading selected files as base64 with FileSystem and uploading an ArrayBuffer to Supabase Storage.
- Added Admin file management: edit file metadata, replace uploaded storage objects, switch uploaded files to external links, and delete files/storage objects.
- Removed `Link` from visible material type choices because External Link is now handled by publish mode; existing link-typed records remain supported.
- Added Video and Other material types for uploaded files and external links.
- Updated `StatusBanner` so error messages still appear inline but also trigger a cross-platform alert popup.
- Added a reusable header refresh button and enabled it on the main Supabase-backed screens for manual cross-device sync during testing.
- Added a compact Admin Index at the top of the Admin screen so long admin workflows can jump to settings, join requests, members, publishing, and files.
- Moved the shared screen header outside the scroll area so the mobile hamburger menu and refresh button remain visible on long screens.
- Added a Dashboard notification for rabbonim/admins when their chaburah has pending join requests.
- Dashboard's Review Requests action now opens Admin directly at the Join Requests section.
- Added Rabbi Hub review-question staging: create/copy questions as drafts, browse public library questions from any week, and publish staged chaburah questions by week.
- Added Global Admin public-library staging so library questions are drafted before becoming browseable/copyable by rabbonim.
- Made the Rabbi Hub Publish Library action use the primary button style so it does not look disabled.
- Rabbi Hub Edit actions now scroll back to the review-question form after loading the answer key.
- Moved Rabbi Hub's Publish Week action under the Staged Questions list so rabbonim publish after reviewing the staged set.
- Replaced Disable with Remove for staged Rabbi Hub questions; Enable/Disable remains for published questions only.
- Rabbi Hub Ask Rav queue now shows the submitter name/email with each question.
- Added a per-chaburah Ask Rav enabled/disabled setting; Dashboard and My Chaburah hide Ask Rav when disabled, and the Ask Rav screen blocks submissions if reached directly.
- Ask Rav is now also hidden from participant navigation when disabled for the current chaburah.
- Made the Profile Sign Out button use the primary dark style.
- Added a rounded active-state highlight for Android/iOS bottom navigation tabs.
- Added `CHECKPOINT_5_QA.md` for manual tester-readiness checks.
- Added `supabase/pilot_cleanup.sql` to remove disposable content/history before creating real pilot content.

Primary files:

- `app/(tabs)/chaburah.tsx`
- `app/(tabs)/admin.tsx`
- `app/(tabs)/profile.tsx`
- `src/state/AppState.tsx`
- `src/shared/components.tsx`
- `src/shared/types.ts`
- `src/lib/database.types.ts`
- `package.json`
- `package-lock.json`
- `CHECKPOINT_5_QA.md`
- `supabase/pilot_cleanup.sql`
- `supabase/migrations/202606300002_list_chaburah_member_directory.sql`
- `supabase/migrations/202606300003_allow_all_week_learning_files.sql`
- `supabase/migrations/202606300004_add_learning_file_coverage.sql`
- `supabase/migrations/202606300005_capture_signup_city.sql`
- `supabase/migrations/202607020001_add_video_other_file_types.sql`
- `supabase/migrations/202607020002_restrict_ask_rav_to_rabbi.sql`
- `supabase/migrations/202607030001_allow_pending_member_profile_visibility.sql`
- `supabase/migrations/202607030002_stage_review_questions.sql`
- `supabase/migrations/202607040001_add_ask_rav_chaburah_toggle.sql`
- `supabase/migrations/202607050001_publish_review_library_drafts.sql`

### Checkpoint 4 Admin Workflows

- Replaced the Global Admin placeholder with live tools to:
  - create chaburos
  - activate/deactivate chaburos
  - search chaburos before activating/deactivating them
  - promote global admins or reset users to participant by email
  - view live chaburah counts
- Replaced the local Admin placeholder with live tools to:
  - let global admins select which local chaburah the Admin screen manages
  - let global admins assign rabbis and local admins to the selected chaburah by email
  - edit current chaburah address, structured schedule, contact email, Zoom/meeting link, description, discussion setting, and join-approval setting
  - approve or reject pending chaburah join requests
  - search/filter local members by name, email, role, or status
  - suspend, reactivate, or remove participant memberships through an RLS-protected RPC
  - publish URL-based learning files with title, topic, week, type, scope, and description
  - review recent visible learning files
- Replaced the Rabbi Hub placeholder with live tools to:
  - view submitted Ask the Rav questions
  - save answers to Supabase
  - publish and edit review questions
  - enable/disable review questions
  - filter managed review questions by selected week
  - stage review questions before publishing them to participants
  - copy public library questions into a chaburah-specific staged week
  - store review answer keys in the protected `review_question_answers` table
  - review recently answered questions
- Directory now hides inactive chaburos and shows pending approval state for join requests.
- Files now supports week filtering in addition to search, scope, and type filters.
- Mobile bottom navigation shows Rabbi Hub for rabbi/global admin accounts.
- Added a reusable `FormInput` component for admin forms.
- Added a reusable `StatusBanner` component so success, info, and detailed Supabase errors are easier to find.
- Added reusable schedule helpers for structured chaburah day/time/AM-PM fields.
- Extended local Supabase TypeScript types for memberships, `review_question_answers`, and admin RPCs.

Primary files:

- `app/(tabs)/global-admin.tsx`
- `app/(tabs)/admin.tsx`
- `app/(tabs)/rabbi-hub.tsx`
- `src/shared/components.tsx`
- `src/shared/reviewWeeks.ts`
- `src/shared/schedule.ts`
- `src/shared/types.ts`
- `src/lib/database.types.ts`
- `supabase/migrations/202606280001_review_membership_request.sql`
- `supabase/migrations/202606280002_join_chaburah_switches_membership.sql`
- `supabase/migrations/202606280003_recalculate_chaburah_member_counts.sql`
- `supabase/migrations/202606280004_count_distinct_active_members.sql`
- `supabase/migrations/202606280005_assign_chaburah_leader.sql`
- `supabase/migrations/202606300001_update_membership_status.sql`

### Checkpoint 3 Supabase Draft

- Added a clean initial database migration under `supabase/migrations/`.
- Added 11 application tables covering profiles, chaburos, memberships, role requests, announcements, learning files, review content/history, and Ask Rav.
- Added a signup trigger that creates profiles from Supabase Auth users and synchronizes email/profile metadata.
- Added server-side membership, review-answer, review-completion, role-management, and role-request RPC functions.
- Kept review answer keys in a separate protected table.
- Added a private `learning-files` Storage bucket and object policies tied to database file records.
- Added 38 RLS policies and explicit table/column grants.
- Added development seed chaburos and setup/security documentation.
- Added an environment variable template without real credentials.
- Did not connect the Expo application to Supabase or modify any live Supabase project.

### Supabase App Connection

- Installed `@supabase/supabase-js`.
- Added a typed Supabase client using `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Added `AuthStateProvider` for session restoration, sign-in, sign-up, profile loading, and sign-out.
- Added an `/auth` screen and protected app routes.
- Replaced participant workflow mock data with live Supabase reads and RPC calls.
- Directory now joins chaburos through `join_chaburah`.
- Ask Rav now inserts protected Supabase rows.
- Ask Rav privacy now limits question visibility to the asker and the assigned active rabbi; local admins no longer see participant questions.
- Local admins/rabbonim can now see names and emails for pending join requests in their own chaburah.
- Review now checks answers through `check_review_answer` and saves sessions through `complete_review_session`.
- Files now open external URLs or private Storage signed URLs.
- Added live loading/error handling for Supabase data failures.
- Expanded `seed.sql` with test announcements, learning files, review questions, and answer keys.
- Added the React Native URL polyfill required by Supabase in Expo/React Native.

Primary files:

- `supabase/migrations/202606220001_initial_schema.sql`
- `supabase/migrations/202606220002_rls_and_storage.sql`
- `supabase/seed.sql`
- `supabase/README.md`
- `.env.example`

### Checkpoint 2 Functional Workflows

- Added a shared `AppStateProvider`.
- Added persisted local state with Expo-compatible AsyncStorage.
- Persisted the selected chaburah, review history, and Ask Rav submissions.
- Wired Dashboard and My Chaburah buttons to their destination screens.
- Made chaburah membership changes update the rest of the application immediately.
- Added confirmation before changing chaburahs.
- Added complete Review sessions with multiple questions, previous/next navigation, scoring, results, retry, best score, and history.
- Added file URL opening with clear unavailable-file feedback for mock files without URLs.
- Added Ask Rav validation, submission, and local question history.
- Added disabled and pressed states to shared buttons.
- Restored Ask Rav to web/tablet navigation while keeping the compact Android navigation.

Primary files:

- `src/state/AppState.tsx`
- `app/_layout.tsx`
- `app/(tabs)/dashboard.tsx`
- `app/(tabs)/chaburah.tsx`
- `app/(tabs)/review.tsx`
- `app/(tabs)/files.tsx`
- `app/(tabs)/directory.tsx`
- `app/(tabs)/ask-rav.tsx`
- `src/shared/components.tsx`
- `src/shared/types.ts`

### Initial Expo Application

- Created the Expo Router and TypeScript application structure.
- Added Dashboard, My Chaburah, Files, Review, Directory, Ask Rav, Rabbi Hub, Admin, Global Admin, Profile, and Settings screens.
- Added role-aware navigation using the mock current user.
- Added shared TypeScript models, formatting helpers, permission helpers, mock users, chaburos, announcements, learning files, and review questions.
- Kept the application disconnected from Supabase and other backend services.

### Responsive Navigation

- Web and tablet layouts use compact left-side navigation.
- Android phone layouts retain four bottom navigation items:
  - Dashboard
  - My Chaburah
  - Review
  - Files
- Rabbi/global admin phone layouts also show Rabbi Hub in the bottom navigation.
- Added an upper-left hamburger menu on Android phone layouts.
- The mobile menu contains Directory, Rabbi Hub, Admin, Global Admin, Profile, and Settings.
- Ask Rav remains an existing route but is not currently exposed as a main navigation item.
- Navigation visibility respects the live Supabase profile role.

Primary file:

- `app/(tabs)/_layout.tsx`

### Shared Visual System

- Updated the app to a restrained navy, gold, white, and light-gray palette inspired by the Replit reference.
- Improved typography, spacing, card borders, shadows, chips, button sizing, and visual hierarchy.
- Increased Android button height and text size for better readability and tap targets.
- Added extra screen-bottom spacing above mobile navigation.
- Added reusable UI pieces for:
  - Search fields
  - Filter chips
  - Compact cards
  - Metadata text
  - Progress bars
  - Status banners
  - Success and error feedback colors
- Constrained desktop/tablet content widths to avoid awkwardly stretched layouts.

Primary files:

- `src/shared/theme.ts`
- `src/shared/components.tsx`

### Review

- Replaced the crowded week pills with a clearer selectable week filter.
- Added question counts to week selections.
- Added progress and best-score presentation.
- Redesigned quiz choices with readable answer markers and polished selected/correct/incorrect states.
- Added immediate mock feedback and explanations.
- Added reset and retry controls.
- Review uses live Supabase questions, secured answer RPCs, and saved review results.

Primary file:

- `app/(tabs)/review.tsx`

### Files

- Added working client-side search by title, topic, and file type.
- Added working filters for scope and file type.
- Added working filter for week.
- Organized file cards by title, topic, week, type, uploader, and visibility.
- Added clear empty-result feedback.
- Improved card hierarchy and responsive metadata layout.

Primary file:

- `app/(tabs)/files.tsx`

### Directory

- Added working client-side search by name, city, country, address, and rabbi.
- Redesigned each chaburah as a compact card.
- Prevented cards from stretching across the full desktop width.
- Included name, address, rabbi, schedule, city/country, member count, and Join/Joined presentation.

Primary file:

- `app/(tabs)/directory.tsx`

## Decisions Made

- Keep Expo SDK 54.
- Keep Checkpoint 4 file management URL-based for now; native file picking/upload should be a separate dependency and UX decision.
- Use existing Supabase RLS and RPCs for admin actions rather than adding service-role code to the Expo client.
- Keep review answer keys out of the public `review_questions` table.
- Keep Ask Rav questions private to the asker and assigned rabbi, not general chaburah admins.
- Keep local rabbi/local admin assignment scoped to a chaburah through Admin, not Global Admin's app-wide role tool.
- Treat changing chaburah as leaving other participant chaburah memberships for now.
- Keep detailed Supabase/RPC error text visible during testing, but show it in the shared status banner.
- Add only one necessary Checkpoint 2 dependency: `@react-native-async-storage/async-storage`, installed through `expo install` for SDK compatibility.
- Do not copy architecture, API code, authentication, or backend behavior from the Replit project.
- Preserve the existing Expo Router structure and screen/component organization.
- Use responsive width and platform checks instead of introducing a new drawer dependency.
- Keep mobile navigation intentionally limited to four high-frequency destinations.
- Keep old mock data only as fallback/reference fixtures; live app workflows now use Supabase.
- Establish shared design primitives now so later screens do not duplicate styling.
- Do not add Playwright or another visual-testing dependency yet. The Codex in-app browser integration was present but failed because of a local Windows sandbox/runtime issue.

## Verification Completed

- TypeScript validation passed with `tsc --noEmit`.
- `expo-doctor` passed all 18 checks with no issues detected.
- The Expo web development server ran successfully.
- `/`, `/review`, `/files`, and `/directory` returned HTTP 200.
- No package dependency changes were introduced during the visual redesign.
- Checkpoint 2 TypeScript validation passed.
- Checkpoint 2 production web export completed successfully.
- Checkpoint 2 `expo-doctor` passed all 18 checks.
- Checkpoint 3 TypeScript validation passed.
- Checkpoint 3 production web export completed successfully.
- Checkpoint 3 `expo-doctor` passed all 18 checks.
- Checkpoint 4 TypeScript validation passed.
- Checkpoint 4 production web export completed successfully.
- Checkpoint 4 `expo-doctor` passed all 18 checks.
- Latest post-Checkpoint 4 iteration TypeScript validation passed.
- Checkpoint 5 member roster TypeScript validation passed.
- Checkpoint 5 upload iteration TypeScript validation passed.
- Checkpoint 5 upload iteration `expo-doctor` passed all 18 checks.
- Checkpoint 5 file coverage selector TypeScript validation passed.
- Checkpoint 5 QA closeout TypeScript validation passed.
- Checkpoint 5 QA closeout `expo-doctor` passed all 18 checks.
- Ask Rav privacy pass TypeScript validation passed.
- Ask Rav privacy pass `expo-doctor` passed all 18 checks.
- Pending join-request profile visibility TypeScript validation passed.
- Admin Index TypeScript validation passed.
- Sticky mobile header TypeScript validation passed.
- Dashboard join-request notification TypeScript validation passed.
- Dashboard-to-Admin Join Requests deep link TypeScript validation passed.
- Rabbi Hub staged review-question builder TypeScript validation passed.
- Rabbi Hub edit-scroll TypeScript validation passed.
- Rabbi Hub staged publish placement TypeScript validation passed.
- Rabbi Hub staged remove action TypeScript validation passed.
- Rabbi Hub Ask Rav submitter display TypeScript validation passed.
- Per-chaburah Ask Rav toggle TypeScript validation passed.
- Ask Rav disabled navigation hiding TypeScript validation passed.
- Profile Sign Out button style TypeScript validation passed.
- Mobile active-tab highlight TypeScript validation passed.
- Rabbi Hub public-library staging TypeScript validation passed.
- Rabbi Hub Publish Library button style TypeScript validation passed.
- Mobile drawer active-route highlight TypeScript validation passed.
- Mobile drawer active-route highlight `expo-doctor` passed all 18 checks.
- Admin file chooser primary button style TypeScript validation passed.
- Admin file chooser primary button style `expo-doctor` passed all 18 checks.
- Checkpoint 6 discussion foundation TypeScript validation passed.
- Checkpoint 6 discussion foundation `expo-doctor` passed all 18 checks.
- Checkpoint 6 discussion scroll window TypeScript validation passed.
- Checkpoint 6 discussion scroll window `expo-doctor` passed all 18 checks.
- Checkpoint 6 discussion author edit/delete TypeScript validation passed.
- Checkpoint 6 discussion author edit/delete `expo-doctor` passed all 18 checks.
- Checkpoint 6 compact discussion actions TypeScript validation passed.
- Checkpoint 6 compact discussion actions `expo-doctor` passed all 18 checks.
- Checkpoint 6 web discussion delete confirmation TypeScript validation passed.
- Checkpoint 6 web discussion delete confirmation `expo-doctor` passed all 18 checks.
- Checkpoint 6 Discussion compose placement TypeScript validation passed.
- Checkpoint 6 Discussion compose placement `expo-doctor` passed all 18 checks.
- Checkpoint 6 Discussion unread tracking TypeScript validation passed.
- Checkpoint 6 Discussion unread tracking `expo-doctor` passed all 18 checks.
- Checkpoint 6 Dashboard unread discussion card TypeScript validation passed.
- Checkpoint 6 Dashboard unread discussion card `expo-doctor` passed all 18 checks.
- Checkpoint 6 Dashboard upload polish TypeScript validation passed.
- Checkpoint 6 Dashboard upload polish `expo-doctor` passed all 18 checks.
- Checkpoint 6 Dashboard Open Files button style TypeScript validation passed.
- Checkpoint 6 Dashboard Open Files button style `expo-doctor` passed all 18 checks.
- Checkpoint 6 Dashboard Review Requests button style TypeScript validation passed.
- Checkpoint 6 Dashboard Review Requests button style `expo-doctor` passed all 18 checks.
- Checkpoint 6 Dashboard review stat cleanup TypeScript validation passed.
- Checkpoint 6 Dashboard review stat cleanup `expo-doctor` passed all 18 checks.
- Checkpoint 6 model review questions TypeScript validation passed.
- Checkpoint 6 model review questions `expo-doctor` passed all 18 checks.
- Checkpoint 6 sticky model-question form TypeScript validation passed.
- Checkpoint 6 sticky model-question form `expo-doctor` passed all 18 checks.
- Checkpoint 6 stage-all model questions TypeScript validation passed.
- Checkpoint 6 stage-all model questions `expo-doctor` passed all 18 checks.
- Checkpoint 6 stage-all model scroll-to-publish TypeScript validation passed.
- Checkpoint 6 stage-all model scroll-to-publish `expo-doctor` passed all 18 checks.
- Checkpoint 6 Rabbi Hub Publish Week button style TypeScript validation passed.
- Checkpoint 6 Rabbi Hub Publish Week button style `expo-doctor` passed all 18 checks.
- Checkpoint 6 Public Question Library copy TypeScript validation passed.
- Checkpoint 6 Public Question Library copy `expo-doctor` passed all 18 checks.
- Checkpoint 6 Settings notification preferences TypeScript validation passed.
- Checkpoint 6 Settings notification preferences `expo-doctor` passed all 18 checks.
- Checkpoint 6 My Chaburah index TypeScript validation passed.
- Checkpoint 6 My Chaburah index `expo-doctor` passed all 18 checks.
- Checkpoint 6 My Chaburah members scroll window TypeScript validation passed.
- Checkpoint 6 My Chaburah members scroll window `expo-doctor` passed all 18 checks.
- Checkpoint 6 Dashboard Review Assigned move TypeScript validation passed.
- Checkpoint 6 Dashboard Review Assigned move `expo-doctor` passed all 18 checks.
- Checkpoint 6 My Chaburah index order TypeScript validation passed.
- Checkpoint 6 My Chaburah index order `expo-doctor` passed all 18 checks.
- Checkpoint 6 My Chaburah web index jump TypeScript validation passed.
- Checkpoint 6 My Chaburah web index jump `expo-doctor` passed all 18 checks.
- Checkpoint 6 My Chaburah actionable files TypeScript validation passed.
- Checkpoint 6 My Chaburah actionable files `expo-doctor` passed all 18 checks.
- Checkpoint 6 My Chaburah local-only files TypeScript validation passed.
- Checkpoint 6 My Chaburah local-only files `expo-doctor` passed all 18 checks.
- Checkpoint 6 My Chaburah 5-file preview TypeScript validation passed.
- Checkpoint 6 My Chaburah 5-file preview `expo-doctor` passed all 18 checks.
- Checkpoint 6 My Chaburah View All Files alignment TypeScript validation passed.
- Checkpoint 6 My Chaburah View All Files alignment `expo-doctor` passed all 18 checks.
- Checkpoint 6 My Chaburah 10-file scroll preview TypeScript validation passed.
- Checkpoint 6 My Chaburah 10-file scroll preview `expo-doctor` passed all 18 checks.
- Checkpoint 6 My Chaburah 5-visible file preview TypeScript validation passed.
- Checkpoint 6 My Chaburah 5-visible file preview `expo-doctor` passed all 18 checks.

## Still To Do

### Functional Behavior

- Run `supabase/migrations/202607060001_add_chaburah_discussion.sql`, `supabase/migrations/202607060002_author_manage_discussion_messages.sql`, and `supabase/migrations/202607060003_discussion_reads.sql` in Supabase before testing Chaburah Discussion in the app.
- Test Discussion as participant, local rabbi, local admin, and Global Admin.
- Decide whether hidden discussion messages should remain visible to managers or move to a separate moderation view.
- Add optional Supabase Realtime subscriptions for Discussion after the refresh-based version is confirmed.
- Test native upload on a real Android/iOS device and confirm signed URL opening on each platform.
- Test file editing/deleting/replacing on real Android/iOS devices.
- Add review question delete flow if/when deletion policy is decided.
- Add deeper member-management history/auditing and leadership removal/demotion flows.
- Add Supabase Realtime subscriptions for automatic cross-device changes.
- Add Settings functionality.

### Backend

- Generate official Supabase TypeScript types from the live project when the CLI workflow is ready.
- Keep adding migrations for any new admin/RPC convenience functions discovered during real use.
- Consider RPCs for additional multi-table admin operations as workflows mature.

### Product and UI Follow-Up

- Review every screen on physical Android phones and tablets.
- Verify the left navigation at common web and tablet widths.
- Check long titles, large accessibility text, keyboard behavior, and empty/loading/error states.
- Add accessible disabled/pressed states to shared buttons and filters.
- Decide whether joined chaburah cards should be visually pinned or sorted first.
- Add file previews or native sharing once file URLs exist.
- Add production auth redirect/deep-link configuration for email confirmation/password reset.
- Add automated interaction tests once a stable browser test environment is available.

## Useful Commands

```powershell
npm.cmd install
npx.cmd expo start
npm.cmd run web
npm.cmd run typecheck
npx.cmd expo-doctor
npx.cmd expo export --platform web --output-dir .tmp-checkpoint4-web
```

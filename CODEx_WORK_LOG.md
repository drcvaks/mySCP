# Codex Work Log

Last updated: June 26, 2026

## Project State

`mySCPcodex` is an Expo SDK 54 and Expo Router application using TypeScript, Supabase Auth, Supabase database reads/writes, protected review RPCs, and role-aware navigation. Checkpoint 4 adds the first real admin/rabbi management workflows on top of the Checkpoint 3 Supabase integration.

The project remains the source of truth. `C:\Users\Family\ws\ReplitSCP` was used only as a visual reference.

## Changes Completed

### Checkpoint 4 Admin Workflows

- Replaced the Global Admin placeholder with live tools to:
  - create chaburos
  - activate/deactivate chaburos
  - assign app roles by user email through the existing admin RPC
  - view live chaburah and review-session counts
- Replaced the local Admin placeholder with live tools to:
  - let global admins select which local chaburah the Admin screen manages
  - edit current chaburah address, schedule, Zoom/meeting link, description, discussion setting, and join-approval setting
  - approve or reject pending chaburah join requests
  - publish URL-based learning files with title, topic, week, type, scope, and description
  - review recent visible learning files
- Replaced the Rabbi Hub placeholder with live tools to:
  - view submitted Ask the Rav questions
  - save answers to Supabase
  - publish review questions
  - store review answer keys in the protected `review_question_answers` table
  - review recently answered questions
- Added a reusable `FormInput` component for admin forms.
- Extended local Supabase TypeScript types for `review_question_answers` and admin RPCs.

Primary files:

- `app/(tabs)/global-admin.tsx`
- `app/(tabs)/admin.tsx`
- `app/(tabs)/rabbi-hub.tsx`
- `src/shared/components.tsx`
- `src/lib/database.types.ts`
- `supabase/migrations/202606280001_review_membership_request.sql`
- `supabase/migrations/202606280002_join_chaburah_switches_membership.sql`

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
- Added an upper-left hamburger menu on Android phone layouts.
- The mobile menu contains Directory, Rabbi Hub, Admin, Global Admin, Profile, and Settings.
- Ask Rav remains an existing route but is not currently exposed as a main navigation item.
- Navigation visibility continues to respect the current mock user's role where applicable.

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
- Kept the implementation local and mock-data-based.

Primary file:

- `app/(tabs)/review.tsx`

### Files

- Added working client-side search by title, topic, and file type.
- Added working filters for scope and file type.
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
- Add only one necessary Checkpoint 2 dependency: `@react-native-async-storage/async-storage`, installed through `expo install` for SDK compatibility.
- Do not copy architecture, API code, authentication, or backend behavior from the Replit project.
- Preserve the existing Expo Router structure and screen/component organization.
- Use responsive width and platform checks instead of introducing a new drawer dependency.
- Keep mobile navigation intentionally limited to four high-frequency destinations.
- Use mock data and local state until backend work is explicitly started.
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

## Still To Do

### Functional Behavior

- Add native file picking/upload to Supabase Storage.
- Add file editing/deleting/replacing flows.
- Add review question editing/deleting/enable-disable flows.
- Add member management and join-request approval screens.
- Add manual refresh controls or Supabase Realtime subscriptions for cross-device changes.
- Add richer success/error notifications for admin actions.

### Backend

- Generate official Supabase TypeScript types from the live project when the CLI workflow is ready.
- Add migrations for any new admin/RPC convenience functions discovered during real use.
- Decide whether global admins need a dedicated chaburah selector for scoped local admin/rabbi actions.

### Product and UI Follow-Up

- Review every screen on physical Android phones and tablets.
- Verify the left navigation at common web and tablet widths.
- Check long titles, large accessibility text, keyboard behavior, and empty/loading/error states.
- Add accessible disabled/pressed states to shared buttons and filters.
- Decide whether joined chaburah cards should be visually pinned or sorted first.
- Add file previews or native sharing once file URLs exist.
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

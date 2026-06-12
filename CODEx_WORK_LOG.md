# Codex Work Log

Last updated: June 11, 2026

## Project State

`mySCPcodex` is an Expo SDK 54 and Expo Router application using TypeScript and mock data. It currently provides the Checkpoint 1 application shell and visual workflows without Supabase, authentication, storage, SQL, migrations, or backend integration.

The project remains the source of truth. `C:\Users\Family\ws\ReplitSCP` was used only as a visual reference.

## Changes Completed

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

- Keep Expo SDK 54 and the existing dependency set.
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

## Still To Do

### Functional Behavior

- Connect visual buttons to real actions and navigation where appropriate.
- Implement opening/downloading files and external links.
- Implement persistent quiz sessions, question navigation, scoring, and history.
- Implement actual Join/Joined directory behavior.
- Decide where Ask Rav should appear in the final navigation.
- Replace placeholder Settings, Rabbi Hub, Admin, and Global Admin content with real workflows.

### Backend

- Add Supabase configuration when the backend checkpoint begins.
- Add authentication and user session handling.
- Replace mock arrays with database queries.
- Add schema, migrations, storage, and row-level security.
- Persist user roles, chaburah membership, files, announcements, questions, and review results.

### Product and UI Follow-Up

- Review every screen on physical Android phones and tablets.
- Verify the left navigation at common web and tablet widths.
- Check long titles, large accessibility text, keyboard behavior, and empty/loading/error states.
- Add accessible disabled/pressed states to shared buttons and filters.
- Decide whether joined chaburah cards should be visually pinned or sorted first.
- Add file previews or native sharing once file URLs exist.
- Update `README.md` to reflect the responsive navigation, Settings screen, and current visual state.

## Useful Commands

```powershell
npm.cmd install
npx.cmd expo start
npm.cmd run web
npm.cmd run typecheck
npx.cmd expo-doctor
```

# mySCP

Checkpoint 5 QA-ready for a cross-platform Expo app for a Semichas Chaver Program-style learning community.

The app now includes:

- Expo Router project structure
- TypeScript configuration
- Responsive, role-aware navigation
- Dashboard
- My Chaburah
- My Chaburah active member roster
- Searchable and filterable Files
- Files filters by search, scope, type, and week
- Multi-question Review sessions with secured answer checking and saved history
- Searchable Directory with Supabase-backed Join/Joined behavior
- Ask the Rav submission form and live question history
- Rabbi Hub tools for answering questions and creating/editing review questions
- Admin tools for local chaburah settings, leadership assignment, join requests, member management, and URL-based learning files
- Global Admin tools for chaburah creation, activation/deactivation, search, and global access
- Profile screen
- Settings placeholder
- Supabase Auth session handling
- Live Supabase reads and RPC calls for participant workflows
- Supabase-backed admin/rabbi workflows
- Shared status banners for success, info, and detailed Supabase/RPC errors
- Error status messages also trigger cross-platform alert popups

Checkpoint 4 supported publishing learning-file records by external URL. Checkpoint 5 adds the My Chaburah roster and begins native Supabase Storage uploads from the Admin publishing form.

Checkpoint 3 Supabase schema and RLS migrations are available in `supabase/`. The Expo app reads Supabase credentials from `.env` and uses Supabase Auth plus live database/RPC calls.

## Run

```bash
npm install
npx expo start
```

Then choose iOS, Android, or web from the Expo developer tools.

## Structure

```text
app/
  _layout.tsx
  index.tsx
  (tabs)/
    _layout.tsx
    dashboard.tsx
    chaburah.tsx
    files.tsx
    review.tsx
    directory.tsx
    ask-rav.tsx
    rabbi-hub.tsx
    admin.tsx
    global-admin.tsx
    profile.tsx
    settings.tsx
src/
  lib/
    database.types.ts
    supabase.ts
  state/
    AuthState.tsx
    AppState.tsx
  shared/
    components.tsx
    format.ts
    permissions.ts
    reviewWeeks.ts
    schedule.ts
    theme.ts
    types.ts
```

The Supabase data layer maps database rows into the app's existing TypeScript UI models.

## Supabase Environment

Create a local `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Use the publishable/anon client key only. Never put the service-role key, database password, or direct PostgreSQL connection string in the Expo app.

After promoting the first global admin profile, rerun `supabase/seed.sql` if you want the live app to include the test announcements, learning files, and review questions.

## Supabase Setup

The Supabase SQL files live under `supabase/`:

```text
supabase/
  reset_app_schema.sql
  pilot_cleanup.sql
  seed.sql
  migrations/
    202606220001_initial_schema.sql
    202606220002_rls_and_storage.sql
    202606280001_review_membership_request.sql
    202606280002_join_chaburah_switches_membership.sql
    202606280003_recalculate_chaburah_member_counts.sql
    202606280004_count_distinct_active_members.sql
    202606280005_assign_chaburah_leader.sql
    202606300001_update_membership_status.sql
    202606300002_list_chaburah_member_directory.sql
    202606300003_allow_all_week_learning_files.sql
    202606300004_add_learning_file_coverage.sql
    202606300005_capture_signup_city.sql
    202607020001_add_video_other_file_types.sql
    202607020002_restrict_ask_rav_to_rabbi.sql
    202607030001_allow_pending_member_profile_visibility.sql
    202607030002_stage_review_questions.sql
    202607040001_add_ask_rav_chaburah_toggle.sql
    202607050001_publish_review_library_drafts.sql
```

For a clean test project, apply the reset file first, then the migrations in order, then `seed.sql`. The seed data expects at least one `global_admin` profile because seeded announcements, files, and review questions need an author.

For pilot testing, use `CHECKPOINT_5_QA.md` as the manual test checklist. When ready to remove disposable test content, review and run `supabase/pilot_cleanup.sql`.

## Checkpoint 3 Behavior

- Dashboard actions navigate to the relevant workflows.
- Changing chaburah updates Dashboard, My Chaburah, Files, and Ask Rav through Supabase.
- Changing chaburah treats the previous participant membership as left, so a participant has one current chaburah.
- Review sessions use secured RPC calls for answer feedback and server-computed scores.
- File actions open external URLs or private Storage signed URLs when available.
- Ask Rav validates and saves questions to Supabase.
- Supabase Auth persists sessions between app launches.

## Checkpoint 4 Behavior

- Global admins can create chaburos, activate/deactivate chaburos, promote global admins, and reset users to participant.
- Global admins can search chaburos before activating/deactivating them.
- Global admins can choose which chaburah the local Admin screen is managing.
- Global admins can assign a rabbi or local admin to the selected chaburah by email.
- Local admins can edit chaburah address, structured schedule, contact email, meeting link, description, discussion setting, and join-approval setting.
- Local admins and rabbonim can approve or reject pending chaburah join requests.
- Local admins, rabbonim, and global admins can search/filter local members and suspend, reactivate, or remove participant memberships.
- Local admins and global admins can publish URL-based learning files with title, topic, week, file type, scope, and description.
- Ask the Rav questions are visible to the asker and the assigned active rabbi for that chaburah.
- Ask Rav can be enabled or disabled per chaburah; when disabled, it is hidden from Dashboard.
- Assigned rabbonim can answer Ask the Rav questions.
- Rabbi Hub stages review questions before participants see them.
- Rabbonim can build questions for one week while browsing public library questions from another week.
- Rabbonim can copy public library questions into their chaburah, edit the staged copies, and publish the full week when ready.
- Global Admin public-library questions are staged first, then published to the library when ready.
- Review answer keys remain in the protected `review_question_answers` table.
- Mobile bottom navigation shows Rabbi Hub for rabbi/global admin accounts.

## Checkpoint 5 Behavior

- My Chaburah shows a read-only active member roster with names, roles, and joined dates.
- The roster is loaded through a display-safe RPC that does not expose member email addresses to regular participants.
- Signup collects first name, last name, and optional city, then stores full name/city in the profile.
- Profile lets users edit first name, last name, and city while email, role, and current chaburah remain read-only.
- Admin file publishing supports either native file upload through `expo-document-picker`/`expo-file-system` or an external URL, with material types such as Source Sheet, Review Sheet, Recording, Video, PDF, and Other.
- Admin file publishing uses Coverage: Week, Bechina Review, or Entire Zman. Week files show a week selector with the current week selected by default.
- Admins can edit file metadata, replace uploaded files, change a file to an external link, and delete file records/storage objects.
- Uploaded files are saved to the private `learning-files` Supabase Storage bucket and opened later through signed URLs.
- Main Supabase-backed screens include a header refresh button for manual cross-device sync while testing.
- Checkpoint 5 has a manual QA checklist and pilot cleanup SQL draft.

## Verification

Recently verified commands:

```bash
npm run typecheck
npx expo-doctor
npx expo export --platform web --output-dir .tmp-checkpoint4-web
```

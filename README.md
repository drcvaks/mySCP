# mySCP

Checkpoint 4 for a cross-platform Expo app for a Semichas Chaver Program-style learning community.

The app now includes:

- Expo Router project structure
- TypeScript configuration
- Responsive, role-aware navigation
- Dashboard
- My Chaburah
- Searchable and filterable Files
- Multi-question Review sessions with secured answer checking and saved history
- Searchable Directory with Supabase-backed Join/Joined behavior
- Ask the Rav submission form and live question history
- Rabbi Hub tools for answering questions and publishing review questions
- Admin tools for local chaburah settings and URL-based learning files
- Global Admin tools for chaburah creation, chaburah status, and role assignment
- Profile screen
- Settings placeholder
- Supabase Auth session handling
- Live Supabase reads and RPC calls for participant workflows
- Supabase-backed admin/rabbi workflows

Native file uploads are not implemented yet. Checkpoint 4 supports publishing learning-file records by external URL; Supabase Storage upload UX can be added in a later checkpoint.

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
  seed.sql
  migrations/
    202606220001_initial_schema.sql
    202606220002_rls_and_storage.sql
    202606280001_review_membership_request.sql
```

For a clean test project, apply the reset file first, then the migrations in order, then `seed.sql`. The seed data expects at least one `global_admin` profile because seeded announcements, files, and review questions need an author.

## Checkpoint 3 Behavior

- Dashboard actions navigate to the relevant workflows.
- Changing chaburah updates Dashboard, My Chaburah, Files, and Ask Rav through Supabase.
- Review sessions use secured RPC calls for answer feedback and server-computed scores.
- File actions open external URLs or private Storage signed URLs when available.
- Ask Rav validates and saves questions to Supabase.
- Supabase Auth persists sessions between app launches.

## Checkpoint 4 Behavior

- Global admins can create chaburos, activate/deactivate chaburos, and assign app roles by email.
- Local admins can edit chaburah address, schedule, meeting link, description, discussion setting, and join-approval setting.
- Local admins and rabbonim can approve or reject pending chaburah join requests.
- Local admins and global admins can publish URL-based learning files with title, topic, week, file type, scope, and description.
- Rabbonim and global admins can answer Ask the Rav questions.
- Rabbonim and global admins can publish review questions while answer keys remain in the protected `review_question_answers` table.

## Verification

Recently verified commands:

```bash
npm run typecheck
npx expo export --platform web --output-dir .tmp-checkpoint4-web
npx expo-doctor
```

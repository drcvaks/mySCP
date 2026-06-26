# mySCP

Checkpoint 2 for a cross-platform Expo app for a Semichas Chaver Program-style learning community.

This checkpoint includes:

- Expo Router project structure
- TypeScript configuration
- Responsive, role-aware navigation
- Dashboard
- My Chaburah
- Searchable and filterable Files
- Multi-question Review sessions with scoring and local history
- Searchable Directory with local Join/Joined behavior
- Ask the Rav submission form and local question history
- Rabbi Hub placeholder
- Admin placeholder
- Global Admin placeholder
- Profile screen
- Settings placeholder
- Supabase Auth session handling
- Live Supabase reads and RPC calls for participant workflows

Administrative screens are still placeholders. Remote file uploads and full admin/rabbi management workflows are not yet implemented.

Checkpoint 3 Supabase schema and RLS drafts are available in `supabase/`. The Expo app now reads Supabase credentials from `.env` and uses Supabase Auth plus live database/RPC calls for the participant workflows.

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

## Checkpoint 2 Behavior

- Dashboard actions navigate to the relevant workflows.
- Changing chaburah updates Dashboard, My Chaburah, Files, and Ask Rav through Supabase.
- Review sessions use secured RPC calls for answer feedback and server-computed scores.
- File actions open external URLs or private Storage signed URLs when available.
- Ask Rav validates and saves questions to Supabase.
- Supabase Auth persists sessions between app launches.

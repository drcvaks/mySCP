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
- Mock data for users, chaburos, announcements, files, and review questions
- Persisted local state using AsyncStorage

It does not yet include Supabase, authentication, remote file storage, SQL, migrations, RLS, or backend wiring.

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
  data/
    mockData.ts
  state/
    AppState.tsx
  shared/
    components.tsx
    format.ts
    permissions.ts
    theme.ts
    types.ts
```

The mock data and persisted local state are shaped with TypeScript interfaces so future Supabase queries can replace them with minimal UI changes.

## Checkpoint 2 Behavior

- Dashboard actions navigate to the relevant workflows.
- Changing chaburah updates Dashboard, My Chaburah, Files, and Ask Rav.
- Review sessions support previous/next navigation, immediate feedback, completion scoring, retry, and saved history.
- File actions open real URLs when available and show a clear unavailable-file message for mock files.
- Ask Rav validates and saves questions locally.
- Local state persists between app sessions on Android and web.

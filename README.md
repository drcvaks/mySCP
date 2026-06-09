# mySCP

Checkpoint 1 for a cross-platform Expo app for a Semichas Chaver Program-style learning community.

This checkpoint intentionally includes only:

- Expo Router project structure
- TypeScript configuration
- Role-aware tab navigation
- Dashboard
- My Chaburah
- Files
- Review
- Directory
- Ask the Rav
- Rabbi Hub placeholder
- Admin placeholder
- Global Admin placeholder
- Profile screen
- Mock data for users, chaburos, announcements, files, and review questions

It does not include Supabase, authentication, storage, SQL, migrations, RLS, or backend wiring.

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
src/
  data/
    mockData.ts
  shared/
    components.tsx
    format.ts
    permissions.ts
    theme.ts
    types.ts
```

The mock data is shaped with TypeScript interfaces so future Supabase queries can replace the arrays with minimal UI changes.

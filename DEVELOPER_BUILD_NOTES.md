# mySCP Developer Build Notes

Private beta goal: distribute mySCP only to invited testers on Android, iOS, and Windows web.

## Before Building

Confirm environment variables are present locally:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Run validation:

```bash
npm.cmd run typecheck
npx.cmd expo-doctor
```

## Android Preview APK

Build an internal APK:

```bash
eas build --platform android --profile preview
```

After EAS finishes:

- Copy the EAS build link.
- Share it only with invited Android testers.
- Tell testers this is a private beta APK outside the Play Store.
- Explain that Android may show an "install unknown app" warning.
- Testers should install only from the official link you send.

## iOS Preview and TestFlight

Build an iOS preview:

```bash
eas build --platform ios --profile preview
```

For TestFlight/App Store Connect flow:

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

iOS differs from Android because Apple controls device signing and TestFlight distribution. For most external iPhone/iPad testers, TestFlight is the practical path.

## Web Build

Export the web build:

```bash
npx expo export --platform web
```

Then host the exported web files with the chosen private beta hosting provider. Windows testers should use the hosted URL in a modern browser such as Chrome or Edge.

## Tester Instructions To Send

Ask testers to report:

- Device and operating system.
- Browser, if using web.
- App role.
- Screen name.
- Exact steps taken.
- Expected result.
- Actual result.

Use the in-app Beta Feedback page for reports and the Tester Checklist page for progress.

## Current Beta Features

- Beta notice on logged-in screens.
- Beta Feedback page with automatic platform label.
- Help / How to Use page with role-specific quick starts.
- Tester Checklist page with per-user saved progress.

## Known Build Notes

- `eas.json` has `preview` and `production` profiles.
- Android preview uses APK output for easier private install.
- Production iOS builds should be submitted through Apple/TestFlight.
- Web export does not choose hosting by itself.
- Do not commit `.env`; `.env.example` should contain placeholder names only.

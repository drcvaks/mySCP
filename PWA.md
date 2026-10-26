# mySCP Home Screen App

## Deployment

Build and deploy the website normally with `npx expo export --platform web`.
Expo copies `public/` into the export. Include all public files and the Vercel
configuration in the deployment. HTTPS is required on the live site. No SQL,
Apple Developer membership, native rebuild, or new secrets are needed.

The manifest, icons, and bootstrap script are linked by `public/index.html`,
which matches the project's single-page Expo web output. Do not change to static
or server output without moving these head elements to the appropriate HTML entry.

After deployment, confirm these URLs return their actual files, not the app HTML:

- `/manifest.webmanifest` (JSON)
- `/pwa-bootstrap.js` and `/sw.js` (JavaScript)
- `/icons/icon-192-v2.png`, `/icons/icon-512-v2.png`, `/icons/apple-touch-icon-v2.png`
- `/offline.html`

## Installation

Mobile web users see a compact install suggestion. Dismissing it hides it for
seven days in that browser; **Install mySCP** remains in the navigation menu.
Desktop browsers have the menu option without an automatic banner.

Mobile browsers also have a compact icon beside the account avatar at the top
of the page. Tablets show its Install label when space permits. The account
dropdown includes Install mySCP on desktop and mobile, with desktop shortcut
guidance where the browser offers it. Website code does not create OS shortcuts
silently or guarantee that every browser offers the same installation choices.

After a successful new registration, an invitation appears once the user has
confirmed their email (if required), signed in, and reached the dashboard.
Install opens the appropriate browser prompt/instructions; Not Now dismisses the
invitation and the banner. The pending/seen state is per account in that browser's
local storage, not Supabase; it survives confirmation in another tab on the same
origin. Confirming on a different device/browser will not transfer that reminder.
Existing sign-ins, recovery screens, and native/already-installed apps do not
receive this invitation. Blocked storage falls back to memory for the session.

- Android: uses the browser install prompt when available, otherwise explains
  Chrome's **Install app / Add to Home screen** menu.
- iPhone/iPad: explains Safari's **Share > Add to Home Screen > Add**. Leave
  **Open as Web App** enabled if shown.
- Desktop: explains Chrome/Edge install and Safari's **Add to Dock** option.

Opening the Home Screen app hides installation prompts and menu actions. An iOS
browser tab cannot reliably discover a separate existing Home Screen install;
the dismissal is therefore a reminder preference, not proof of installation.
Browser availability and installation decisions remain under browser/user control.

## Updates, Privacy, and Offline Behavior

The production-only service worker caches **only** `/offline.html`, a generic
connection notice. It does not cache app bundles, authenticated pages, Supabase
requests, PDFs, learning material, or accounts. Navigation is network-first; the
notice is shown only when a navigation cannot reach the network. There is no
offline editing, queued write, or automatic page reload. Normal launches/reloads
receive the deployed app; the install does not require a store update.

Only this feature's own old connection-notice caches are removed. Local Expo
development does not register a worker. Test production workers on a separate
localhost port so they do not control a development server.

Push notifications are **not included** in this phase. No notification permission
is requested. A later phase can add permission/subscription management and secure
delivery connected to existing notification preferences and server-side events.

## Verification

- `node scripts/test_pwa.cjs`
- `npx tsc --noEmit`
- `npx expo export --platform all --output-dir tmp/pwa-export`
- `node scripts/test_pwa_webkit.cjs` (local WebKit + installed Microsoft Edge;
  synthetic accounts only; requires the exported files above)

The browser test checks iPhone-sized, tablet, and landscape layouts, Android
prompt behavior with a simulated browser install event, installed-mode hiding,
dismissal/menu access, and a real production service worker in Edge. A physical
iPhone/iPad and Android should still be used to confirm their OS installation
sheets and Home Screen launch after deploying to HTTPS.

Icons are resized from `assets/branding/myscp-app-icon-v2.png`; regenerate with
`node scripts/prepare_pwa_icons.cjs` when changing the app artwork. Versioned
filenames avoid reusing old browser icon caches. An existing iPhone Home Screen
icon may need to be removed and added again after deployment to show the update.
The original `SCP Icon.png` used in printed material is unchanged.

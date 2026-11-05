# Gemini UI Integration

Source: `origin/Gemini-UI-Fix` at `b6ff2ce`, compared against main `44785d7`.
The separate Antigravity folder's changed files matched the branch exactly.

## Scope

Reviewed all 39 differing files. Transferred 37 design/screen files into the
current working tree without merging or committing either branch. Retained the
two existing local PWA registration helpers rather than replacing their storage
keys and previously recorded invitation state.

Included the theme, brand assets, header/account pill, grouped navigation,
participant screens, compact Files, My Chaburah message presentation and members
at the bottom, Rabbi tools, official-material pickers, and Beis Midrash cards and
reply/action menus. No new dependency or app SDK upgrade is required.

## Backend Review

- Supabase schema/migrations, RLS, client setup, database types, permissions,
  AuthState, AppState, package manifests, and app configuration are unchanged.
- AST comparison found no changes to Supabase query or RPC call expressions
  in the differing screens/components. Save/publish/import handlers and scope
  filtering are retained. Added program helper exports delegate to existing
  access-aware selectors rather than creating new permission logic.
- Translation records, canonical chunk IDs, packet languages, question results,
  chaburah scoping, private resources, and rich-document/print code are preserved.
- No live Supabase credentials were used and no live database/data were changed.
  No SQL migration is needed for this UI transfer.

The source comparison can be reproduced with `node scripts/audit_gemini_ui.cjs`.
Its detailed report is written to `tmp/gemini-ui-review/backend-call-audit.json`.

## Integration Corrections

- Restored the disabled Ask Rav menu guard and selected-chaburah permissions.
- Kept the new account-menu presentation while preserving refresh failures,
  duplicate-click protection, signed-out hiding, rotation dismissal, and scrolling
  on short screens. Kept unsaved-work confirmation and failed sign-out handling.
- Removed a width-based flex-basis from the sidebar: in a vertical phone drawer
  it incorrectly shortened the drawer and displaced its fixed Sign Out footer.
- Constrained the My Chaburah jump buttons to wrap inside the mobile viewport.
- Used proper tab semantics for the new segmented controls (rather than buttons
  inside a tablist), including the separate sign-in mode selector.
- Kept tool-card border dimensions stable when selecting another Rabbi tool.
- Connected the new Zoom shortcut to the existing `zoomLink` field, allowing only
  HTTPS links and handling open failures. No new database field was introduced.
- Preserved Beis Midrash's smoother refetch while resetting displayed data on
  user/program/access changes. Do not offer Restore for author-deleted replies.
- Preserved existing program, language, RTL, packet title, preview, and print APIs.

## PWA Compatibility

The existing manifest, service worker, icons, installer, registration invitation,
root provider, and hosting configuration are unchanged. The redesigned header,
account dropdown, and sidebar retain the install controls. No offline data cache
or push-notification behavior was added.

Important: `src/shared/pwaRegistration.ts` and
`src/shared/pwaRegistration.web.ts` were already untracked in the main checkout,
although tracked code imports them. Include these files, the new `src/data/`
brand assets, `ui.tsx`, and `SignOutButton.tsx` when committing the integration.
Do not stage unrelated Content, temporary output, or credential files.

## Verification

- TypeScript and focused permissions/program/publishing/title/PWA/rich-content
  tests; local PostgreSQL language, result, CSV import, and private resource tests.
- Production WebKit screen matrix across participant, Rabbi, and Global Admin at
  phone and desktop sizes: 72 screen/viewport combinations passed. Screenshots
  and results: `tmp/gemini-ui-review/`. All 17 focused frontend tests passed.
- WebKit/Edge PWA invitation, installation, offline/reconnect, account-menu,
  sign-out, Hebrew draft/publish/Files/printing workflows.
- Web, Android, and iOS bundle exports; Edge print-media logo layout checks.
- Beis Midrash browser + local PostgreSQL/Storage workflow: official Notes/Q&A
  links, previews, private uploads/removal, posting/editing/replies, following,
  unread/bookmark, search, moderation, RTL, private sign-in links, participant denial.

Browser-engine emulation is not a physical iPhone/Android acceptance test. After
deployment, spot-check the new design on real devices, including landscape.

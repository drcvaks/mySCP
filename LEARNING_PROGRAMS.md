# Learning Programs

## Winter rollout

`WINTER_ONLY_ROLLOUT` in `src/shared/learningPrograms.ts` is temporarily enabled.
When Winter is installed, the old Summer 5786 test program is hidden. Winter 5787
is the fallback for hidden/unavailable defaults. Authorized new programs remain
selectable, and their configured chaburah defaults are honored.
Summer data, labels, counters and database defaults are not altered or deleted.
Older mobile builds must be updated to receive this behavior.

To bring back both buttons, disable this flag and redeploy. Normal chaburah defaults
then apply again; set those to Winter before restoring switching if Winter should remain the default.

## Summer 5787 Early Access

Deploy the updated app, then run the entire file
`supabase/migrations/202610140001_early_access_learning_programs.sql` once in the
Supabase SQL Editor, after the learning-program and rich-content migrations.
The migration is transactional and checks that the supplied chaburah exists.
It has been tested locally, not applied to the live project by Codex.

- Adds Summer 5787 / Hilchos Tefillin, starting at Week 1, with an Early Access badge.
- Grants access to Global Admins and active members of chaburah
  `70a993a2-7668-4775-aa46-7ac82117d35b`.
- Sets only that chaburah's default to Summer 5787. Other stored defaults and all
  existing week counters, questions, files, packets and scores remain unchanged.
- The pilot chaburah retains Winter. Global Admins retain Winter in their own
  chaburah and can explicitly choose either program and set its chaburah default.
- The default button is labelled `Set <program> as Chaburah Default`, appears for
  authorized managers when the selected program differs from the stored default,
  and asks for confirmation. Participants cannot manage defaults.
- App selection is scoped to the user's current chaburah. Membership is enforced
  by Supabase for program metadata, content, assets, answer checks and clone writes.
- Existing image signing caches/URLs may remain valid until their normal expiry.
- No Tefillin learning material is imported yet. New imports must use
  `program_id = 'summer-5787'`.
- Later, setting `learning_programs.early_access=false` for Summer 5787 releases it
  to everyone without renaming or copying its content. Setting `archived` alone
  does not grant/revoke access. SQL grants can authorize further pilot chaburos.

Local regression tests: `node scripts/test_early_access_programs.cjs`,
`node scripts/test_winter_rollout.cjs`, and `node scripts/test_program_controls.cjs`.

## Apply

1. Back up the database using your normal Supabase backup process.
2. Apply supabase/migrations/202610070001_learning_programs.sql once, after the existing migrations through 202608210003.
   The complete file can be run in the Supabase SQL Editor. It runs in a transaction.
3. Deploy this app version to Web and distribute updated Android/iOS builds.
4. Refresh the app. During the Winter rollout, Winter 5787 is selected in Files, Review, Rabbi Hub and Shiur Builder.

This migration has been tested in an isolated PostgreSQL instance. It has not been applied to the live Supabase project.
Do not rerun the migration after it succeeds: it creates new tables, columns and functions.

## Preserved data

- Existing questions, content chunks, packets, files and review sessions become Summer 5786 records in place.
- Their IDs, relationships, scores and publication status are retained.
- Each existing chaburah gets a Summer counter initialized from the previous global counter and a Winter counter starting at 1.
- Existing chaburos keep Summer as their default. A manager can select Winter and choose Make Default for Chaburah.
- Publishing, clone operations, packet items, suggestions and review sessions cannot mix programs.
- Summer 5786 appears as a separate badge. Existing packet titles are not rewritten.
- The legacy global week setting remains intact, but new app versions use chaburah/program counters.
- Older mobile clients remain Summer-only through an additional restrictive read policy. This does not replace existing membership/role access checks.

## Current behavior

- Selecting a program is shared across the current user's app navigation. It does not advance a counter or change the chaburah default.
- Reloading/signing in uses the chaburah's configured default if available to the user; otherwise it falls back to Winter.
- Change Current Week updates only the current chaburah's selected program.
- Choosing a packet/question week does not change that counter.
- Program switching clears form/quiz state. Unsaved packet/question/file edits require confirmation; saved drafts remain available in the original program.
- Scores on Review and Dashboard use the selected program and current chaburah, including legacy sessions with no recorded chaburah.
- My Chaburah files follow the selected program; announcements and discussions remain chaburah-wide.
- Winter starts empty. No Challah content or test data is imported by this migration.
- Future imports must explicitly set program_id to winter-5787. Omitting the field intentionally defaults to Summer for legacy compatibility.
- Program metadata supports an archived flag and the selector supports Past Programs. An archival administration workflow is a future task.

## Verify

1. Check an existing Summer packet, question and review score.
2. Switch to Winter and confirm Summer items are absent.
3. Set Winter's current week to 2; switch back and confirm Summer's counter did not change.
4. Publish a Winter Week 1 draft and confirm Summer Week 1 drafts remain unpublished.
5. Switch back to Summer and confirm its full question history, including Week 16, remains available.
6. Confirm participants cannot change counters or the chaburah default.
7. Confirm packet previews/print headers show Summer 5786 or Winter 5787.

For a controls-only demonstration with no database writes, run Expo in development and open /learning-program-preview.

## Local tests

The isolated SQL test uses a temporary PGlite install, not the live project:

    npm.cmd install --prefix tmp/program-tests --no-save --package-lock=false @electric-sql/pglite
    node scripts/test_learning_programs.cjs
    npm.cmd run typecheck

Do not commit tmp/program-tests/node_modules or development exports.

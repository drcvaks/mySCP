# Chaburah Review Results

Apply `supabase/migrations/202610210002_chaburah_review_results.sql` in Supabase
before using the results table. This migration does not require the packet-heading
migration and does not change published questions or existing review sessions.

The table is at the bottom of Rabbi Hub > Quick Review Questions, for the selected
zeman and current managed chaburah. Only authorized chaburah managers or Global
Admins can retrieve results. Participants cannot retrieve other members' results.

## Scoring

- Each published chaburah question counts once per person. Its first submitted
  answer is scored and stored on the server before feedback is returned.
- Restarting, retrying, or reviewing All Weeks cannot replace that first answer.
- Repeated answers still return normal feedback and can appear in normal review
  history, but do not change the results table.
- Score is total first answers correct divided by total distinct questions answered,
  not an average of weekly percentages.
- Participation is distinct questions answered out of currently enabled, published
  chaburah questions in the selected zeman/week. Disabled/deleted questions are
  excluded from both scoring and the available count. Unanswered questions do not
  count as incorrect.
- Weeks tried counts weeks with at least one answer, not weeks completed.
- All active members are included, including members with no answers. Equal exact
  percentages share a rank; participation breaks display order, not rank. Prize
  eligibility or minimum participation is not automated.
- Each published question ID is distinct. Deleting and recreating a question creates
  a new question; editing an existing question preserves its original first score.

## Existing history

The migration backfills each person's earliest saved answer per question. It does
not pick the best result. Before this migration, abandoned reviews were not saved;
those earlier attempts cannot be recovered. Future first answers are stored even
if the person leaves before completing the review. Historical rankings therefore
should not be treated as fully audited competition results.

## Verification

- `node node_modules/typescript/bin/tsc --noEmit`
- `node scripts/test_review_results_sql.cjs` (uses PGlite in
  `tmp/review-results-tests/node_modules`, or an installed `@electric-sql/pglite`)
- `node scripts/test_review_results_webkit.cjs` (uses the existing mobile WebKit
  test runtime and synthetic data; no production requests or writes)

The new ledger has RLS enabled and no direct client grants. Recording and aggregate
reads use security-definer functions with authentication, membership, program
access checks, and server-side answer scoring. A unique key makes concurrent
retries unable to overwrite a first answer.

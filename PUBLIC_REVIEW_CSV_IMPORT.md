# Public Review Library CSV Import

## One-time setup

Apply `supabase/migrations/202610140002_import_public_review_csv.sql` after the existing learning-program migrations. Deploy the app changes. This adds a Global Admin-only import function; it does not import questions or change existing questions.

## Import a question bank

1. Open **Global Admin > Public Review Library**.
2. Select the learning program explicitly, such as **Winter 5787**.
3. Download the CSV template, or use an existing compatible CSV saved as UTF-8.
4. Choose the CSV. Review errors, warnings, week totals, model counts, and question previews.
5. Click **Validate Import** to check against the database.
6. Click **Import Questions** and confirm the program and count.

Questions go only into the public question library. A Rav must separately copy them to his chaburah's drafts and publish them for participants. Importing does not change the current week or default program.

In Excel, use **Save As > CSV UTF-8 (Comma delimited) (*.csv)**. Regular CSV or tab-delimited exports can use a legacy encoding that damages Hebrew or curly quotation marks when read as UTF-8. Renaming the extension does not convert the file. The importer rejects unreadable text rather than guessing an encoding and risking changed question text.

## CSV columns

Required: `week,question_type,prompt,choice_a,choice_b,choice_c,choice_d,correct_choice,explanation,is_model_question`.

Optional: `section,topic,difficulty,correct_answer`.

- `week`: integer 1-52, relative to the selected program.
- `question_type`: `true_false` or `multiple_choice`.
- Multiple choice: four distinct, nonempty choices; `correct_choice` is A, B, C, or D.
- True/False: A is True, B is False, C and D are empty; `correct_choice` is A or B.
- `is_model_question`: TRUE/FALSE or Y/N. TRUE is included in that week's default model set; FALSE remains an extra library question.
- Prompt and explanation are required. If supplied, `correct_answer` must match the selected choice.
- Optional `difficulty`: easy, medium, or hard. Section/topic supply the question's topic label; difficulty is validated but not stored because the app has no difficulty field.
- Legacy headers `type`, `question`, `correct_letter`, and `Model Question` are also accepted.

Maximum: 500 questions and 2 MB per file. Quoted commas, line breaks, and Hebrew are supported. Unknown columns are rejected to catch spelling mistakes.

## Duplicate protection

An existing library question is matched by program, week, and prompt (case-insensitive, ignoring surrounding spaces). An identical question is skipped, even if its topic label differs. Different answers, explanation, model flag, or publication state block the entire import. Nothing is overwritten. Duplicate prompts within the same week of one CSV are also blocked.

All questions and answer keys are inserted in one transaction after server-side validation. A failed batch inserts nothing. Re-importing an unchanged file is safe.

## Local verification

Run `node scripts/test_public_review_import.cjs` and `npm run typecheck`. The database tests run in isolated PGlite, not the live Supabase project. The development-only `/public-review-import-preview` route exercises the UI with mock responses and performs no database writes.

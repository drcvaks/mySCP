# Winter 5787 Quick Review Import

Run `supabase/imports/202610120001_winter_challah_part1_review_questions.sql`
in the Supabase SQL Editor as one complete script. This is content SQL, not a
schema migration. The learning-program and model-question migrations must already
be installed, and a Global Admin profile must exist.

The reviewed CSV currently contains 49 questions, with 36 model questions:

| Week | Questions | Model | Extras |
| --- | ---: | ---: | ---: |
| 1 | 11 | 8 | 3 |
| 2 | 12 | 8 | 4 |
| 3 | 14 | 11 | 3 |
| 4 | 12 | 9 | 3 |

## Mapping

- `program_id`: always `winter-5787`.
- `week`: CSV week, unchanged.
- `topic`: `Hafrashas Challah Part 1 - Section <section> - <topic>`.
- `question_type`: `kind`, using `true_false` or `multiple_choice`.
- Choices: JSON array in CSV order. True/False displays `True`, `False`.
- `correct_choice`: A/B/C/D becomes 0/1/2/3 in `review_question_answers`.
- `explanation`: stored with the protected answer key, not in the question row.
- `correct_answer`: cross-check only; must agree with the selected choice.
- `is_model_question`: CSV TRUE/FALSE, unchanged.
- Public-library scope: `visibility='everyone'`, `chaburah_id=null`,
  `is_library_question=true`, `publication_status='published'`, `enabled=true`.
- `created_by`: an existing Global Admin profile. Existing authors/timestamps of
  creation are retained on rerun.
- Difficulty remains in the CSV/generated payload for reference. The current app
  has no question difficulty field or filter; no schema changes are required.

"Published" here means available in the public library. Participants do not get
these as chaburah quiz questions until a Rav copies and publishes them. Nothing
is posted to a chaburah, and this script creates no notifications.

## Safe Reruns

IDs are deterministic UUIDs based on this bank's namespace, week, section, and
topic. Rewording a prompt, choices, explanation, or model flag then regenerating
the SQL updates the same library entry. Chaburah copies are independent and are
not updated by this import. Summer questions, unrelated Winter questions, and
existing scores are not modified.

Changing week, section, or topic changes an ID. Removing a CSV row does not delete
its previously imported entry. Ask for a targeted reconciliation if moving,
renaming, or removing already-imported questions. Do not use an old Summer import
that deletes public questions by week without a program filter.

The transaction stops if an ID belongs to an unrelated entry, an identical Winter
library prompt exists under another ID, or a prerequisite is missing. Do not work
around these protections by deleting questions indiscriminately.

## Regeneration And Testing

After changing the reviewed CSV, run:

```powershell
python scripts/prepare_winter_review_import.py
python scripts/test_winter_review_csv.py
node scripts/test_winter_review_import.cjs
```

The generator validates the CSV and writes SQL locally; it never connects to
Supabase. The SQL test uses the isolated PGlite installation already present in
`tmp/program-tests`, never a live database. Its counts describe the current bank;
update expected counts when deliberately adding or removing rows.

Remaining editorial observations: all six True/False answers are True; three
Shabbos questions remain in Week 2 despite the Shiur 1 pace; gluten-free wheat
flour has no question. No wording, week, or model flag was changed automatically.

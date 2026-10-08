# Import Hafrashas Challah Part 1

All package generation and tests are local. No live Supabase import or image upload has been run by Codex.

## Scope

- Winter 5787 only, workbook Hafrashas Challah Part 1.
- 45 Review Notes chunks, 21 long-form Q&A chunks, 57 Source Sheet chunks.
- Source 57 is marked Part 2 and remains unlinked.
- 45 footnotes with their original numbering; Q18's approved reference is source 51.
- The Q&A map controls question/notes links. Reverse suggestions are included.
- Q&A folders follow their first linked notes section, retaining all other links.
- No participant quick-review quiz questions are created. No packets are published.
- No Summer content, questions, packets, counters or scores are changed.

## Run In Order

1. Make a database backup using your usual Supabase backup process.
2. Ensure the learning-program migration is installed. If Summer/Winter already works, do not rerun it.
3. Run supabase/migrations/202610070002_rich_learning_content.sql once in the Supabase SQL Editor.
   It adds an optional rich-document field and a private official-materials bucket.
   Do not rerun it after it succeeds.
4. Deploy this updated app to Web and distribute updated Android/iOS builds.
   Older clients that cannot display rich content will not see the new rich packets.
5. From the project folder, run:

       node scripts/upload_challah_assets.cjs

   Use your Global Admin account. The password is entered invisibly, is not saved,
   and is never shown to Codex. Check the target Supabase URL displayed by the script,
   then type UPLOAD to confirm. It uploads only official images, not content records.
   Completed uploads are verified and reused on subsequent runs. No service-role key is needed.
   Signing out at completion affects only this uploader session.
6. Run supabase/imports/202610070002_challah_part1.sql in the SQL Editor.
   The import checks all images first and runs as one transaction.
7. Refresh the app, choose Winter 5787, and open Shiur Builder.

## Storage

The package has 61 images (57 source pages and four notes diagrams), totaling 5,455,557 bytes.
Each immutable image is stored once under its SHA-256 filename in the private official-learning-materials bucket.
Notes and packets reference its storage path. Publishing the same source for another Rav does not upload or copy the image.
The app obtains temporary signed image URLs when viewing or printing; these expiring URLs are not stored in content records.

Images for this upload are under tmp/shiur-import-preview/challah-part1/import/assets.
The manifest and checksums are alongside them. Do not commit temporary assets, credentials or upload reports.
The original Word/PDF sources and the import generator should remain available so the package can be rebuilt.

## Verify Before Inviting Rabbonim

- Expand notes sections A-G and their Q&A folders.
- View a notes chunk and follow its suggested Q&A/source links in both directions.
- Check bold, italic, underlined text, numbered/nested lists, Hebrew words and footnote markers.
- Check HC1-F3's mnemonic and the diagrams in the notes.
- Confirm source 57 has no suggestions.
- Save a draft; publish only the selected category into Winter.
- Open it from Files and My Chaburah. Verify the same formatting and images.
- Print a notes packet and a source packet; wait for all images and check Print Preview.
- Switch to Summer and verify existing Nat Bar Nat packets and review scores are unchanged.

## Formatting And Limitations

The rich document retains the original text, styles, tab characters, tab-stop measurements,
indentation, list levels, footnotes, diagrams and hyperlinks. Web views and printing share
the same escaped HTML renderer. Native uses the same content and preserves inline styles,
lists and images, with approximate first-line spacing where React Native has no Word-style layout.
Browser/app pagination can differ from Word. This is not a Word editing engine.
Physical printer scaling/margins should be checked in the final print dialog.
Mobile direct printing remains unsupported, as before; use Web Print / Save PDF.

Re-running the content import reuses chunk IDs and fixes only this workbook's official content and internal links.
It does not modify packet rows. Because packets reference official chunks, later corrections to this workbook
will also be reflected when previously published Challah packets are viewed.

## Rebuild And Test

Using a Python runtime with Pillow and pypdfium2:

    python scripts/build_challah_import_preview.py
    python scripts/verify_challah_import_preview.py
    python scripts/prepare_challah_import.py
    node scripts/verify_import_bidi.cjs
    node scripts/test_rich_content.cjs
    node scripts/test_challah_import.cjs
    npm.cmd run typecheck

The SQL tests use the isolated PGlite installation described in LEARNING_PROGRAMS.md, never your live project.
The generated SQL and asset manifest can be regenerated; do not edit their content manually.

"""Read-only extraction checks against the supplied Hebrew Word documents."""
import csv
import hashlib
import json
from pathlib import Path

out = Path("tmp/shiur-import-preview/challah-hebrew-part1")
data = json.loads((out / "hebrew-preview.json").read_text(encoding="utf-8"))
audit = json.loads((out / "extraction-audit.json").read_text(encoding="utf-8"))
chunks = data["languages"]["he"]["chunks"]
by_code = {chunk["code"]: chunk for chunk in chunks}
assert len(by_code) == 48
assert data["stats"]["footnotes"] == 27
assert len(data["sources"]) == 57
assert not data["sourceDifferences"], "Recheck source references against reviewed English map"
for kind, filename, owners_key in [
    ("notes", "סיכום הלכות הפרשת חלה - חלק א.docx", "notesParagraphOwners"),
    ("qa", "שות הלכות הפרשת חלה - חלק א.docx", "qaParagraphOwners"),
    ("questions", "שאלות הלכות הפרשת חלה - חלק א.docx", "questionParagraphOwners"),
]:
    original = audit["sources"][filename]
    assert hashlib.sha256(Path("Content/Hebrew Hafrashas Challah", filename).read_bytes()).hexdigest() == original["sha256"]
    owners = audit[owners_key]
    assert set(map(int, owners)) == set(range(2, len(original["paragraphs"]) + 1))
    for paragraph in original["paragraphs"][1:]:
        chunk = by_code[owners[str(paragraph["paragraph"])]]
        doc = chunk["questionDocument"] if kind == "questions" else chunk
        block = next(b for b in doc["blocks"] if b["paragraph"] == paragraph["paragraph"])
        assert block["text"] == paragraph["text"]
        assert block["spans"] == paragraph["spans"], "Formatting or text changed"
        assert block["rtl"] is True
notes = [c for c in chunks if c["sourceType"] == "notes"]
ids = [f["id"] for c in notes for f in c["footnotes"]]
assert sorted(ids) == list(range(1, 28)), "All footnotes must be assigned exactly once"
for c in chunks:
    assert {s["footnote"] for b in c["blocks"] for s in b.get("spans", []) if s.get("footnote")} == {n["id"] for n in c["footnotes"]}
    for note in c["footnotes"]:
        assert note["blocks"] == [{k: v for k, v in p.items() if k != "images"} for p in audit["sources"][c["sourceFile"]]["footnotes"][str(note["id"])]]
assert by_code["HC1-A4"]["paragraphEnd"] == 8
assert by_code["HC1-B1"]["paragraphStart"] == 9
assert by_code["HC1-C9"]["paragraphEnd"] == 69
assert by_code["HC1-E8"]["paragraphEnd"] == 125
assert by_code["HC1-A1"]["blocks"][0]["marker"].startswith("א")
assert by_code["HC1-B1"]["blocks"][0]["marker"].startswith("ב")
with Path("Content/Hebrew Hafrashas Challah/mySCP_Hebrew_Notes_Chunks_A-E.csv").open(encoding="utf-8-sig", newline="") as stream:
    for row in csv.DictReader(stream):
        assert by_code[row["Code"]]["title"] == row["Title"]
        assert by_code[row["Code"]]["summary"] == row["Summary"]
for n in notes:
    for q in n["relatedQa"]:
        assert n["code"] in by_code[q]["relatedNotes"]
for q in [by_code[f"HC1-Q{i}"] for i in range(14, 17)]:
    assert not q["relatedNotes"] and q["pendingRelatedNotes"]
assert len(data["missingHebrewNotes"]) == 13
assert not any("HC1-S57" in c.get("relatedSources", []) for c in notes)
flags = {key: sum(bool(s.get(key)) for c in notes for b in c["blocks"] for s in b.get("spans", [])) for key in ("bold", "italic", "underline")}
assert all(flags.values())
print("PASS: exact Hebrew paragraph coverage/text/formatting, 27 footnotes, A4 shift, C9 continuation, supplied titles/summaries, matching source references, bidirectional Q&A links, and flagged missing F-G material.")
print("Preserved formatting spans:", flags)

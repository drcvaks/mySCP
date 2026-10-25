"""Build an isolated bilingual review preview. No database, network, or SQL writes."""
from __future__ import annotations

import argparse
import copy
import csv
import hashlib
import json
import re
import sys
from pathlib import Path

from build_challah_import_preview import NS, Reader, markdown, tag, val

HEBREW_SECTIONS = dict(zip("ABCDEFG", "אבגדהוז"))
QA_TITLES = [
    "חיוב הפרשת חלה מן התורה או מדרבנן", "רוב יהודי העולם בארץ ישראל",
    "השפעת רוב ישראל בארץ על שמיטה ותרומה", "שכחו להפריש חלה לפני שבת",
    "נתינת חלות לאחרים בלי הפרשה", "שכחו להפריש חלה ממצות בליל פסח",
    "מצות מארץ ישראל שנשלחו לספרד", "כמה חלה מפרישים", "אכילת חלה בידי כהן בימינו",
    "מה עושים עם הבצק שהופרש", "נייר אלומיניום שנקרע בתנור", "חלה במדורת ביעור חמץ",
    "מזלג ששימש לשריפת חלה", "גודל העיסה החייבת בחלה", "שיעורי החזון איש", "שיעור מצה בליל הסדר",
]


def hebrew_number(number):
    if not 0 < number < 100:
        raise ValueError(f"Review Hebrew list number {number}")
    if number in (15, 16):
        return {15: "טו", 16: "טז"}[number]
    return ("" if number < 10 else "יכלמנסעפצ"[number // 10 - 1]) + ("" if number % 10 == 0 else "אבגדהוזחט"[number % 10 - 1])


class HebrewReader(Reader):
    def paragraph(self, paragraph, number, xml_index):
        result = super().paragraph(paragraph, number, xml_index)
        props = paragraph.find("w:pPr", NS)
        # Word uses inherited RTL for the body; only the title has explicit w:bidi.
        result["rtl"] = True
        result["alignment"] = val(props, "w:jc", "right")
        if result["alignment"] not in ("left", "center", "right"):
            result["alignment"] = "right"
        numbering = props.find("w:numPr", NS) if props is not None else None
        if numbering is not None:
            num_id = val(numbering, "w:numId")
            level = int(val(numbering, "w:ilvl", "0"))
            config = self.numbers[num_id][level]
            if config["format"] == "hebrew1":
                result["marker"] = re.sub(r"%\d", hebrew_number(self.counts[(num_id, level)]), config["marker"])
        return result


def make_chunk(meta, paragraphs, reader):
    blocks = []
    for p in paragraphs:
        if p["text"].strip():
            blocks.append({k: copy.deepcopy(v) for k, v in p.items() if k != "images"})
        blocks.extend(copy.deepcopy(p["images"]))
    footnote_ids = sorted({number for p in paragraphs for number in p["footnoteIds"]})
    footnotes = [{"id": number, "blocks": [{k: copy.deepcopy(v) for k, v in p.items() if k != "images"}
                                           for p in reader.footnotes[number]]} for number in footnote_ids]
    text = " ".join(span["text"] for p in paragraphs for span in p["spans"] if not span.get("footnote"))
    refs = sorted({int(n) for n in re.findall(r"\((\d{1,2})\)", text) if 1 <= int(n) <= 57})
    return {**meta, "language": "he", "sourceFile": reader.path.name, "blocks": blocks, "footnotes": footnotes,
            "paragraphStart": paragraphs[0]["paragraph"], "paragraphEnd": paragraphs[-1]["paragraph"],
            "sourceNumbers": refs, "contentMarkdown": markdown(blocks, footnotes)}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("Content/Hebrew Hafrashas Challah"))
    parser.add_argument("--out", type=Path, default=Path("tmp/shiur-import-preview/challah-hebrew-part1"))
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    notes_reader = HebrewReader(args.source / "סיכום הלכות הפרשת חלה - חלק א.docx", args.out)
    qa_reader = HebrewReader(args.source / "שות הלכות הפרשת חלה - חלק א.docx", args.out)
    questions_reader = HebrewReader(args.source / "שאלות הלכות הפרשת חלה - חלק א.docx", args.out)
    readers = [notes_reader, qa_reader, questions_reader]
    assert all(not reader.tables and not any(reader.special.values()) for reader in readers), "Review unsupported Word elements"
    assert len(notes_reader.paragraphs) == 125 and sorted(notes_reader.footnotes) == list(range(1, 28))
    assert not any(reader.assets for reader in readers), "Review new embedded pictures"
    english = json.loads(Path("src/data/challahImportPreview.json").read_text(encoding="utf-8"))
    english_by_code = {c["code"]: c for c in english["chunks"]}
    with (args.source / "mySCP_Hebrew_Notes_Chunks_A-E.csv").open(encoding="utf-8-sig", newline="") as stream:
        mapping = list(csv.DictReader(stream))
    md_rows = [line.split("|")[1:-1] for line in (args.source / "mySCP_Hebrew_Notes_Chunks_A-E.md").read_text(encoding="utf-8-sig").splitlines() if line.startswith("| HC1-")]
    assert len(mapping) == len(md_rows) == 32
    for row, md in zip(mapping, md_rows):
        assert [row["Code"], row["Section"], row["Title"], row["Paragraphs"], row["Summary"]] == [cell.strip() for cell in md[:5]], "CSV/Markdown mapping disagrees"
    chunks, owners, corrections = [], {}, [
        "HC1-A4 uses Hebrew paragraphs 7-8, through the end of section א. The absent English Shulchan Aruch paragraph is not invented or translated.",
        "All ranges after A4 shift by one paragraph because the supplied map preserves English paragraph numbers.",
        "HC1-C9 includes Hebrew paragraph 69 (Minchas Yitzchok), matching the approved English continuation at paragraph 70.",
    ]
    for row in mapping:
        code = row["Code"]
        english_chunk = english_by_code[code]
        nums = list(map(int, re.findall(r"\d+", row["Paragraphs"])))
        start, end = nums[0], nums[-1]
        if code == "HC1-A4":
            end = 8
        elif code[4] != "A":
            start, end = start - 1, end - 1
        if code == "HC1-C9":
            end = 69
        paragraphs = notes_reader.paragraphs[start - 1:end]
        assert len(paragraphs) == end - start + 1
        for p in paragraphs:
            assert p["paragraph"] not in owners, "Overlapping chunk assignment"
            owners[p["paragraph"]] = code
        section = code[4]
        chunks.append(make_chunk({"code": code, "sourceType": "notes", "section": section,
            "sectionLabel": row["Section"], "sectionTitle": row["Section"], "title": row["Title"], "summary": row["Summary"],
            "englishParagraphs": row["Paragraphs"], "alignmentNote": row["Alignment Note"],
            "officialShiur": english_chunk.get("officialShiur"), "relatedQa": [],
            "relatedSources": []}, paragraphs, notes_reader))
    assert set(owners) == set(range(2, 126)), "Unassigned Hebrew notes paragraphs"
    assert {n["id"] for c in chunks for n in c["footnotes"]} == set(range(1, 28)), "Footnote lost"
    known_notes = {c["code"] for c in chunks}
    source_differences = []
    for c in chunks:
        old = english_by_code[c["code"]]
        if c["sourceNumbers"] != old["sourceNumbers"]:
            source_differences.append({"code": c["code"], "english": old["sourceNumbers"], "hebrew": c["sourceNumbers"]})
        c["relatedSources"] = [f"HC1-S{number}" for number in c["sourceNumbers"]]
    qa_starts = [i for i, p in enumerate(qa_reader.paragraphs) if p["kind"] == "list"]
    question_starts = [i for i, p in enumerate(questions_reader.paragraphs) if p["kind"] == "list"]
    assert len(qa_starts) == len(question_starts) == 16
    qa_owners, question_owners = {}, {}
    for i, start in enumerate(qa_starts):
        number = i + 1
        code = f"HC1-Q{number}"
        end = qa_starts[i + 1] if number < 16 else len(qa_reader.paragraphs)
        paragraphs = copy.deepcopy(qa_reader.paragraphs[start:end])
        assert re.fullmatch(rf"{number}[.)]", paragraphs[0]["marker"]), "Question numbering changed"
        paragraphs[0]["kind"] = "question"
        for p in paragraphs[1:]:
            p["kind"] = "answer"
        old = english_by_code[code]
        related = [n for n in old["relatedNotes"] if n in known_notes]
        pending = [n for n in old["relatedNotes"] if n not in known_notes]
        q = make_chunk({"code": code, "sourceType": "qa", "title": QA_TITLES[i],
            "summary": paragraphs[0]["text"], "section": related[0][4] if related else old["relatedNotes"][0][4],
            "relatedNotes": related, "pendingRelatedNotes": pending}, paragraphs, qa_reader)
        q["sectionLabel"] = HEBREW_SECTIONS[q["section"]]
        qs = question_starts[i]
        qe = question_starts[i + 1] if number < 16 else len(questions_reader.paragraphs)
        q_paras = copy.deepcopy(questions_reader.paragraphs[qs:qe])
        assert re.fullmatch(rf"{number}[.)]", q_paras[0]["marker"]), "Question-only numbering changed"
        # Confirm that the separate worksheet has the same question, apart from answer lines.
        normalize = lambda t: re.sub(r"[_\s]+", "", t)
        assert normalize(q_paras[0]["text"]) == normalize(paragraphs[0]["text"]), f"Question wording mismatch at {code}"
        q_paras[0]["kind"] = "question"
        q["questionDocument"] = make_chunk({"code": code}, q_paras, questions_reader)
        for p in paragraphs:
            qa_owners[p["paragraph"]] = code
        for p in q_paras:
            question_owners[p["paragraph"]] = code
        chunks.append(q)
        for note in chunks:
            if note["sourceType"] == "notes" and note["code"] in related:
                note["relatedQa"].append(code)
    assert set(qa_owners) == set(range(2, len(qa_reader.paragraphs) + 1))
    assert set(question_owners) == set(range(2, len(questions_reader.paragraphs) + 1))
    for i, c in enumerate(chunks, 1):
        c["sortOrder"] = i
    missing_notes = [c["code"] for c in english["chunks"] if c["sourceType"] == "notes" and c["code"] not in known_notes]
    warnings = [
        "Hebrew notes currently contain sections א-ה only: 32 chunks. English has 45 chunks, including F-G. Missing Hebrew notes are not silently replaced by English.",
        "Hebrew Q&A and the question-only worksheet each contain questions 1-16; English has 1-21. Q14-Q16 point to Hebrew section F notes that have not been supplied.",
        "Hebrew Q&A titles are preview labels prepared from the question topics. The official question and answer text is extracted verbatim for review.",
        "Source-sheet images are shared across languages; source 57 remains intentionally unlinked for Part 2.",
        "No table or embedded image is present in the supplied Hebrew Word files. All 27 Hebrew footnotes are preserved; the English full workbook has 45.",
        "Before a real import, add language-aware storage and uniqueness. Current chunk_code is globally unique, so inserting the same HC1 codes again would conflict. Keep canonical codes, assign separate language records/IDs, and scope notes/Q&A suggestions, packets, viewing and printing by language.",
        "The preview demonstrates RTL folders and right-side list markers. The live builder and published/print renderers still need the corresponding language/RTL changes before import.",
        "This is an isolated local preview. No existing English material was relabeled or changed, and no SQL/import was produced.",
    ]
    data = {"title": "Hafrashas Challah Part 1 - Hebrew Review", "languages": {
        "he": {"chunks": chunks, "notesDocumentTitle": notes_reader.paragraphs[0], "qaDocumentTitle": qa_reader.paragraphs[0]},
        "en": {"chunks": [c for c in english["chunks"] if c["sourceType"] != "sources"],
               "notesDocumentTitle": english["notesDocumentTitle"], "qaDocumentTitle": english["qaDocumentTitle"]}},
        "sources": [c for c in english["chunks"] if c["sourceType"] == "sources"],
        "sectionLabels": HEBREW_SECTIONS, "corrections": corrections, "warnings": warnings,
        "stats": {"notesChunks": 32, "qaChunks": 16, "footnotes": 27, "sourceChunks": 57,
                  "notesParagraphs": 125, "qaParagraphs": len(qa_reader.paragraphs), "questionParagraphs": len(questions_reader.paragraphs)},
        "missingHebrewNotes": missing_notes, "sourceDifferences": source_differences}
    encoded = json.dumps(data, ensure_ascii=False, indent=2)
    (args.out / "hebrew-preview.json").write_text(encoded, encoding="utf-8")
    template = Path(__file__).with_name("hebrew_challah_preview_template.html").read_text(encoding="utf-8")
    safe = encoded.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    (args.out / "index.html").write_text(template.replace("__PREVIEW_DATA__", safe), encoding="utf-8")
    audit = {"stats": data["stats"], "notesParagraphOwners": owners, "qaParagraphOwners": qa_owners,
        "questionParagraphOwners": question_owners, "missingHebrewNotes": missing_notes,
        "sourceDifferences": source_differences, "corrections": corrections, "warnings": warnings,
        "sources": {r.path.name: {"sha256": hashlib.sha256(r.path.read_bytes()).hexdigest(),
                    "paragraphs": r.paragraphs, "footnotes": r.footnotes} for r in readers}}
    (args.out / "extraction-audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    for kind, filename in [("notes", "notes_hebrew.md"), ("qa", "qa_hebrew.md")]:
        (args.out / filename).write_text("\n\n".join(f'## {c["code"]} - {c["title"]}\n\n{c["contentMarkdown"]}' for c in chunks if c["sourceType"] == kind), encoding="utf-8")
    report = ["# Hebrew Challah Part 1 Preview", "", "Local review only. Open index.html; no server or database import is required.", "", "## Findings", ""]
    report.extend("- " + item for item in corrections + warnings)
    report.extend(["", "## Source-reference differences to review", "", json.dumps(source_differences, ensure_ascii=False, indent=2), "", "## Hebrew chunk boundaries", "", "| Code | Hebrew paragraphs | Footnotes |", "| --- | --- | --- |"])
    report.extend(f'| {c["code"]} | {c["paragraphStart"]}-{c["paragraphEnd"]} | {", ".join(str(n["id"]) for n in c["footnotes"])} |' for c in chunks)
    (args.out / "REVIEW.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print(json.dumps(data["stats"], indent=2))
    print("Source reference differences:", json.dumps(source_differences, ensure_ascii=False))
    print("Preview:", args.out / "index.html")


if __name__ == "__main__":
    main()

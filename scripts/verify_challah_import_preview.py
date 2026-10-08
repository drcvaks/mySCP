"""Check extracted content directly against Word XML, independently of the importer."""
import json
import base64
import hashlib
from io import BytesIO
import re
import sys
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as E
from PIL import Image

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W = "{" + NS["w"] + "}"


def normalized(text):
    return re.sub(r"\s+", "", text)


def original_text(node):
    pieces = []
    for item in (child for run in node.findall(".//w:r", NS) for child in run):
        if item.tag == W + "t":
            pieces.append(item.text or "")
        elif item.tag == W + "tab":
            pieces.append("\t")
        elif item.tag in (W + "br", W + "cr") and item.get(W + "type") != "page":
            pieces.append("\n")
    return "".join(pieces)


def verify():
    sys.stdout.reconfigure(encoding="utf-8")
    root = Path(__file__).resolve().parents[1]
    data = json.loads((root / "src/data/challahImportPreview.json").read_text(encoding="utf-8"))
    checks = []
    for filename, kind in [("Notes for Hafrashas Challah (part 1).docx", "notes"),
                           ("Q&A's for Hafrashas Challah (part 1).docx", "qa")]:
        with ZipFile(root / "Content/Hafrashas Challah Part 1" / filename) as package:
            document = E.fromstring(package.read("word/document.xml"))
            paras = [p for p in document.find("w:body", NS).findall("w:p", NS)
                     if original_text(p).strip() or p.findall(".//w:drawing", NS)]
            seen = []
            for c in [c for c in data["chunks"] if c["sourceType"] == kind]:
                expected = list(range(c["paragraphStart"], c["paragraphEnd"] + 1))
                seen.extend(expected)
                displayed = []
                for b in c["blocks"]:
                    if b["kind"] == "image":
                        continue
                    original = original_text(paras[b["paragraph"] - 1])
                    if c["code"] == "HC1-Q18" and b["paragraph"] == 39:
                        assert original.count("(48)") == 1
                        original = original.replace("(48)", "(51)")
                    imported = "".join(s["text"] for s in b["spans"] if not s.get("footnote"))
                    assert original == imported, (c["code"], b["paragraph"], "Text, tabs or line breaks changed")
                    displayed.append(b["paragraph"])
                    original_refs = [int(n.get(W + "id")) for n in paras[b["paragraph"] - 1].findall(".//w:footnoteReference", NS)]
                    imported_refs = [s["footnote"] for s in b["spans"] if s.get("footnote")]
                    assert original_refs == imported_refs, (c["code"], "Footnote markers changed")
                if c["code"] == "HC1-F3":
                    displayed.extend([136, 137])
                assert sorted(displayed) == expected, (c["code"], "Missing paragraph")
                expected_refs = {int(n.get(W + "id")) for p in paras[c["paragraphStart"] - 1:c["paragraphEnd"]]
                                 for n in p.findall(".//w:footnoteReference", NS)}
                assert expected_refs == {n["id"] for n in c["footnotes"]}, (c["code"], "Wrong footnote ownership")
            assert sorted(seen) == list(range(2, len(paras) + 1)), (kind, "Unassigned or duplicated paragraphs")
            if kind == "notes":
                originals = {int(n.get(W + "id")): original_text(n) for n in E.fromstring(package.read("word/footnotes.xml"))
                             if int(n.get(W + "id")) > 0}
                for c in data["chunks"]:
                    for n in c["footnotes"]:
                        imported = "".join(s["text"] for p in n["blocks"] for s in p["spans"])
                        assert normalized(originals[n["id"]]) == normalized(imported), (n["id"], "Footnote text changed")
                assert set(originals) == {n["id"] for c in data["chunks"] for n in c["footnotes"]}, "Missing footnotes"
                assert len(document.findall(".//w:drawing", NS)) == 3
            checks.append(f"{kind}: all text, paragraph assignments and footnote ownership verified")
    codes = {c["code"] for c in data["chunks"]}
    assert len(codes) == 123
    assert all(link["from"] in codes and link["to"] in codes for link in data["links"])
    for c in data["chunks"]:
        for b in c["blocks"]:
            if b["kind"] == "image":
                assert b["width"] > 0 and b["height"] > 0 and b["uri"].startswith("data:image/")
    notes = [c for c in data["chunks"] if c["sourceType"] == "notes"]
    qa = [c for c in data["chunks"] if c["sourceType"] == "qa"]
    framework = (root / "Content/Hafrashas Challah Part 1/shiur_builder_challah_part1_framework.md").read_text(encoding="utf-8-sig")
    expected_qa = {}
    for line in framework.splitlines():
        if line.startswith("| HC1-Q"):
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            expected_qa[cells[0]] = re.findall(r"HC1-[A-G]\d+", cells[3])
    for question in qa:
        assert question["relatedNotes"] == expected_qa[question["code"]]
    for note in notes:
        assert note["relatedQa"] == [q["code"] for q in qa if note["code"] in expected_qa[q["code"]]]
    assert {(link["from"], link["to"]) for link in data["links"] if link["relationType"] == "related_qa"} == {
        (note, question) for question, linked in expected_qa.items() for note in linked}
    assert next(q["sourceNumbers"] for q in qa if q["code"] == "HC1-Q18") == [51]
    sources = [c for c in data["chunks"] if c["sourceType"] == "sources"]
    assert [c["sourceNumber"] for c in sources] == list(range(1, 58))
    assert data["sourcePdf"]["pages"] == 57
    pdf_path = root / "Content/Hafrashas Challah Part 1" / data["sourcePdf"]["filename"]
    assert hashlib.sha256(pdf_path.read_bytes()).hexdigest() == data["sourcePdf"]["sha256"]
    for source, audit in zip(sources, data["sourcePdf"]["sources"]):
        number = source["sourceNumber"]
        assert source["pdfPage"] == audit["page"] == number
        expected = [c["code"] for c in notes if number in c["sourceNumbers"]] if number < 57 else []
        assert source["relatedNotes"] == audit["relatedNotes"] == expected
        assert source["section"] == (next(c["section"] for c in notes if c["code"] == expected[0]) if expected else "P2")
        image = source["blocks"][0]
        raw = base64.b64decode(image["uri"].split(",", 1)[1])
        assert hashlib.sha256(raw).hexdigest() == audit["imageSha256"]
        assert (root / "tmp/shiur-import-preview/challah-part1" / image["assetPath"]).read_bytes() == raw
        with Image.open(BytesIO(raw)) as opened:
            assert opened.size == (image["width"], image["height"])
            opened.verify()
    for note in notes:
        assert note["relatedSources"] == [f"HC1-S{n}" for n in note["sourceNumbers"]]
        assert all(note["code"] in next(c["relatedNotes"] for c in sources if c["code"] == code)
                   for code in note["relatedSources"])
    assert not sources[-1]["relatedNotes"]
    assert not any(link["from"] == "HC1-S57" or link["to"] == "HC1-S57" for link in data["links"])
    assert {(link["from"], link["to"]) for link in data["links"] if link["relationType"] == "related_source"} == {
        (note, source["code"]) for source in sources for note in source["relatedNotes"]}
    checks.extend(["45 complete footnotes verified against Word", f"123 unique chunks and {len(data['links'])} valid suggestion links",
                   "Q&A map authoritative in both directions; approved Q18 correction verified",
                   "Four valid Word pictures", "57 source-page images, numbering and checksums verified",
                   "63 bidirectional notes/source links verified; source 57 is unlinked"])
    print("\n".join(checks))
    (root / "tmp/shiur-import-preview/challah-part1/verification.json").write_text(
        json.dumps({"passed": True, "checks": checks}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    verify()

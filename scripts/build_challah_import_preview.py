"""Build a local Word/chunk review fixture. This script has no database access."""
from __future__ import annotations

import argparse
import base64
import copy
import hashlib
import json
import mimetypes
import posixpath
import re
import sys
import zipfile
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as E
from PIL import Image
from challah_source_preview import build_sources

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"}


def tag(name):
    prefix, local = name.split(":")
    return "{" + NS[prefix] + "}" + local


def val(node, path, default=""):
    found = node.find(path, NS) if node is not None else None
    return found.get(tag("w:val"), default) if found is not None else default


def plain(node):
    return "".join(t.text or "" for t in node.iter(tag("w:t")))


def formatting(node):
    result = {}
    if node is None:
        return result
    for name, key in [("b", "bold"), ("i", "italic"), ("u", "underline")]:
        item = node.find("w:" + name, NS)
        if item is not None:
            result[key] = item.get(tag("w:val"), "1") not in ("0", "false", "off", "none")
    color = val(node, "w:color")
    if re.fullmatch(r"[a-fA-F0-9]{6}", color):
        result["color"] = "#" + color
    return result


def paragraph_layout(props):
    result = {}
    if props is None:
        return result
    ind = props.find("w:ind", NS)
    if ind is not None:
        for attr, key in [("left", "indent"), ("right", "rightIndent"), ("firstLine", "firstLine"), ("hanging", "hanging")]:
            if ind.get(tag("w:" + attr)) is not None:
                result[key] = int(ind.get(tag("w:" + attr))) / 20
    tabs = props.find("w:tabs", NS)
    if tabs is not None:
        result["tabStops"] = [{"position": int(t.get(tag("w:pos"))) / 20,
                               "alignment": t.get(tag("w:val"), "left"),
                               "leader": t.get(tag("w:leader"), "none")} for t in tabs]
    return result


class Reader:
    def __init__(self, path, output):
        self.path, self.output = path, output
        self.z = zipfile.ZipFile(path)
        self.rels = {n.get("Id"): n.attrib for n in E.fromstring(self.z.read("word/_rels/document.xml.rels"))}
        self.styles = {n.get(tag("w:styleId")): n for n in E.fromstring(self.z.read("word/styles.xml"))}
        self.assets, self.counts, self.numbers = [], {}, {}
        self.default_tab_width = 36
        if "word/settings.xml" in self.z.namelist():
            self.default_tab_width = int(val(E.fromstring(self.z.read("word/settings.xml")), "w:defaultTabStop", "720")) / 20
        if "word/numbering.xml" in self.z.namelist():
            root = E.fromstring(self.z.read("word/numbering.xml"))
            abstracts = {n.get(tag("w:abstractNumId")): n for n in root.findall("w:abstractNum", NS)}
            for num in root.findall("w:num", NS):
                levels = {int(l.get(tag("w:ilvl"))): {"format": val(l, "w:numFmt"), "marker": val(l, "w:lvlText"),
                          "start": int(val(l, "w:start", "1")), "layout": paragraph_layout(l.find("w:pPr", NS))}
                          for l in abstracts[val(num, "w:abstractNumId")].findall("w:lvl", NS)}
                for override in num.findall("w:lvlOverride", NS):
                    if val(override, "w:startOverride"):
                        levels[int(override.get(tag("w:ilvl")))]["start"] = int(val(override, "w:startOverride"))
                self.numbers[num.get(tag("w:numId"))] = levels
        root = E.fromstring(self.z.read("word/document.xml"))
        body = root.find("w:body", NS)
        self.tables = len(body.findall("w:tbl", NS))
        self.special = {"equations": len(root.findall(".//{http://schemas.openxmlformats.org/officeDocument/2006/math}oMath")),
                        "textboxes": len(root.findall(".//w:txbxContent", NS)),
                        "trackedChanges": len(root.findall(".//w:ins", NS)) + len(root.findall(".//w:del", NS))}
        self.paragraphs = []
        for index, p in enumerate(body, 1):
            if p.tag == tag("w:p") and (plain(p).strip() or p.findall(".//w:drawing", NS)):
                self.paragraphs.append(self.paragraph(p, len(self.paragraphs) + 1, index))
        self.footnotes = {}
        if "word/footnotes.xml" in self.z.namelist():
            for note in E.fromstring(self.z.read("word/footnotes.xml")):
                number = int(note.get(tag("w:id")))
                if number > 0:
                    self.footnotes[number] = [self.paragraph(p, 0, 0) for p in note.findall("w:p", NS)]

    def style_flags(self, style_id, visited=None):
        visited = visited or set()
        if not style_id or style_id in visited or style_id not in self.styles:
            return {}
        visited.add(style_id)
        style = self.styles[style_id]
        return {**self.style_flags(val(style, "w:basedOn"), visited), **formatting(style.find("w:rPr", NS))}

    def style_layout(self, style_id, visited=None):
        visited = visited or set()
        if not style_id or style_id in visited or style_id not in self.styles:
            return {}
        visited.add(style_id)
        style = self.styles[style_id]
        return {**self.style_layout(val(style, "w:basedOn"), visited), **paragraph_layout(style.find("w:pPr", NS))}

    def image(self, drawing, paragraph):
        blip = drawing.find(".//a:blip", NS)
        if blip is None:
            raise ValueError("Non-raster drawing needs manual review")
        path = posixpath.normpath(posixpath.join("word", self.rels[blip.get(tag("r:embed"))]["Target"]))
        raw = self.z.read(path)
        image = Image.open(BytesIO(raw))
        suffix = Path(path).suffix
        crop = drawing.find(".//a:srcRect", NS)
        if crop is not None and any(int(v) for v in crop.attrib.values()):
            w, h = image.size
            image = image.crop((w * int(crop.get("l", "0")) / 100000, h * int(crop.get("t", "0")) / 100000,
                                w * (1 - int(crop.get("r", "0")) / 100000), h * (1 - int(crop.get("b", "0")) / 100000)))
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            raw, suffix = buffer.getvalue(), ".png"
        name = f"notes-p{paragraph}-{len(self.assets) + 1}{suffix}"
        (self.output / "assets").mkdir(parents=True, exist_ok=True)
        (self.output / "assets" / name).write_bytes(raw)
        extent = drawing.find(".//wp:extent", NS)
        block = {"kind": "image", "paragraph": paragraph,
                 "uri": f"data:{mimetypes.guess_type(name)[0]};base64," + base64.b64encode(raw).decode(),
                 "alt": f"Official diagram at paragraph {paragraph}", "width": image.width, "height": image.height,
                 "displayWidth": round(int(extent.get("cx")) / 9525) if extent is not None else image.width,
                 "assetPath": "assets/" + name}
        self.assets.append(block)
        return block

    def paragraph(self, p, number, xml_index):
        props = p.find("w:pPr", NS)
        style = val(props, "w:pStyle")
        spans, refs, images = [], [], []
        parents = {child: parent for parent in p.iter() for child in parent}
        for run in p.iter(tag("w:r")):
            rprops = run.find("w:rPr", NS)
            fmt = {**self.style_flags(style), **self.style_flags(val(rprops, "w:rStyle")), **formatting(rprops)}
            parent = parents.get(run)
            if parent is not None and parent.tag == tag("w:hyperlink"):
                relationship = self.rels.get(parent.get(tag("r:id")), {})
                if relationship.get("TargetMode") == "External":
                    fmt["href"] = relationship["Target"]
            for child in run:
                text, ref = None, None
                if child.tag == tag("w:t"):
                    text = child.text or ""
                elif child.tag == tag("w:tab"):
                    text = "\t"
                elif child.tag in (tag("w:br"), tag("w:cr")) and child.get(tag("w:type")) != "page":
                    text = "\n"
                elif child.tag == tag("w:footnoteReference"):
                    ref = int(child.get(tag("w:id")))
                    refs.append(ref)
                    text = f"[{ref}]"
                elif child.tag == tag("w:drawing"):
                    images.append(self.image(child, number))
                if text is not None:
                    span = {"text": text, **fmt}
                    if ref:
                        span["footnote"] = ref
                    if spans and not ref and {k: v for k, v in spans[-1].items() if k != "text"} == fmt:
                        spans[-1]["text"] += text
                    else:
                        spans.append(span)
        text = "".join(s["text"] for s in spans)
        kind, marker, level = "paragraph", "", 0
        numbering = props.find("w:numPr", NS) if props is not None else None
        layout = self.style_layout(style)
        if numbering is not None:
            num_id, level = val(numbering, "w:numId"), int(val(numbering, "w:ilvl", "0"))
            config = self.numbers[num_id][level]
            layout.update(config["layout"])
            key = (num_id, level)
            self.counts[key] = self.counts.get(key, config["start"] - 1) + 1
            for deeper in [k for k in self.counts if k[0] == num_id and k[1] > level]:
                del self.counts[deeper]
            count = self.counts[key]
            kind = "heading" if style == "IntenseQuote" else "list"
            marker = ("o" if level else "\u2022") if config["format"] == "bullet" else re.sub(r"%\d", chr(64 + count) if config["format"] == "upperLetter" else str(count), config["marker"])
        ind = props.find("w:ind", NS) if props is not None else None
        rtl = props.find("w:bidi", NS) if props is not None else None
        alignment = val(props, "w:jc", "left")
        layout.update(paragraph_layout(props))
        return {"kind": kind, "paragraph": number, "xmlIndex": xml_index, "text": text, "spans": spans,
                "marker": marker, "level": level, "indent": round(int(ind.get(tag("w:left"), "0")) / 20) if ind is not None else 0,
                "firstLine": round(int(ind.get(tag("w:firstLine"), "0")) / 20) if ind is not None else 0,
                "leadingTabs": len(text) - len(text.lstrip("\t")),
                "alignment": alignment if alignment in ("left", "right", "center") else "left",
                "rtl": rtl is not None and rtl.get(tag("w:val"), "1") not in ("0", "false"),
                "footnoteIds": refs, "images": images, "defaultTabWidth": self.default_tab_width, **layout}


def framework(path):
    notes, qa = [], []
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if not line.startswith("| HC1-"):
            continue
        c = [x.strip() for x in line.strip().strip("|").split("|")]
        if re.fullmatch(r"HC1-Q\d+", c[0]):
            qa.append({"code": c[0], "questionNumber": int(c[1]), "title": c[2], "frameworkNotes": re.findall(r"HC1-[A-G]\d+", c[3]), "difficulty": c[4].lower(), "summary": c[5]})
        else:
            numbers = re.findall(r"\d+", c[3])
            notes.append({"code": c[0], "section": c[1], "title": c[2], "paragraphStart": int(numbers[0]), "paragraphEnd": int(numbers[-1]),
                          "difficulty": c[4].lower(), "estimatedMinutes": int(c[5]), "officialShiur": int(c[6]),
                          "relatedQa": ["HC1-" + q for q in re.findall(r"Q\d+", c[7])], "summary": c[8]})
    return notes, qa


def inline_markdown(spans):
    parts = []
    for s in spans:
        before, text, after = re.fullmatch(r"(\s*)(.*?)(\s*)", s["text"], re.S).groups()
        if text:
            for key, marker in [("underline", "u"), ("italic", "*"), ("bold", "**")]:
                if s.get(key):
                    text = "<u>" + text + "</u>" if marker == "u" else marker + text + marker
            if s.get("href"):
                text = "[" + text + "](" + s["href"] + ")"
        parts.append(before + text + after)
    return "".join(parts)


def markdown(blocks, footnotes):
    parts = []
    for b in blocks:
        if b["kind"] == "image":
            parts.append(f'![{b["alt"]}]({b["uri"]})')
            continue
        text = inline_markdown(b["spans"])
        if b["kind"] == "heading":
            text = "### " + b["marker"] + " " + text.strip()
        elif b["kind"] in ("list", "question"):
            marker = "-" if b["marker"] in ("\u2022", "o") else b["marker"]
            text = "  " * b["level"] + marker + " " + text.strip()
        parts.append(text)
    if footnotes:
        parts.append("Source Notes")
        parts.extend(f'[{n["id"]}]: ' + "\n".join(inline_markdown(p["spans"]) for p in n["blocks"]) for n in footnotes)
    return "\n\n".join(parts)


def chunk(meta, paras, reader):
    blocks = []
    for p in paras:
        if p["text"].strip():
            blocks.append({k: v for k, v in p.items() if k != "images"})
        blocks.extend(p["images"])
    ids = sorted({n for p in paras for n in p["footnoteIds"]})
    notes = [{"id": n, "blocks": [{k: v for k, v in p.items() if k != "images"} for p in reader.footnotes[n]]} for n in ids]
    if meta["code"] == "HC1-F3":
        index = next(i for i, b in enumerate(blocks) if b["paragraph"] == 136)
        blocks = [b for b in blocks if b["paragraph"] not in (136, 137)]
        raw = (reader.path.parent / "calculation mnemonic.png").read_bytes()
        image = Image.open(BytesIO(raw))
        (reader.output / "assets" / "calculation-mnemonic.png").write_bytes(raw)
        blocks.insert(index, {"kind": "image", "paragraph": 136, "uri": "data:image/png;base64," + base64.b64encode(raw).decode(),
                             "alt": "Hebrew measurement mnemonic from paragraphs 136-137", "width": image.width, "height": image.height,
                             "displayWidth": image.width, "assetPath": "assets/calculation-mnemonic.png"})
    sources = sorted({int(n) for p in paras if p["paragraph"] not in (136, 137)
                      for n in re.findall(r"\((\d{1,2})\)", "".join(s["text"] for s in p["spans"] if not s.get("footnote"))) if 1 <= int(n) <= 56})
    return {**meta, "sourceFile": reader.path.name, "blocks": blocks, "footnotes": notes,
            "sourceNumbers": sources, "contentMarkdown": markdown(blocks, notes)}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("Content/Hafrashas Challah Part 1"))
    parser.add_argument("--out", type=Path, default=Path("tmp/shiur-import-preview/challah-part1"))
    parser.add_argument("--fixture", type=Path, default=Path("src/data/challahImportPreview.json"))
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    readers = [Reader(args.source / n, args.out) for n in ["Notes for Hafrashas Challah (part 1).docx", "Q&A's for Hafrashas Challah (part 1).docx", "Pace for Winter Zman - Challah Tu_m.docx"]]
    nr, qr, pr = readers
    notes_map, qa_map = framework(args.source / "shiur_builder_challah_part1_framework.md")
    differences = []
    for q in qa_map:
        original = [n["code"] for n in notes_map if q["code"] in n["relatedQa"]]
        if set(original) != set(q["frameworkNotes"]):
            differences.append({"code": q["code"], "notesMap": original, "qaMap": q["frameworkNotes"],
                                "resolvedUsing": "qaMap"})
    known_notes = {n["code"] for n in notes_map}
    assert all(set(q["frameworkNotes"]) <= known_notes for q in qa_map), "Unknown Q&A notes link"
    for n in notes_map:
        n["relatedQa"] = [q["code"] for q in qa_map if n["code"] in q["frameworkNotes"]]
    assert len(nr.paragraphs) == 199 and len(notes_map) == 45 and len(qa_map) == 21, "Source changed: recheck chunk boundaries"
    assert sorted(nr.footnotes) == list(range(1, 46)), "Expected all 45 footnotes"
    assert not any(r.tables or any(r.special.values()) for r in readers), "Unsupported Word elements need review"
    corrections = ["HC1-C9 extended from paragraphs 62-69 to 62-70: paragraph 70 continues RSZA's matzah solution.",
                   "The Q&A map is authoritative for all suggestion links; eight discrepancies are resolved using that map.",
                   "HC1-Q18 source reference corrected from (48) to (51), as approved. Original Word files are unchanged."]
    chunks, owners, sections = [], {}, {}
    for m in notes_map:
        if m["code"] == "HC1-C9":
            m["paragraphEnd"] = 70
        paras = nr.paragraphs[m["paragraphStart"] - 1:m["paragraphEnd"]]
        sections.setdefault(m["section"], paras[0]["text"].strip())
        for p in paras:
            assert p["paragraph"] not in owners, "Overlapping chunk ranges"
            owners[p["paragraph"]] = m["code"]
        chunks.append(chunk({**m, "sourceType": "notes", "sectionTitle": sections[m["section"]]}, paras, nr))
    assert set(owners) == set(range(2, 200)), "Unassigned notes paragraphs"
    starts = [i for i, p in enumerate(qr.paragraphs) if p["kind"] == "list"]
    assert len(starts) == 21, "Expected 21 Q&A questions"
    for i, m in enumerate(qa_map):
        end = starts[i + 1] if i + 1 < len(starts) else len(qr.paragraphs)
        paras = copy.deepcopy(qr.paragraphs[starts[i]:end])
        if m["code"] == "HC1-Q18":
            assert sum(p["text"].count("(48)") for p in paras) == 1
            assert sum(s["text"].count("(48)") for p in paras for s in p["spans"]) == 1
            for p in paras:
                p["text"] = p["text"].replace("(48)", "(51)")
                for span in p["spans"]:
                    span["text"] = span["text"].replace("(48)", "(51)")
        paras[0]["kind"], paras[0]["marker"] = "question", f'{m["questionNumber"]}.'
        for p in paras[1:]:
            p["kind"] = "answer"
        related = [n["code"] for n in notes_map if m["code"] in n["relatedQa"]]
        chunks.append(chunk({**m, "relatedNotes": related, "sourceType": "qa", "section": "QA", "sectionTitle": "Questions & Answers",
                             "paragraphStart": starts[i] + 1, "paragraphEnd": end}, paras, qr))
    links = [{"from": n["code"], "to": q, "relationType": "related_qa"} for n in notes_map for q in n["relatedQa"]]
    assert sorted({n["id"] for c in chunks for n in c["footnotes"]}) == list(range(1, 46)), "Footnote lost during chunking"
    assert sorted({s for c in chunks if c["sourceType"] == "notes" for s in c["sourceNumbers"]}) == list(range(1, 57)), "Check source references 1-56"
    assert sum(b["kind"] == "image" for c in chunks for b in c["blocks"]) == 4, "Expected 3 embedded pictures and mnemonic"
    source_chunks, source_audit = build_sources(
        args.source / "Marei_Mekomos_Hafrashas_Challah_Sources_1-57_Split.pdf",
        args.out, [c for c in chunks if c["sourceType"] == "notes"])
    for c in chunks:
        if c["sourceType"] == "notes":
            c["relatedSources"] = [f"HC1-S{n}" for n in c["sourceNumbers"]]
    source_links = [{"from": note, "to": c["code"], "relationType": "related_source"}
                    for c in source_chunks for note in c["relatedNotes"]]
    chunks.extend(source_chunks)
    links.extend(source_links)
    for i, c in enumerate(chunks, 1):
        c["sortOrder"] = i
    stats = {"notesChunks": 45, "qaChunks": 21, "footnotes": 45, "sourceReferences": 56,
             "embeddedImages": len(nr.assets), "mnemonicImages": 1, "tables": nr.tables,
             "sourceChunks": 57, "sourceLinks": len(source_links), "links": len(links)}
    warnings = ["Source pages are preserved as full-page images; the PDF text layer contains text outside the visible source.",
                "Sources are grouped by their first linked notes section; all cross-section links are retained.",
                "Source 57 belongs to Part 2 and is intentionally unlinked.",
                "The pace includes Sections H-I for Shiur 5, but this workbook ends at Section G.",
                "Rich formatting is preserved in the preview and shared published/print renderer. Apply the rich-content migration and upload the shared images before importing."]
    data = {"title": "Winter 5787 - Hafrashas Challah Part 1", "stats": stats, "chunks": chunks, "links": links,
            "pace": pr.paragraphs, "corrections": corrections, "warnings": warnings, "linkDifferences": differences,
            "notesDocumentTitle": nr.paragraphs[0], "qaDocumentTitle": qr.paragraphs[0],
            "sourcePdf": source_audit}
    encoded = json.dumps(data, ensure_ascii=False, indent=2)
    template = Path(__file__).with_name("challah_preview_template.html").read_text(encoding="utf-8")
    safe_json = encoded.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    (args.out / "index.html").write_text(template.replace("__PREVIEW_DATA__", safe_json), encoding="utf-8")
    (args.out / "challah-part1-preview.json").write_text(encoded, encoding="utf-8")
    args.fixture.parent.mkdir(parents=True, exist_ok=True)
    args.fixture.write_text(encoded, encoding="utf-8")
    ledger = {"sources": {r.path.name: {"sha256": hashlib.sha256(r.path.read_bytes()).hexdigest(), "paragraphs": r.paragraphs,
                                        "specialElements": r.special} for r in readers}, "paragraphAssignments": owners,
              "footnoteAssignments": {str(n): [c["code"] for c in chunks if n in [f["id"] for f in c["footnotes"]]] for n in range(1, 46)},
              "sourcePdf": source_audit, "stats": stats}
    (args.out / "extraction-audit.json").write_text(json.dumps(ledger, ensure_ascii=False, indent=2), encoding="utf-8")
    for kind, filename in [("notes", "notes_challah_part1.md"), ("qa", "qa_challah_part1.md"),
                           ("sources", "sources_challah_part1.md")]:
        text = "\n\n".join(f'## {c["code"]} - {c["title"]}\n\n{c["contentMarkdown"]}' for c in chunks if c["sourceType"] == kind)
        (args.out / filename).write_text(text, encoding="utf-8")
    (args.out / "pace_winter_5787.md").write_text(markdown(pr.paragraphs, []), encoding="utf-8")
    report = ["# Challah Part 1 extraction review", "", "Local preview only. No Supabase writes or SQL run.", "", "## Verified", "",
              *[f"- {k}: {v}" for k, v in stats.items()], "", "## Corrections and issues", "", *["- " + x for x in corrections + warnings],
              "- Original document titles are kept separately; paragraphs 2-199 are assigned exactly once.",
              "- All footnote numbers retain their original 1-45 numbering and their owning chunk.",
              "- Floating pictures are placed after their Word anchor paragraph within the correct chunk.",
              "- Mnemonic paragraphs 136-137 remain verbatim in the audit; their displayed version uses the supplied image.",
              "- Parenthesized numbers in the mnemonic are not source-sheet references.",
              "- Demographic assertions and halachic statements are preserved as source content, not independently verified.",
              "- The framework's proposed schema differs from the existing app. Future import should map to the existing fields, use related_note (singular), and map Q&A difficulty levels to supported values.",
              "- Word pagination could not be rendered on this machine because LibreOffice is unavailable. App preview layout was checked separately.",
              "", "## Resolved notes-map discrepancies", "", "Suggestions follow the Q&A map, as approved. The original differences are recorded below:", ""]
    for d in differences:
        report.extend([f'### {d["code"]}', f'Notes map: {", ".join(d["notesMap"])}', f'Q&A map: {", ".join(d["qaMap"])}', ""])
    report.extend(["## Chunk boundaries", "", "| Code | Paragraphs | Title | Footnotes | Source numbers |", "| --- | --- | --- | --- | --- |"])
    report.extend(f'| {c["code"]} | {c["paragraphStart"]}-{c["paragraphEnd"]} | {c["title"]} | {", ".join(str(n["id"]) for n in c["footnotes"])} | {", ".join(map(str, c["sourceNumbers"]))} |' for c in chunks)
    (args.out / "REVIEW.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print(json.dumps(stats, indent=2))
    print(f"Preview: {args.fixture}\nReview folder: {args.out}")


if __name__ == "__main__":
    main()

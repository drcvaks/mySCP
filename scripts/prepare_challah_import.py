"""Create a Winter-only import and content-addressed assets. No network/database access."""
import argparse
import base64
import copy
import hashlib
import json
import re
from pathlib import Path

WORKBOOK = "Hafrashas Challah Part 1"
PROGRAM = "winter-5787"
BUCKET = "official-learning-materials"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", type=Path, default=Path("src/data/challahImportPreview.json"))
    parser.add_argument("--out", type=Path, default=Path("tmp/shiur-import-preview/challah-part1/import"))
    parser.add_argument("--sql", type=Path, default=Path("supabase/imports/202610070002_challah_part1.sql"))
    args = parser.parse_args()
    source = json.loads(args.fixture.read_text(encoding="utf-8"))
    assert source["stats"]["notesChunks"] == 45 and source["stats"]["qaChunks"] == 21
    assert source["stats"]["footnotes"] == 45 and source["stats"]["sourceChunks"] == 57
    assert all(re.fullmatch(r"HC1-(?:[A-G]\d+|Q\d+|S\d+)", c["code"]) for c in source["chunks"])
    args.out.joinpath("assets").mkdir(parents=True, exist_ok=True)
    originals = {c["code"]: c for c in source["chunks"]}
    assets, rows = {}, []

    def document_blocks(blocks):
        result = copy.deepcopy(blocks)
        for block in result:
            block.pop("assetPath", None)
            if block["kind"] != "image":
                continue
            match = re.fullmatch(r"data:image/(png|jpeg|webp);base64,(.*)", block["uri"], re.S)
            assert match, "Unsupported official image format"
            raw = base64.b64decode(match[2], validate=True)
            digest = hashlib.sha256(raw).hexdigest()
            extension = "jpg" if match[1] == "jpeg" else match[1]
            name = digest + "." + extension
            path = "sha256/" + name
            args.out.joinpath("assets", name).write_bytes(raw)
            assets[path] = {"storagePath": path, "file": "assets/" + name,
                            "sha256": digest, "contentType": "image/" + match[1], "bytes": len(raw)}
            block.pop("uri")
            block["storagePath"] = path
        return result

    for c in source["chunks"]:
        section, title = c["section"], c["sectionTitle"]
        if c["sourceType"] == "qa":
            note = originals[c["relatedNotes"][0]] if c["relatedNotes"] else None
            section, title = (note["section"], note["sectionTitle"]) if note else ("QA", "Questions & Answers")
        title = re.sub(r"^[A-G]\.\s*", "", title)
        doc = {"version": 1, "blocks": document_blocks(c["blocks"]),
               "footnotes": [{"id": n["id"], "blocks": document_blocks(n["blocks"])} for n in c["footnotes"]]}
        difficulty = {"easy": "core", "medium": "core", "intermediate": "core", "core": "core",
                      "hard": "advanced", "advanced": "advanced", "practical": "practical"}[c.get("difficulty", "core")]
        # The rich document is authoritative. Markdown remains a portable, non-embedded fallback.
        markdown = c["contentMarkdown"]
        for original, rewritten in zip(c["blocks"], doc["blocks"]):
            if original["kind"] == "image":
                markdown = markdown.replace(original["uri"], "storage://" + BUCKET + "/" + rewritten["storagePath"])
                if original.get("assetPath"):
                    markdown = markdown.replace("(" + original["assetPath"] + ")", "(storage://" + BUCKET + "/" + rewritten["storagePath"] + ")")
        rows.append({
            "program_id": PROGRAM, "chunk_code": c["code"],
            "source_type": "source" if c["sourceType"] == "sources" else c["sourceType"],
            "siman": WORKBOOK, "workbook_title": WORKBOOK, "section_key": section, "section_title": title,
            "chunk_title": c["title"], "chunk_summary": c["summary"], "content_markdown": markdown,
            "content_document": doc, "sort_order": c["sortOrder"], "official_shiur_number": c.get("officialShiur"),
            "estimated_minutes": c.get("estimatedMinutes"), "difficulty": difficulty,
            "tags": ["challah-part-1", "original-difficulty:" + c.get("difficulty", "core")] +
                    ["source:" + str(n) for n in c["sourceNumbers"]] + (["part-2-unlinked"] if c["code"] == "HC1-S57" else []),
            "source_file_name": c["sourceFile"], "source_start_page": c.get("pdfPage"),
            "source_end_page": c.get("pdfPage"), "is_selectable": True
        })
    links = []
    for link in source["links"]:
        links.extend([{"parent": link["from"], "related": link["to"], "relation_type": link["relationType"]},
                      {"parent": link["to"], "related": link["from"], "relation_type": "related_note"}])
    assert not any("HC1-S57" in (l["parent"], l["related"]) for l in links)
    payload = {"program": PROGRAM, "workbook": WORKBOOK, "bucket": BUCKET,
               "chunks": rows, "links": links, "assets": list(assets.values())}
    encoded = json.dumps(payload, ensure_ascii=False, indent=2)
    assert "data:image" not in encoded, "An embedded image was not externalized"
    assert len(rows) == 123 and len(links) == 228
    assert "$hc1_payload$" not in encoded
    args.out.joinpath("payload.json").write_text(encoded, encoding="utf-8")
    manifest = {"program": PROGRAM, "bucket": BUCKET, "assets": list(assets.values()),
                "bytes": sum(a["bytes"] for a in assets.values()), "chunks": len(rows), "links": len(links)}
    args.out.joinpath("manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    template = Path(__file__).with_name("challah_import_template.sql").read_text(encoding="utf-8")
    args.sql.parent.mkdir(parents=True, exist_ok=True)
    sql_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    args.sql.write_text(template.replace("__PAYLOAD__", sql_json), encoding="utf-8")
    print(json.dumps({k: v for k, v in manifest.items() if k != "assets"}, indent=2))
    print("Assets:", len(assets), "SQL:", args.sql, "Package:", args.out)


if __name__ == "__main__":
    main()

"""Render the visible split PDF pages; ignore its stale underlying text layer."""
import base64
import hashlib
import re
from io import BytesIO
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw


def build_sources(path, output, notes):
    pdf = pdfium.PdfDocument(str(path))
    assert len(pdf) == 57, "Expected one page per source, 1-57"
    assets = output / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    chunks, ledger, thumbnails = [], [], []
    try:
        for index in range(len(pdf)):
            number = index + 1
            related = [c for c in notes if number in c["sourceNumbers"]] if number <= 56 else []
            assert related or number == 57, f"Source {number} has no notes link"
            primary = related[0] if related else None
            page = pdf[index]
            bitmap = page.render(scale=2)
            image = bitmap.to_pil().convert("RGB")
            bitmap.close()
            page.close()
            # Keep the entire visible page, including its source number and all margins.
            buffer = BytesIO()
            image.save(buffer, format="JPEG", quality=92, optimize=True)
            raw = buffer.getvalue()
            asset = f"assets/source-{number:02}.jpg"
            (output / asset).write_bytes(raw)
            title = f"Source {number}"
            summary = ("Related notes: " + "; ".join(c["code"] + " - " + c["title"] for c in related)
                       if related else "Part 2 source. Intentionally unlinked from Part 1 notes.")
            block = {"kind": "image", "paragraph": number,
                     "uri": "data:image/jpeg;base64," + base64.b64encode(raw).decode(),
                     "alt": f"Official Hafrashas Challah source {number}, PDF page {number}",
                     "width": image.width, "height": image.height, "displayWidth": 816,
                     "assetPath": asset}
            chunks.append({"code": f"HC1-S{number}", "title": title, "summary": summary,
                           "sourceType": "sources", "sourceNumber": number, "pdfPage": number,
                           "section": primary["section"] if primary else "P2",
                           "sectionTitle": re.sub(r"^[A-G]\.\s*", "", primary["sectionTitle"]) if primary else "Part 2 - Unlinked",
                           "officialShiur": primary.get("officialShiur") if primary else None,
                           "paragraphStart": number, "paragraphEnd": number,
                           "sourceFile": path.name, "sourceNumbers": [number],
                           "relatedNotes": [c["code"] for c in related], "blocks": [block],
                           "footnotes": [], "contentMarkdown": f"![{block['alt']}]({asset})"})
            ledger.append({"source": number, "page": number, "code": f"HC1-S{number}",
                           "asset": asset, "imageSha256": hashlib.sha256(raw).hexdigest(),
                           "section": primary["section"] if primary else "P2",
                           "relatedNotes": [c["code"] for c in related]})
            thumb = image.copy()
            thumb.thumbnail((153, 198))
            thumbnails.append(thumb)
    finally:
        pdf.close()
    contact = Image.new("RGB", (6 * 175, 10 * 225), "white")
    draw = ImageDraw.Draw(contact)
    for index, thumb in enumerate(thumbnails):
        x, y = (index % 6) * 175, (index // 6) * 225
        contact.paste(thumb, (x, y + 20))
        draw.text((x + 4, y + 2), f"Source {index + 1}", fill="black")
    contact.save(assets / "sources-contact-sheet.jpg", quality=90)
    return chunks, {"filename": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                    "pages": len(ledger), "renderScale": 2, "sources": ledger}

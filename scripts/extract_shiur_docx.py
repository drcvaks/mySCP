#!/usr/bin/env python3
"""
Extract official Shiur Builder content from a DOCX into reviewable Markdown.

This script keeps the import step honest:
- footnote references are inserted inline as [1], [2], ...
- footnote text is emitted under a "Source Notes" section
- Word tables are converted to markdown-style tables
- list paragraphs are emitted as markdown bullets

It intentionally does not write to Supabase. Review the Markdown first, then use
that reviewed text to prepare a content_chunks SQL update/import.
"""

from __future__ import annotations

import argparse
import json
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}


@dataclass
class Block:
    kind: str
    text: str = ""
    style: str = ""
    level: int = 0
    rows: list[list[str]] | None = None
    footnotes: list[str] | None = None


def qn(name: str) -> str:
    return f"{{{W_NS}}}{name}"


def attr(element: ET.Element, name: str) -> str | None:
    return element.attrib.get(qn(name))


def text_from_runs(paragraph: ET.Element) -> tuple[str, list[str]]:
    parts: list[str] = []
    refs: list[str] = []
    for node in paragraph.iter():
      if node.tag == qn("t") and node.text:
          parts.append(node.text)
      elif node.tag == qn("tab"):
          parts.append("\t")
      elif node.tag == qn("br"):
          parts.append("\n")
      elif node.tag == qn("footnoteReference"):
          note_id = attr(node, "id")
          if note_id:
              refs.append(note_id)
              parts.append(f"[{note_id}]")
    return clean_text("".join(parts)), refs


def paragraph_style(paragraph: ET.Element) -> str:
    style = paragraph.find("./w:pPr/w:pStyle", NS)
    return attr(style, "val") if style is not None else ""


def paragraph_list_level(paragraph: ET.Element) -> int:
    ilvl = paragraph.find("./w:pPr/w:numPr/w:ilvl", NS)
    if ilvl is not None:
        value = attr(ilvl, "val")
        if value and value.isdigit():
            return int(value)
    ind = paragraph.find("./w:pPr/w:ind", NS)
    if ind is not None:
        left = attr(ind, "left") or attr(ind, "start")
        if left and left.isdigit():
            return max(0, int(left) // 720 - 1)
    return 0


def is_list_paragraph(paragraph: ET.Element) -> bool:
    return paragraph.find("./w:pPr/w:numPr", NS) is not None or paragraph_style(paragraph) == "ListParagraph"


def load_footnotes(package: zipfile.ZipFile) -> dict[str, str]:
    if "word/footnotes.xml" not in package.namelist():
        return {}
    root = ET.fromstring(package.read("word/footnotes.xml"))
    notes: dict[str, str] = {}
    for footnote in root.findall("w:footnote", NS):
        note_id = attr(footnote, "id")
        if not note_id:
            continue
        try:
            if int(note_id) < 1:
                continue
        except ValueError:
            continue
        text = clean_text("".join(node.text or "" for node in footnote.findall(".//w:t", NS)))
        if text:
            notes[note_id] = text
    return notes


def table_rows(table: ET.Element) -> list[list[str]]:
    rows: list[list[str]] = []
    for row in table.findall("w:tr", NS):
        cells: list[str] = []
        for cell in row.findall("w:tc", NS):
            paragraphs = []
            for paragraph in cell.findall("w:p", NS):
                text, _refs = text_from_runs(paragraph)
                if text:
                    paragraphs.append(text)
            cells.append(" ".join(paragraphs).strip())
        if any(cells):
            rows.append(cells)
    return normalize_table_rows(rows)


def normalize_table_rows(rows: list[list[str]]) -> list[list[str]]:
    if not rows:
        return rows
    if len(rows) >= 3 and len(rows[0]) == 2 and len(rows[1]) > 2:
        grouped_headers = flatten_two_group_header(rows[0], rows[1])
        if grouped_headers:
            return normalize_table_rows([grouped_headers, *rows[2:]])
    width = max(len(row) for row in rows)
    return [row + [""] * (width - len(row)) for row in rows]


def flatten_two_group_header(group_row: list[str], header_row: list[str]) -> list[str] | None:
    data_headers = header_row[1:]
    if len(data_headers) < 2 or len(data_headers) % 2 != 0:
        return None
    split = len(data_headers) // 2
    first_group, second_group = group_row
    return [header_row[0], *[f"{first_group}: {header}" for header in data_headers[:split]], *[f"{second_group}: {header}" for header in data_headers[split:]]]


def iter_body_blocks(document_root: ET.Element, footnotes: dict[str, str]) -> Iterable[Block]:
    body = document_root.find("w:body", NS)
    if body is None:
        return
    for child in body:
        if child.tag == qn("p"):
            text, refs = text_from_runs(child)
            if not text:
                continue
            yield Block(
                kind="list" if is_list_paragraph(child) else "paragraph",
                text=text,
                style=paragraph_style(child),
                level=paragraph_list_level(child),
                footnotes=[footnotes[ref] for ref in refs if ref in footnotes],
            )
        elif child.tag == qn("tbl"):
            rows = table_rows(child)
            if rows:
                yield Block(kind="table", rows=rows)


def clean_text(value: str) -> str:
    return re.sub(r"[ \t]+", " ", value.replace("\u00a0", " ")).strip()


def markdown_table(rows: list[list[str]]) -> str:
    if not rows:
        return ""
    escaped_rows = [[cell.replace("|", "\\|") for cell in row] for row in rows]
    header = escaped_rows[0]
    separator = ["---"] * len(header)
    body = escaped_rows[1:]
    lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(separator) + " |",
    ]
    lines.extend("| " + " | ".join(row) + " |" for row in body)
    return "\n".join(lines)


def block_to_markdown(block: Block, footnote_offset: int) -> tuple[str, list[str]]:
    if block.kind == "table":
        return markdown_table(block.rows or []), []

    text = block.text
    notes = block.footnotes or []
    source_notes = []
    for index, note in enumerate(notes, start=footnote_offset + 1):
        source_notes.append(f"[^{index}]: {note}")
    for original_id, new_id in zip(re.findall(r"\[(\d+)\]", text), range(footnote_offset + 1, footnote_offset + 1 + len(notes))):
        text = text.replace(f"[{original_id}]", f"[{new_id}]", 1)

    if block.style == "IntenseQuote":
        return f"## {text}", source_notes
    if block.kind == "list":
        prefix = "  " * block.level + "-"
        return f"{prefix} {text}", source_notes
    return text, source_notes


def extract_docx(input_path: Path) -> tuple[list[Block], dict[str, str]]:
    with zipfile.ZipFile(input_path) as package:
        footnotes = load_footnotes(package)
        document_root = ET.fromstring(package.read("word/document.xml"))
        return list(iter_body_blocks(document_root, footnotes)), footnotes


def write_markdown(input_path: Path, output_path: Path, title: str | None = None) -> None:
    blocks, footnotes = extract_docx(input_path)
    lines = [f"# {title or input_path.stem}", ""]
    source_notes: list[str] = []
    footnote_count = 0
    for block in blocks:
        markdown, notes = block_to_markdown(block, footnote_count)
        if markdown:
            lines.extend([markdown, ""])
        if notes:
            source_notes.extend(notes)
            footnote_count += len(notes)

    if source_notes:
        lines.extend(["## Source Notes", ""])
        lines.extend(note + "\n" for note in source_notes)

    lines.extend(
        [
            "",
            "<!-- extraction-summary",
            json.dumps(
                {
                    "source": str(input_path),
                    "blocks": len(blocks),
                    "footnotes": len(footnotes),
                    "tables": sum(1 for block in blocks if block.kind == "table"),
                },
                ensure_ascii=False,
            ),
            "-->",
            "",
        ]
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract Shiur Builder DOCX content to reviewable Markdown.")
    parser.add_argument("input", type=Path, help="Path to the DOCX file.")
    parser.add_argument("--out", type=Path, default=None, help="Output Markdown path.")
    parser.add_argument("--title", default=None, help="Markdown title.")
    args = parser.parse_args()

    output_path = args.out or Path("Content/extracted") / f"{args.input.stem}.md"
    write_markdown(args.input, output_path, args.title)
    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

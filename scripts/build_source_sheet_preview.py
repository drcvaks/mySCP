from __future__ import annotations

import argparse
import base64
import html
import json
import subprocess
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


@dataclass(frozen=True)
class SourceCrop:
    number: int
    title: str
    page: int
    crop_box: tuple[int, int, int, int]
    related_notes: tuple[str, ...]


SOURCE_CROPS = [
    SourceCrop(1, "Gemara Chullin", 1, (145, 275, 1130, 492), ("95-B3",)),
    SourceCrop(2, "Tosfos Zevachim", 1, (145, 500, 1130, 710), ("95-B4",)),
    SourceCrop(3, "Beis Yosef and Darchei Moshe", 1, (145, 705, 1130, 1212), ("95-B6",)),
    SourceCrop(4, "Bedek Habayis", 1, (145, 1220, 1130, 1450), ("95-B8",)),
    SourceCrop(5, "Halichos Olam", 2, (145, 210, 1130, 405), ("95-B8",)),
    SourceCrop(6, "Badei Hashulchan", 2, (145, 405, 1130, 755), ("95-B8",)),
    SourceCrop(7, "Chochmas Adam", 2, (145, 750, 1130, 925), ("95-B8",)),
]


def run_poppler(pdftoppm: Path, pdf_path: Path, output_prefix: Path) -> None:
    output_prefix.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            str(pdftoppm),
            "-png",
            "-f",
            "1",
            "-l",
            "2",
            "-r",
            "150",
            str(pdf_path),
            str(output_prefix),
        ],
        check=True,
    )


def crop_sources(render_dir: Path, output_dir: Path) -> list[tuple[SourceCrop, Path]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[tuple[SourceCrop, Path]] = []
    for source in SOURCE_CROPS:
        page_image = render_dir / f"marei_page-{source.page:02d}.png"
        with Image.open(page_image) as image:
            crop = image.crop(source.crop_box)
            output_path = output_dir / f"source_{source.number:02d}.png"
            crop.save(output_path)
            outputs.append((source, output_path))
    return outputs


def write_markdown(outputs: list[tuple[SourceCrop, Path]], output_dir: Path) -> Path:
    markdown_path = output_dir / "source_sheets_siman_95_sources_1_7.md"
    lines = [
        "# Source Sheets Preview - Siman 95 Sources 1-7",
        "",
        "Local preview only. This does not write to Supabase.",
        "",
    ]
    for source, image_path in outputs:
        related = ", ".join(source.related_notes)
        lines.extend(
            [
                f"## Source {source.number}: {source.title}",
                "",
                f"- PDF page: {source.page}",
                f"- Related Review Notes: {related}",
                f"- Image: {image_path.name}",
                "",
            ]
        )
    markdown_path.write_text("\n".join(lines), encoding="utf-8")
    return markdown_path


def image_to_data_uri(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def write_html(outputs: list[tuple[SourceCrop, Path]], output_dir: Path) -> Path:
    html_path = output_dir / "source_sheets_siman_95_sources_1_7.html"
    cards = []
    for source, image_path in outputs:
        related = ", ".join(source.related_notes)
        cards.append(
            f"""
            <section class="card">
              <div class="meta">Source {source.number} · PDF page {source.page}</div>
              <h2>{html.escape(source.title)}</h2>
              <div class="links">Related Review Notes: <strong>{html.escape(related)}</strong></div>
              <img alt="Source {source.number}" src="{image_to_data_uri(image_path)}" />
            </section>
            """
        )
    html_path.write_text(
        f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Source Sheets Preview - Siman 95 Sources 1-7</title>
  <style>
    body {{
      background: #eef2f7;
      color: #172033;
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 32px;
    }}
    main {{
      margin: 0 auto;
      max-width: 980px;
    }}
    h1 {{
      font-size: 28px;
      margin: 0 0 6px;
    }}
    .intro {{
      color: #5f6c80;
      margin-bottom: 22px;
    }}
    .card {{
      background: #fff;
      border: 1px solid #d8dee8;
      border-radius: 8px;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
      margin-bottom: 22px;
      padding: 18px;
    }}
    .meta {{
      color: #b7791f;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }}
    h2 {{
      font-size: 20px;
      margin: 5px 0 8px;
    }}
    .links {{
      background: #ecfdf3;
      border: 1px solid #b7e4c7;
      border-radius: 6px;
      color: #22543d;
      display: inline-block;
      margin-bottom: 14px;
      padding: 7px 10px;
    }}
    img {{
      border: 1px solid #e0e6ef;
      display: block;
      height: auto;
      max-width: 100%;
      width: 100%;
    }}
  </style>
</head>
<body>
  <main>
    <h1>Source Sheets Preview - Siman 95 Sources 1-7</h1>
    <p class="intro">Local preview only. This does not read from or write to Supabase.</p>
    {''.join(cards)}
  </main>
</body>
</html>
""",
        encoding="utf-8",
    )
    return html_path


def write_ts_fixture(outputs: list[tuple[SourceCrop, Path]], output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = [
        {
            "number": source.number,
            "title": source.title,
            "page": source.page,
            "relatedNotes": list(source.related_notes),
            "imageDataUri": image_to_data_uri(image_path),
        }
        for source, image_path in outputs
    ]
    output_path.write_text(
        "export const sourceSheetPreviewTitle = \"Marei Mekomos for Siman 95 - Sources 1-7\";\n\n"
        f"export const sourceSheetPreviewSources = {json.dumps(payload, ensure_ascii=False, indent=2)} as const;\n",
        encoding="utf-8",
    )
    return output_path


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def write_sql_import(outputs: list[tuple[SourceCrop, Path]], output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    values: list[str] = []
    for source, image_path in outputs:
        chunk_code = f"95-S{source.number}"
        related = ", ".join(source.related_notes)
        content_markdown = (
            f"![Source {source.number}: {source.title}]({image_to_data_uri(image_path)})\n\n"
            f"Related Review Notes: {related}"
        )
        values.append(
            "("
            f"{sql_literal(chunk_code)}, "
            "'source'::public.content_source_type, "
            "'Siman 95 Part 1', "
            "'Marei Mekomos for Siman 95', "
            "'source-sheets', "
            "'Source Sheets - Siman 95', "
            f"{sql_literal(source.title)}, "
            f"{sql_literal(f'Source {source.number}, linked to {related}.')}, "
            f"$source${content_markdown}$source$, "
            f"{5000 + source.number * 10}, "
            "1, "
            "3, "
            "'core'::public.content_difficulty, "
            f"ARRAY['source-sheet','marei-mekomos','siman-95','source-{source.number}'], "
            "'Marei Mekomos for Siman 95.pdf', "
            f"{source.page}, "
            f"{source.page}"
            ")"
        )

    source_to_note_pairs = [
        (f"95-S{source.number}", note_code)
        for source, _image_path in outputs
        for note_code in source.related_notes
    ]
    source_to_note_values = ",\n  ".join(f"({sql_literal(source_code)}, {sql_literal(note_code)})" for source_code, note_code in source_to_note_pairs)

    output_path.write_text(
        f"""-- Import test Source Sheets for Siman 95 sources 1-7.
-- Run after supabase/migrations/202608200001_add_source_sheets_content_type.sql.
-- This is additive/upsert-style test data. It does not delete existing content.

insert into public.content_chunks (
  chunk_code, source_type, siman, workbook_title, section_key, section_title,
  chunk_title, chunk_summary, content_markdown, sort_order, official_shiur_number,
  estimated_minutes, difficulty, tags, source_file_name, source_start_page, source_end_page
)
values
{",\n".join(values)}
on conflict (chunk_code) do update set
  source_type = excluded.source_type,
  siman = excluded.siman,
  workbook_title = excluded.workbook_title,
  section_key = excluded.section_key,
  section_title = excluded.section_title,
  chunk_title = excluded.chunk_title,
  chunk_summary = excluded.chunk_summary,
  content_markdown = excluded.content_markdown,
  sort_order = excluded.sort_order,
  official_shiur_number = excluded.official_shiur_number,
  estimated_minutes = excluded.estimated_minutes,
  difficulty = excluded.difficulty,
  tags = excluded.tags,
  source_file_name = excluded.source_file_name,
  source_start_page = excluded.source_start_page,
  source_end_page = excluded.source_end_page,
  is_selectable = true,
  updated_at = now();

with source_note_links(source_code, note_code) as (
  values
  {source_to_note_values}
)
insert into public.content_chunk_links (parent_chunk_id, related_chunk_id, relation_type)
select note.id, source.id, 'related_source'
from source_note_links link
join public.content_chunks note on note.chunk_code = link.note_code
join public.content_chunks source on source.chunk_code = link.source_code
on conflict (parent_chunk_id, related_chunk_id, relation_type) do nothing;

with source_note_links(source_code, note_code) as (
  values
  {source_to_note_values}
)
insert into public.content_chunk_links (parent_chunk_id, related_chunk_id, relation_type)
select source.id, note.id, 'related_note'
from source_note_links link
join public.content_chunks source on source.chunk_code = link.source_code
join public.content_chunks note on note.chunk_code = link.note_code
on conflict (parent_chunk_id, related_chunk_id, relation_type) do nothing;
""",
        encoding="utf-8",
    )
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local Source Sheets preview for Siman 95 sources 1-7.")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--pdftoppm", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=Path("Content/extracted/source_sheets"))
    parser.add_argument("--ts-out", type=Path, default=Path("src/data/sourceSheetImportPreview.ts"))
    parser.add_argument("--sql-out", type=Path, default=Path("supabase/imports/202608210001_source_sheets_siman95_sources_1_7.sql"))
    args = parser.parse_args()

    render_dir = args.out / "rendered"
    run_poppler(args.pdftoppm, args.pdf, render_dir / "marei_page")
    outputs = crop_sources(render_dir, args.out / "images")
    markdown_path = write_markdown(outputs, args.out)
    html_path = write_html(outputs, args.out)
    ts_path = write_ts_fixture(outputs, args.ts_out)
    sql_path = write_sql_import(outputs, args.sql_out)
    print(f"Wrote {markdown_path}")
    print(f"Wrote {html_path}")
    print(f"Wrote {ts_path}")
    print(f"Wrote {sql_path}")


if __name__ == "__main__":
    main()

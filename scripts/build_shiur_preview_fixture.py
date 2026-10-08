#!/usr/bin/env python3
"""Build a local TypeScript fixture from extracted Shiur Builder Markdown."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert extracted Shiur markdown into a TS preview fixture.")
    parser.add_argument("input", type=Path, help="Extracted Markdown file.")
    parser.add_argument("--out", type=Path, default=Path("src/data/shiurImportPreview.ts"))
    args = parser.parse_args()

    text = args.input.read_text(encoding="utf-8")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        "export const shiurImportPreviewTitle = "
        + json.dumps(args.input.stem, ensure_ascii=False)
        + ";\n\nexport const shiurImportPreviewMarkdown = "
        + json.dumps(text, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

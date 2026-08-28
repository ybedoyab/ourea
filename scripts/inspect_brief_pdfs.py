"""Inspect fixture decision-brief PDFs.

Always checks page count, metadata and forbidden copy from the PDF bytes.
When pdfinfo/pdftotext/pdftoppm are on PATH, also renders every page.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "pdf-audit"
FRONTEND = ROOT / "frontend"


def generate() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["node", "scripts/renderBriefFixtures.mjs", str(CACHE)],
        cwd=FRONTEND,
        check=True,
    )


def pdf_bytes(path: Path) -> bytes:
    return path.read_bytes()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def inspect_bytes(name: str, data: bytes) -> None:
    text = data.decode("latin-1", errors="ignore")
    require(text.startswith("%PDF-1."), f"{name} is not a PDF")
    require("/Count 6" in text, f"{name} is not 6 pages: {text[text.find('/Count'):text.find('/Count')+20]}")
    require("/Author (Ourea)" in text, f"{name} missing Author")
    require("/Lang (en-US)" in text, f"{name} missing language")
    require("/Title" in text, f"{name} missing title")
    require("Page 6 of 6" in text, f"{name} missing last page label")
    require("Page 7 of" not in text, f"{name} has a trailing page")
    for banned in ("houses fall", "houses lean", "planning credit", "collapse in year"):
        require(banned.lower() not in text.lower(), f"{name} contains banned copy: {banned}")
    require("US$" in text or r"US\$" in text, f"{name} missing US$")
    require("ybedoyab.github.io/ourea" in text, f"{name} missing public Pages URL")
    require("/S /URI" in text, f"{name} missing URI annotations")


def poppler(path: Path) -> None:
    pdfinfo = shutil.which("pdfinfo")
    pdftotext = shutil.which("pdftotext")
    pdftoppm = shutil.which("pdftoppm")
    if not pdfinfo or not pdftotext or not pdftoppm:
        print(f"[info] poppler not on PATH; byte-level checks already passed for {path.name}")
        return
    info = subprocess.check_output(["pdfinfo", str(path)], text=True, encoding="utf-8")
    require("Pages:           6" in info or "Pages:\t6" in info or "Pages: 6" in info.replace(" ", ""), f"pdfinfo pages:\n{info}")
    require("Ourea" in info, f"pdfinfo missing author/title:\n{info}")
    text = subprocess.check_output(["pdftotext", "-layout", str(path), "-"], text=True, encoding="utf-8", errors="replace")
    require("Decision requested" in text, f"{path.name} text missing decision")
    require("Why early action matters" in text, f"{path.name} missing mechanism title")
    out_dir = path.parent / path.stem
    out_dir.mkdir(exist_ok=True)
    subprocess.check_call(["pdftoppm", "-png", str(path), str(out_dir / "page")])
    pages = sorted(out_dir.glob("page*.png"))
    require(len(pages) == 6, f"{path.name} rendered {len(pages)} PNGs")
    for image in pages:
        require(image.stat().st_size > 8000, f"{image.name} looks empty ({image.stat().st_size} bytes)")
    print(f"[OK] poppler rendered {path.name}")


def main() -> int:
    generate()
    for name in ("guided-rwh-drainage.pdf", "restoration.pdf"):
        path = CACHE / name
        data = pdf_bytes(path)
        inspect_bytes(name, data)
        poppler(path)
        print(f"[OK] {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

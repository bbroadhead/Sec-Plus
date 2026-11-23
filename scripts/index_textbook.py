#!/usr/bin/env python3
"""Index headings from the original textbook without copying its content."""
import json
import re
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "materials" / "CompTIA Security+ SY0-701 Student.pdf"
INDEX = ROOT / "data" / "lessons.json"

def normalize(value):
    return " ".join(value.split()).strip(" .:-")

def heading_candidates(page):
    blocks = page.get_text("dict").get("blocks", [])
    lines = []
    for block in blocks:
        if "lines" not in block:
            continue
        for line in block["lines"]:
            spans = line.get("spans", [])
            label = normalize(" ".join(s.get("text", "") for s in spans))
            if not label or len(label) > 130:
                continue
            size = max((s.get("size", 0) for s in spans), default=0)
            y = min((s.get("bbox", [0, 10000])[1] for s in spans), default=10000)
            lines.append((label, size, y))
    return lines

def extract_chapters(doc):
    bookmarked = []
    for level, title, page in doc.get_toc():
        title = normalize(title)
        if title and 1 <= page <= len(doc) and level <= 3:
            bookmarked.append({"level": level, "title": title[:180], "page": page})
    if bookmarked:
        return bookmarked, "bookmarks"

    # Bookmark-free PDFs: locate actual section headings in page layout.
    # Only headings visibly printed on a page are indexed. PDF pages are 1-based.
    found = []
    seen = set()
    lesson_pattern = re.compile(r"^(?:lesson|chapter|unit)\\s+(\\d{1,2})(?:\\s*[:.\\-–]\\s*|\\s+)(.{3,100})$", re.I)
    for page_no, page in enumerate(doc, 1):
        if page_no <= 4:
            continue
        lines = heading_candidates(page)
        if not lines:
            continue
        max_size = max(size for _, size, _ in lines)
        for label, size, y in lines:
            match = lesson_pattern.match(label)
            if not match or size < max(11, max_size * .82) or y > page.rect.height * .55:
                continue
            number = int(match.group(1))
            if not 1 <= number <= 99 or number in seen:
                continue
            title = normalize(match.group(2))
            if not title or re.search(r"\\.{3,}\\s*\\d+$", title):
                continue
            seen.add(number)
            found.append({"level": 1, "title": f"Lesson {number}: {title}"[:180], "page": page_no})
            break
    return found, "page-headings" if found else "unavailable"

def main():
    if not PDF.is_file():
        raise SystemExit(f"Textbook missing: {PDF}")
    with fitz.open(PDF) as doc:
        chapters, method = extract_chapters(doc)
        page_count = len(doc)
        if not chapters:
            print("PDF diagnostics: pages=", page_count, "bookmarks=", len(doc.get_toc()))
            for page_number in range(min(page_count, 16)):
                page = doc[page_number]
                lines = heading_candidates(page)
                print("Page", page_number + 1, "chars=", len(page.get_text()), "sample headings=", repr([(t[:65], round(sz,1)) for t,sz,_ in sorted(lines,key=lambda x:-x[1])[:5]]))

    data = json.loads(INDEX.read_text(encoding="utf-8"))
    textbook = data.setdefault("textbook", {})
    if not chapters:
        print("WARNING: No verified chapter headings found; leaving existing textbook index untouched.")
        return
    textbook.update({
        "chapters": chapters,
        "indexMethod": method,
        "pageCount": page_count,
    })
    INDEX.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Indexed {len(chapters)} textbook headings via {method} ({page_count} PDF pages)")
    if not chapters:
        print("WARNING: No reliable headings found. Keeping the index empty; manual review of the PDF contents is required.")

if __name__ == "__main__":
    main()

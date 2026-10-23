
# from pathlib import Path

# from pypdf import PdfReader

# from app.services.document_indexing import index_document


# PDF_PATH = (
#     Path(__file__).resolve().parents[2]
#     / "data"
#     / "syllabus"
#     / "aiml_syllabus.pdf"
# )

# CHUNK_SIZE = 1200
# CHUNK_OVERLAP = 200


# def extract_pdf_chunks() -> list[dict]:
#     if not PDF_PATH.exists():
#         raise FileNotFoundError(
#             f"Syllabus PDF not found: {PDF_PATH}"
#         )

#     reader = PdfReader(str(PDF_PATH))
#     chunks = []

#     for page_number, page in enumerate(reader.pages, start=1):
#         text = page.extract_text() or ""
#         text = " ".join(text.split())

#         if not text:
#             continue

#         start = 0

#         while start < len(text):
#             end = min(start + CHUNK_SIZE, len(text))
#             chunk_text = text[start:end].strip()

#             if chunk_text:
#                 chunks.append(
#                     {
#                         "text": chunk_text,
#                         "source": "aiml_syllabus.pdf",
#                         "title": (
#                             f"YCCE AIML Syllabus - Page {page_number}"
#                         ),
#                         "category": "syllabus",
#                     }
#                 )

#             if end == len(text):
#                 break

#             start = end - CHUNK_OVERLAP

#     return chunks


# def main() -> None:
#     chunks = extract_pdf_chunks()

#     if not chunks:
#         raise ValueError(
#             "No extractable text found in the syllabus PDF."
#         )

#     indexed_count = index_document(chunks)

#     print(f"PDF: {PDF_PATH.name}")
#     print(f"Chunks extracted: {len(chunks)}")
#     print(f"Chunks indexed: {indexed_count}")


# if __name__ == "__main__":
#     main()




import re
from pathlib import Path

from pypdf import PdfReader
from qdrant_client import models

from app.services.document_indexing import (
    get_qdrant_client,
    index_document,
)
from app.core.config import get_settings


PDF_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "syllabus"
    / "aiml_syllabus.pdf"
)

SOURCE_NAME = "aiml_syllabus.pdf"
CATEGORY = "syllabus"
MAX_CHUNK_SIZE = 2200


def clean_text(text: str) -> str:
    """Normalize extracted PDF text without removing useful punctuation."""
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_long_text(text: str) -> list[str]:
    """Split long sections at sentence boundaries when possible."""
    if len(text) <= MAX_CHUNK_SIZE:
        return [text]

    chunks = []
    current = ""

    for paragraph in re.split(r"\n+", text):
        paragraph = paragraph.strip()
        if not paragraph:
            continue

        # Split exceptionally long paragraphs into sentences.
        parts = (
            re.split(r"(?<=[.!?])\s+", paragraph)
            if len(paragraph) > MAX_CHUNK_SIZE
            else [paragraph]
        )

        for part in parts:
            if len(part) > MAX_CHUNK_SIZE:
                if current:
                    chunks.append(current.strip())
                    current = ""

                for start in range(0, len(part), MAX_CHUNK_SIZE):
                    chunks.append(part[start:start + MAX_CHUNK_SIZE].strip())
                continue

            if current and len(current) + len(part) + 1 > MAX_CHUNK_SIZE:
                chunks.append(current.strip())
                current = part
            else:
                current = f"{current}\n{part}".strip()

    if current:
        chunks.append(current.strip())

    return [chunk for chunk in chunks if chunk]


def extract_pdf_chunks() -> list[dict]:
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"Syllabus PDF not found: {PDF_PATH}")

    reader = PdfReader(str(PDF_PATH))
    chunks = []

    # Detect course headings such as:
    # 23AML1503: Design & Analysis of Algorithms
    course_pattern = re.compile(
        r"(?P<code>\b[A-Z0-9]{5,12}\b)\s*:\s*"
        r"(?P<name>[^\n]{3,120})",
        re.IGNORECASE,
    )

    unit_pattern = re.compile(
        r"(?im)^\s*Unit\s*:?\s*(\d+)\s*"
        r"([^:\n]{0,100})"
        r"(?::\s*|\s{2,})(?=\d+\s*(?:Hours|Hrs)\b)"
    )

    current_course = "General AIML Syllabus"
    current_code = ""
    previous_course = ""

    for page_number, page in enumerate(reader.pages, start=1):
        raw_text = page.extract_text() or ""
        text = clean_text(raw_text)

        if not text:
            continue

        # Keep the course context when a course continues onto the next page.
        heading_matches = list(course_pattern.finditer(text))
        for match in heading_matches:
            code = match.group("code").strip()
            name = match.group("name").strip(" :-")
            if len(name) > 100:
                continue
            if "scheme of examination" in name.lower():
                continue

            current_code = code
            current_course = name
            previous_course = current_course

        # Identify unit boundaries and include each unit's content.
        unit_matches = list(unit_pattern.finditer(text))

        if unit_matches:
            prefix = text[:unit_matches[0].start()].strip()

            # Preserve useful course outcomes or introductory text.
            if prefix and (
                current_code in prefix
                or "course outcomes" in prefix.lower()
            ):
                for piece in split_long_text(prefix):
                    chunks.append({
                        "text": piece,
                        "source": SOURCE_NAME,
                        "title": (
                            f"YCCE AIML Syllabus - {current_course} "
                            f"- Page {page_number}"
                        ),
                        "category": CATEGORY,
                    })

            for index, match in enumerate(unit_matches):
                start = match.start()
                end = (
                    unit_matches[index + 1].start()
                    if index + 1 < len(unit_matches)
                    else len(text)
                )
                unit_text = text[start:end].strip()

                # Unit number is captured directly from the PDF heading.
                unit_number = match.group(1)
                unit_title = match.group(2).strip(" :-")

                for piece in split_long_text(unit_text):
                    chunks.append({
                        "text": piece,
                        "source": SOURCE_NAME,
                        "title": (
                            f"YCCE AIML Syllabus - {current_course} "
                            f"- Unit {unit_number} - Page {page_number}"
                        ),
                        "category": CATEGORY,
                    })
        else:
            # Fallback for course details, lab pages, and reference lists.
            for piece in split_long_text(text):
                chunks.append({
                    "text": piece,
                    "source": SOURCE_NAME,
                    "title": (
                        f"YCCE AIML Syllabus - {current_course} "
                        f"- Page {page_number}"
                    ),
                    "category": CATEGORY,
                })

    return chunks


def delete_old_syllabus_chunks() -> None:
    """Delete only points belonging to this PDF."""
    settings = get_settings()
    client = get_qdrant_client()

    if not client.collection_exists(settings.QDRANT_COLLECTION):
        print("Qdrant collection does not exist; nothing to delete.")
        return

    client.delete(
        collection_name=settings.QDRANT_COLLECTION,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="source",
                        match=models.MatchValue(value=SOURCE_NAME),
                    )
                ]
            )
        ),
        wait=True,
    )


def main() -> None:
    # Extract and validate everything before touching existing indexed data.
    chunks = extract_pdf_chunks()

    if not chunks:
        raise ValueError("No extractable syllabus content found.")

    if not any("Design" in item["text"] for item in chunks):
        raise ValueError(
            "Expected syllabus content was not found. "
            "Old indexed chunks were preserved."
        )

    print(f"PDF: {PDF_PATH.name}")
    print(f"New chunks prepared: {len(chunks)}")

    confirmation = input(
        "Replace existing chunks for this PDF only? Type YES: "
    ).strip()

    if confirmation != "YES":
        print("Cancelled. Existing indexed data was not changed.")
        return

    # Remove stale chunks before inserting the new chunk set.
    delete_old_syllabus_chunks()

    try:
        indexed_count = index_document(chunks)
    except Exception:
        print(
            "Indexing failed after deleting old syllabus chunks. "
            "Rerun this script after resolving the error."
        )
        raise

    print(f"Old {SOURCE_NAME} chunks replaced.")
    print(f"New chunks indexed: {indexed_count}")


if __name__ == "__main__":
    main()

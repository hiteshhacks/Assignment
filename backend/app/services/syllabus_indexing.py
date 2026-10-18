
from pathlib import Path

from pypdf import PdfReader

from app.services.document_indexing import index_document


PDF_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "syllabus"
    / "aiml_syllabus.pdf"
)

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200


def extract_pdf_chunks() -> list[dict]:
    if not PDF_PATH.exists():
        raise FileNotFoundError(
            f"Syllabus PDF not found: {PDF_PATH}"
        )

    reader = PdfReader(str(PDF_PATH))
    chunks = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = " ".join(text.split())

        if not text:
            continue

        start = 0

        while start < len(text):
            end = min(start + CHUNK_SIZE, len(text))
            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append(
                    {
                        "text": chunk_text,
                        "source": "aiml_syllabus.pdf",
                        "title": (
                            f"YCCE AIML Syllabus - Page {page_number}"
                        ),
                        "category": "syllabus",
                    }
                )

            if end == len(text):
                break

            start = end - CHUNK_OVERLAP

    return chunks


def main() -> None:
    chunks = extract_pdf_chunks()

    if not chunks:
        raise ValueError(
            "No extractable text found in the syllabus PDF."
        )

    indexed_count = index_document(chunks)

    print(f"PDF: {PDF_PATH.name}")
    print(f"Chunks extracted: {len(chunks)}")
    print(f"Chunks indexed: {indexed_count}")


if __name__ == "__main__":
    main()

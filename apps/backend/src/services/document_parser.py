import os
import logging
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ExtractedChunk:
    chunk_index: int
    content: str
    page_number: Optional[int] = None
    token_count: Optional[int] = None
    embedding: Optional[List[float]] = None


@dataclass
class ExtractionResult:
    success: bool
    markdown: str
    chunks: List[ExtractedChunk]
    page_count: int
    metadata: Dict[str, Any]
    error: Optional[str] = None


class DocumentParser:
    def __init__(self, upload_dir: str = "/tmp/edumotion_uploads"):
        self.upload_dir = Path(upload_dir)

    def extract(self, user_id: str, project_id: str, filename: str) -> ExtractionResult:
        """Extract text from PDF using Docling with PyMuPDF fallback."""
        file_path = self.upload_dir / user_id / project_id / filename

        if not file_path.exists():
            return ExtractionResult(
                success=False,
                markdown="",
                chunks=[],
                page_count=0,
                metadata={},
                error=f"File not found: {file_path}"
            )

        # Try Docling first
        result = self._extract_with_docling(file_path)
        if result.success:
            logger.info(f"Successfully extracted with Docling: {file_path}")
            return result

        logger.warning(f"Docling failed, trying PyMuPDF fallback: {result.error}")
        result = self._extract_with_pymupdf(file_path)
        if result.success:
            logger.info(f"Successfully extracted with PyMuPDF fallback: {file_path}")
            return result

        logger.error(f"Both Docling and PyMuPDF failed for: {file_path}")
        return ExtractionResult(
            success=False,
            markdown="",
            chunks=[],
            page_count=0,
            metadata={},
            error=f"All extraction methods failed. Docling: {result.error}"
        )

    def _extract_with_docling(self, file_path: Path) -> ExtractionResult:
        """Extract using Docling."""
        try:
            from docling.document_converter import DocumentConverter
            from docling.datamodel.base_models import InputFormat
            from docling.datamodel.pipeline_options import PdfPipelineOptions

            # Configure pipeline to disable OCR for faster processing
            pipeline_options = PdfPipelineOptions()
            pipeline_options.do_ocr = False
            pipeline_options.do_table_structure = True

            converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: pipeline_options
                }
            )

            # Convert to Docling document
            result = converter.convert(str(file_path))
            doc = result.document

            # Export to Markdown
            markdown = doc.export_to_markdown()

            # Extract chunks with page info
            chunks = self._create_chunks_from_docling(doc)

            # Get page count
            page_count = len(doc.pages) if hasattr(doc, 'pages') and doc.pages else 0

            # Extract metadata
            metadata = {
                "extraction_method": "docling",
                "extracted_at": datetime.utcnow().isoformat(),
                "file_size": file_path.stat().st_size,
                "page_count": page_count,
                "chunk_count": len(chunks),
            }

            return ExtractionResult(
                success=True,
                markdown=markdown,
                chunks=chunks,
                page_count=page_count,
                metadata=metadata
            )

        except Exception as e:
            logger.error(f"Docling extraction failed: {e}")
            return ExtractionResult(
                success=False,
                markdown="",
                chunks=[],
                page_count=0,
                metadata={},
                error=str(e)
            )

    def _extract_with_pymupdf(self, file_path: Path) -> ExtractionResult:
        """Fallback extraction using PyMuPDF (fitz)."""
        try:
            import fitz  # PyMuPDF

            doc = fitz.open(str(file_path))
            page_count = len(doc)

            if page_count == 0:
                doc.close()
                return ExtractionResult(
                    success=False,
                    markdown="",
                    chunks=[],
                    page_count=0,
                    metadata={},
                    error="PDF has no pages"
                )

            markdown_parts = []
            chunks = []
            chunk_index = 0

            for page_num in range(page_count):
                page = doc[page_num]
                text = page.get_text("text")

                if not text.strip():
                    continue

                # Try to get structured text with blocks
                blocks = page.get_text("dict")["blocks"]
                page_md = self._blocks_to_markdown(blocks, page_num + 1)

                if page_md.strip():
                    markdown_parts.append(f"## Page {page_num + 1}\n\n{page_md}")

                    # Create chunks from this page
                    page_chunks = self._split_into_chunks(page_md, page_num + 1, chunk_index)
                    chunks.extend(page_chunks)
                    chunk_index += len(page_chunks)

            doc.close()

            markdown = "\n\n".join(markdown_parts)

            if not markdown.strip():
                return ExtractionResult(
                    success=False,
                    markdown="",
                    chunks=[],
                    page_count=page_count,
                    metadata={},
                    error="No text content extracted from PDF"
                )

            metadata = {
                "extraction_method": "pymupdf",
                "extracted_at": datetime.utcnow().isoformat(),
                "file_size": file_path.stat().st_size,
                "page_count": page_count,
                "chunk_count": len(chunks),
            }

            return ExtractionResult(
                success=True,
                markdown=markdown,
                chunks=chunks,
                page_count=page_count,
                metadata=metadata
            )

        except Exception as e:
            logger.error(f"PyMuPDF extraction failed: {e}")
            return ExtractionResult(
                success=False,
                markdown="",
                chunks=[],
                page_count=0,
                metadata={},
                error=str(e)
            )

    def _create_chunks_from_docling(self, doc) -> List[ExtractedChunk]:
        """Create chunks from Docling document."""
        chunks = []
        chunk_index = 0

        # Try to iterate through text elements
        if hasattr(doc, 'texts'):
            for text_elem in doc.texts:
                content = text_elem.text.strip()
                if content:
                    page_num = getattr(text_elem, 'page', None)
                    if isinstance(page_num, int) and page_num > 0:
                        pass  # Use page_num
                    else:
                        page_num = None

                    chunks.append(ExtractedChunk(
                        chunk_index=chunk_index,
                        content=content,
                        page_number=page_num,
                        token_count=self._estimate_tokens(content)
                    ))
                    chunk_index += 1

        # If no texts found, fall back to splitting markdown
        if not chunks and hasattr(doc, 'export_to_markdown'):
            markdown = doc.export_to_markdown()
            chunks = self._split_into_chunks(markdown, None, 0)

        return chunks

    def _blocks_to_markdown(self, blocks: List[Dict], page_num: int) -> str:
        """Convert PyMuPDF blocks to markdown-like text."""
        lines = []
        for block in blocks:
            if "lines" not in block:
                continue
            for line in block["lines"]:
                line_text = ""
                for span in line.get("spans", []):
                    text = span.get("text", "")
                    if text.strip():
                        # Check for bold/italic
                        flags = span.get("flags", 0)
                        if flags & 16:  # Bold
                            text = f"**{text}**"
                        if flags & 2:  # Italic
                            text = f"*{text}*"
                        line_text += text
                if line_text.strip():
                    lines.append(line_text)

        return "\n".join(lines)

    def _split_into_chunks(self, text: str, page_num: Optional[int], start_index: int) -> List[ExtractedChunk]:
        """Split text into chunks of ~500 tokens."""
        # Simple chunking by paragraphs
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []
        current_chunk = ""
        chunk_index = start_index

        for para in paragraphs:
            # Estimate tokens (rough: 1 token ≈ 4 chars)
            estimated_tokens = (len(current_chunk) + len(para)) // 4

            if estimated_tokens > 500 and current_chunk:
                chunks.append(ExtractedChunk(
                    chunk_index=chunk_index,
                    content=current_chunk.strip(),
                    page_number=page_num,
                    token_count=self._estimate_tokens(current_chunk)
                ))
                chunk_index += 1
                current_chunk = para
            else:
                current_chunk += "\n\n" + para if current_chunk else para

        # Add remaining
        if current_chunk.strip():
            chunks.append(ExtractedChunk(
                chunk_index=chunk_index,
                content=current_chunk.strip(),
                page_number=page_num,
                token_count=self._estimate_tokens(current_chunk)
            ))

        return chunks

    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation: ~4 chars per token."""
        return max(1, len(text) // 4)
/**
 * Semantic and Legal-aware Chunker for dense legal documents.
 * Splitting on Chapter and Section boundaries to keep legal clauses, sections, and paragraphs intact,
 * and grouping them up to a target size with an overlap window.
 */

interface Chunk {
  content: string;
  estimatedTokens: number;
}

/**
 * Estimates token count based on a rough average of 4 characters per token.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Splits text into logical chunks, prioritizing Chapter/Section boundaries,
 * then falling back to paragraphs, and grouping them.
 *
 * @param text The raw extracted text from the PDF document.
 * @param targetTokenSize Target number of tokens per chunk (default: 600).
 * @param overlapTokenSize Number of tokens to overlap with the previous chunk (default: 150).
 */
export function chunkText(
  text: string,
  targetTokenSize = 600,
  overlapTokenSize = 150
): Chunk[] {
  const textStr = text;
  if (!textStr || typeof textStr !== 'string' || textStr.trim() === '') {
    return [];
  }

  // Legal-aware splitting: Check if we have Chapter or Section headings
  const hasLegalHeadings = /chapter\s+[ivxlcdm]+|section\s+\d+/i.test(textStr);
  
  let parts: string[] = [];
  if (hasLegalHeadings) {
    // Split on Section or Chapter boundaries, keeping the delimiter at the start of the split element
    parts = textStr
      .split(/(?=chapter\s+[ivxlcdm]+|section\s+\d+|sec\.\s+\d+)/gi)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  } else {
    // Fall back to paragraph boundaries
    parts = textStr
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  const chunks: Chunk[] = [];
  let currentParts: string[] = [];
  let currentTokenCount = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const partTokens = estimateTokens(part);

    if (currentTokenCount + partTokens > targetTokenSize && currentParts.length > 0) {
      // Finalize the current chunk
      const chunkTextContent = currentParts.join('\n\n');
      chunks.push({
        content: chunkTextContent,
        estimatedTokens: currentTokenCount,
      });

      // Keep parts that fit within the overlap window for the next chunk
      const newParts: string[] = [];
      let overlapCount = 0;

      // Scan backwards from the current list to build overlap
      for (let j = currentParts.length - 1; j >= 0; j--) {
        const prevPart = currentParts[j];
        const prevPartTokens = estimateTokens(prevPart);
        if (overlapCount + prevPartTokens <= overlapTokenSize) {
          newParts.unshift(prevPart);
          overlapCount += prevPartTokens;
        } else {
          break;
        }
      }

      currentParts = newParts;
      currentTokenCount = overlapCount;
    }

    currentParts.push(part);
    currentTokenCount += partTokens;
  }

  // Finalize the last chunk
  if (currentParts.length > 0) {
    chunks.push({
      content: currentParts.join('\n\n'),
      estimatedTokens: currentTokenCount,
    });
  }

  return chunks;
}

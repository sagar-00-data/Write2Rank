/**
 * Semantic Paragraph-based Chunker for dense legal documents.
 * Splitting on double newlines to keep legal clauses, sections, and paragraphs intact,
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
 * Splits text into paragraphs, then groups paragraphs into chunks.
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
  if (!text || text.trim() === '') {
    return [];
  }

  // Split by common paragraph boundaries
  const paragraphs = text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: Chunk[] = [];
  let currentParagraphs: string[] = [];
  let currentTokenCount = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const paraTokens = estimateTokens(para);

    // If a single paragraph is extremely long (e.g. exceeding target size),
    // we might need to split it by sentences, but usually double newlines are safe.
    if (currentTokenCount + paraTokens > targetTokenSize && currentParagraphs.length > 0) {
      // Finalize the current chunk
      const chunkTextContent = currentParagraphs.join('\n\n');
      chunks.push({
        content: chunkTextContent,
        estimatedTokens: currentTokenCount,
      });

      // Keep paragraphs that fit within the overlap window for the next chunk
      const newParagraphs: string[] = [];
      let overlapCount = 0;

      // Scan backwards from the current paragraph list to build overlap
      for (let j = currentParagraphs.length - 1; j >= 0; j--) {
        const prevPara = currentParagraphs[j];
        const prevParaTokens = estimateTokens(prevPara);
        if (overlapCount + prevParaTokens <= overlapTokenSize) {
          newParagraphs.unshift(prevPara);
          overlapCount += prevParaTokens;
        } else {
          break;
        }
      }

      currentParagraphs = newParagraphs;
      currentTokenCount = overlapCount;
    }

    currentParagraphs.push(para);
    currentTokenCount += paraTokens;
  }

  // Finalize the last chunk
  if (currentParagraphs.length > 0) {
    chunks.push({
      content: currentParagraphs.join('\n\n'),
      estimatedTokens: currentTokenCount,
    });
  }

  return chunks;
}

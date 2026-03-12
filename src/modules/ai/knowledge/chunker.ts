// src/modules/ai/knowledge/chunker.ts

const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200

export function chunkDocument(text: string, sourceName: string): Array<{ content: string; chunkIndex: number }> {
  const chunks: Array<{ content: string; chunkIndex: number }> = []
  let position = 0
  let chunkIndex = 0

  while (position < text.length) {
    let end = Math.min(position + CHUNK_SIZE, text.length)

    if (end < text.length) {
      const breakPoints = ["\n\n", "\n", ". ", "! ", "? "]
      for (const bp of breakPoints) {
        const lastBreak = text.lastIndexOf(bp, end)
        if (lastBreak > position + CHUNK_SIZE / 2) {
          end = lastBreak + bp.length
          break
        }
      }
    }

    const content = text.slice(position, end).trim()
    if (content.length > 0) {
      chunks.push({ content, chunkIndex })
      chunkIndex++
    }

    // Move position forward, with overlap
    const newPosition = end - CHUNK_OVERLAP
    if (newPosition <= position) {
      position = end // Prevent infinite loop
    } else {
      position = newPosition
    }
  }

  return chunks
}

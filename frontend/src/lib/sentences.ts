import type { SentenceItem } from '../types'

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'rev', 'hon', 'pres', 'gov', 'sen',
  'rep', 'gen', 'col', 'lt', 'capt', 'sgt', 'cpl', 'pvt', 'st', 'ave',
  'blvd', 'rd', 'ln', 'ct', 'pl', 'ter', 'jan', 'feb', 'mar', 'apr',
  'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'vs', 'etc', 'al',
  'inc', 'corp', 'ltd', 'co', 'e.g', 'i.e', 'v', 'viz', 'cf', 'pp',
  'op', 'cit', 'trans', 'vol', 'no', 'fig', 'p', 'pp', 'ch', 'sec'
])

function isCapitalized(word: string): boolean {
  return word.length > 0 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()
}


export function splitToSentences(
  text: string,
  paragraphId: string,
  paragraphIndex: number,
): SentenceItem[] {
  if (!text.trim()) return []

  // Normalize quotes and ellipsis for consistent splitting
  let normalized = text
    .replace(/\.\.\./g, '…')           // ellipsis
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")

  // Split on sentence boundaries: .!? followed by space and capital letter,
  // but not if the preceding word is an abbreviation.
  const candidates: string[] = []
  let start = 0
  const len = normalized.length

  for (let i = 0; i < len; i++) {
    const ch = normalized[i]
    if (ch === '.' || ch === '!' || ch === '?') {
      // Look ahead to see if this is a sentence end
      const nextChar = normalized[i + 1]
      const afterSpace = nextChar === ' ' || nextChar === '\n' || nextChar === '\r' || nextChar === '\t'
      const twoCharsLater = normalized[i + 2]
      const capitalAfter = twoCharsLater

      // Check for abbreviations
      let isAbbreviation = false
      // Find word before the period
      let wordStart = i - 1
      while (wordStart >= 0 && /[a-zA-Z]/.test(normalized[wordStart])) wordStart--
      wordStart++
      const possibleAbbr = normalized.slice(wordStart, i).toLowerCase()
      if (ABBREVIATIONS.has(possibleAbbr)) {
        isAbbreviation = true
      }
      // Special case: single uppercase letter followed by period (e.g., "U.S.")
      if (possibleAbbr.length === 1 && possibleAbbr === possibleAbbr.toUpperCase()) {
        isAbbreviation = true
      }

      if (!isAbbreviation && afterSpace && capitalAfter) {
        candidates.push(normalized.slice(start, i + 1).trim())
        start = i + 1
        // skip the space
        if (normalized[start] === ' ') start++
      } else if (i === len - 1) {
        // end of text
        candidates.push(normalized.slice(start).trim())
      }
    } else if (i === len - 1 && start < len) {
      candidates.push(normalized.slice(start).trim())
    }
  }

  // Clean up and filter out empty strings
  const sentences = candidates.filter(s => s.length > 0)

  // Generate stable IDs
  function simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash).toString(36)
  }

  return sentences.map((s, idx) => ({
    id: `${paragraphId}-${idx}-${simpleHash(s.slice(0, 20))}`,
    text: s,

    paragraphIndex,
    sentenceIndex: idx,

    variations: [],
  }))
}

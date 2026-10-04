/**
 * Small fuzzy matcher for the command palette, in the spirit of VS Code's quick open.
 * The query's characters must appear in order in the text. Matches score higher when they're
 * consecutive, start a word, or start the string; gaps cost a little. Returns null for no match.
 * O(n) per candidate: a single greedy pass over the text.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, '')
  if (!q) return 0
  const t = text.toLowerCase()
  let score = 0
  let ti = 0
  let prevMatch = -2
  for (const ch of q) {
    const found = t.indexOf(ch, ti)
    if (found === -1) return null
    const startsWord = found === 0 || /[\s\-_/]/.test(t[found - 1])
    score += 1
    if (found === prevMatch + 1) score += 4
    if (startsWord) score += found === 0 ? 6 : 3
    score -= Math.min(3, found - ti) * 0.25
    prevMatch = found
    ti = found + 1
  }
  // Prefer shorter texts when everything else is equal.
  return score - t.length * 0.01
}

export function fuzzyFilter<T>(items: T[], query: string, getText: (item: T) => string, limit = 20): T[] {
  if (!query.trim()) return items.slice(0, limit)
  return items
    .map((item) => ({ item, score: fuzzyScore(query, getText(item)) }))
    .filter((x): x is { item: T; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item)
}

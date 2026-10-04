/** Map a day's spend to an intensity level 0-4. Capped at the 85th percentile so one rent day doesn't wash everything out. */
export function intensityLevels(totals: number[]): number[] {
  const nonZero = totals.filter((t) => t > 0).sort((a, b) => a - b)
  if (!nonZero.length) return totals.map(() => 0)
  const cap = nonZero[Math.min(nonZero.length - 1, Math.floor(nonZero.length * 0.85))]
  return totals.map((t) => (t === 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((t / cap) * 4)))))
}

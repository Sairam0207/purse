/**
 * Pure helpers for list virtualization. Rows can have different heights
 * (day headers vs transactions), so we precompute prefix sums of heights once (O(n))
 * and binary search them on every scroll (O(log n)) to find what's visible.
 */

/** offsets[i] is the top of row i; offsets[n] is the total height. */
export function prefixOffsets(heights: number[]): number[] {
  const offsets = new Array<number>(heights.length + 1)
  offsets[0] = 0
  for (let i = 0; i < heights.length; i++) offsets[i + 1] = offsets[i] + heights[i]
  return offsets
}

/** Index of the row containing pixel y: the last i with offsets[i] <= y. */
export function rowAt(offsets: number[], y: number): number {
  const n = offsets.length - 1
  if (n <= 0) return 0
  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1
    if (offsets[mid] <= y) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** The [start, end) range of rows to render for a viewport, padded by `overscan` rows on each side. */
export function visibleRange(
  offsets: number[],
  scrollTop: number,
  viewportHeight: number,
  overscan = 6,
): [number, number] {
  const n = offsets.length - 1
  if (n <= 0) return [0, 0]
  const first = rowAt(offsets, Math.max(0, scrollTop))
  const last = rowAt(offsets, Math.max(0, scrollTop + viewportHeight))
  return [Math.max(0, first - overscan), Math.min(n, last + 1 + overscan)]
}

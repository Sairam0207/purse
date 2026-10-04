import { useEffect, useMemo, useState, type RefObject } from 'react'
import { prefixOffsets, visibleRange } from '../lib/virtual'

/**
 * Renders only the rows near the viewport for a list that scrolls with the page.
 * A list of 10,000 transactions keeps ~30 rows in the DOM instead of 10,000.
 */
export function useWindowVirtualizer(
  containerRef: RefObject<HTMLElement | null>,
  heights: number[],
  overscan = 8,
) {
  const offsets = useMemo(() => prefixOffsets(heights), [heights])
  const [range, setRange] = useState<[number, number]>(() => [0, Math.min(heights.length, 30)])

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const el = containerRef.current
      if (!el) return
      // Distance from the top of the list to the top of the viewport.
      const listTop = el.getBoundingClientRect().top
      const next = visibleRange(offsets, -listTop, window.innerHeight, overscan)
      setRange((prev) => (prev[0] === next[0] && prev[1] === next[1] ? prev : next))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [containerRef, offsets, overscan])

  return { range, offsets, totalHeight: offsets[offsets.length - 1] }
}

import type { CSSProperties } from 'react'

/** Placeholder shown while a lazily loaded page is downloading. */
export function Skeleton({ width = '100%', height = 16, style }: { width?: string | number; height?: number; style?: CSSProperties }) {
  return <span className="skeleton" style={{ width, height, ...style }} aria-hidden="true" />
}

export function PageSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading page">
      <Skeleton width={220} height={36} />
      <Skeleton width="60%" height={28} style={{ marginTop: 24 }} />
      <Skeleton width="40%" height={28} style={{ marginTop: 10 }} />
      <Skeleton height={320} style={{ marginTop: 36, borderRadius: 22 }} />
    </div>
  )
}

import { cx } from './cx'

interface Props {
  label: string
  value: number
  max: number
  /** Human readable value for screen readers, e.g. "₹800 of ₹1,000". */
  valueText?: string
  tone?: 'ok' | 'warn' | 'over'
  className?: string
}

export function ProgressBar({ label, value, max, valueText, tone = 'ok', className }: Props) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div
      className={cx('progress', `progress-${tone}`, className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-valuetext={valueText}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

import { useId } from 'react'
import { cx } from './cx'

export interface Segment<T extends string> {
  value: T
  label: string
  /** Optional modifier class, e.g. to tint the selected state. */
  tone?: string
}

interface Props<T extends string> {
  legend: string
  hideLegend?: boolean
  value: T
  options: Segment<T>[]
  onChange: (value: T) => void
  className?: string
}

/**
 * A single-choice toggle built on native radio inputs, so arrow keys,
 * form semantics and screen reader announcements work without extra code.
 */
export function SegmentedControl<T extends string>({
  legend,
  hideLegend = true,
  value,
  options,
  onChange,
  className,
}: Props<T>) {
  const name = useId()
  return (
    <fieldset className={cx('segmented', className)}>
      <legend className={hideLegend ? 'sr-only' : 'segmented-legend'}>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={cx('segment', o.tone)}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

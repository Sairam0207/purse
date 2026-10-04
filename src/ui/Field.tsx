import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { cx } from './cx'

interface FieldProps {
  label: ReactNode
  /** Validation message. When present the control gets aria-invalid and is described by it. */
  error?: string
  help?: ReactNode
  optional?: boolean
  hideLabel?: boolean
  className?: string
  /** The form control. Field wires up id, aria-invalid and aria-describedby on it. */
  children: ReactElement<Record<string, unknown>>
}

/**
 * Wraps any input-like control with a label, help text and error message,
 * and connects them for screen readers so every consumer gets it right for free.
 */
export function Field({ label, error, help, optional, hideLabel, className, children }: FieldProps) {
  const autoId = useId()
  const id = (isValidElement(children) && (children.props.id as string)) || autoId
  const helpId = help ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('field', className)}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>
        {label}
        {optional && <span className="optional"> optional</span>}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
      {help && (
        <p className="field-help" id={helpId}>
          {help}
        </p>
      )}
    </div>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />
}

export interface SelectOption {
  value: string
  label: string
}

export function Select({
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[] }) {
  return (
    <select {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'ghost' | 'quiet' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** Optional leading icon. Decorative: it's hidden from assistive tech. */
  icon?: ReactNode
}

/** The one button in the system. Defaults to type="button" so it never submits a form by accident. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ghost', icon, className, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cx('btn', `btn-${variant}`, className)} {...rest}>
      {icon}
      {children}
    </button>
  )
})

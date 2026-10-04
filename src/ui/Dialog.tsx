import { useEffect, useRef, type ReactNode } from 'react'
import { IconClose } from '../components/Icons'
import { IconButton } from './IconButton'
import { cx } from './cx'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  /** Extra controls rendered next to the close button (e.g. a delete action). */
  headerActions?: ReactNode
  size?: 'sm' | 'md'
  /** Render the title visually hidden (still announced). */
  hideTitle?: boolean
  className?: string
  children: ReactNode
}

/**
 * Modal built on the native <dialog> element. showModal() provides focus trapping,
 * Escape to close, an inert background and ::backdrop, so we don't need a library for it.
 * Focus is returned to whatever opened the dialog when it closes.
 * Mark the element that should receive focus on open with data-autofocus.
 */
export function Dialog({ open, onClose, title, headerActions, size = 'md', hideTitle, className, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const titleId = `${title.replace(/\W+/g, '-').toLowerCase()}-title`

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null
      dialog.showModal()
      // showModal() focuses the first focusable element (often Close). Prefer the element the
      // content marked with data-autofocus. React's autoFocus can't help: it fires while the
      // dialog is still closed and its content isn't focusable yet.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) {
      dialog.close()
      returnFocus.current?.focus?.()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cx('dialog', `dialog-${size}`, className)}
      aria-labelledby={titleId}
      onClose={() => open && onClose()}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {open && (
        <div className="dialog-body">
          <div className={cx('dialog-head', hideTitle && 'sr-only')}>
            <h2 id={titleId}>{title}</h2>
            <div className="dialog-head-actions">
              {headerActions}
              <IconButton label="Close" icon={<IconClose />} onClick={onClose} />
            </div>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

import { useToasts } from '../store/toast'
import { IconClose } from './Icons'

export function Toaster() {
  const { toasts, dismiss } = useToasts()
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.message}</span>
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                t.action?.onClick()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="icon-btn" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            <IconClose width={16} height={16} />
          </button>
        </div>
      ))}
    </div>
  )
}

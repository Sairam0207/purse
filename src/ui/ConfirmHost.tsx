import { Dialog } from './Dialog'
import { Button } from './Button'
import { useConfirmStore } from './confirmStore'

/** Renders confirm() requests. Mount once near the root. */
export function ConfirmHost() {
  const { request, settle } = useConfirmStore()
  return (
    <Dialog open={request !== null} onClose={() => settle(false)} title={request?.title ?? 'Confirm'} size="sm">
      <p className="confirm-message">{request?.message}</p>
      <div className="form-actions">
        <Button variant="ghost" onClick={() => settle(false)}>
          Cancel
        </Button>
        <Button variant={request?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => settle(true)} data-autofocus>
          {request?.confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}

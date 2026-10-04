import { useUI } from '../store/ui'
import { useLedger } from '../store/ledger'
import { toast } from '../store/toast'
import { Dialog, IconButton } from '../ui'
import { TransactionForm } from './TransactionForm'
import { IconTrash } from './Icons'

export function TransactionDialog() {
  const { editing, defaultDate, close } = useUI()
  const { add, update, remove, restore } = useLedger()
  const initial = editing && editing !== 'new' ? editing : undefined

  const handleDelete = () => {
    if (!initial) return
    const removed = remove(initial.id)
    close()
    if (removed) toast('Transaction deleted', { label: 'Undo', onClick: () => restore(removed) })
  }

  return (
    <Dialog
      open={editing !== null}
      onClose={close}
      title={initial ? 'Edit transaction' : 'New transaction'}
      headerActions={
        initial && <IconButton label="Delete transaction" tone="danger" icon={<IconTrash />} onClick={handleDelete} />
      }
    >
      <TransactionForm
        key={initial?.id ?? 'new'}
        initial={initial}
        defaultDate={defaultDate}
        onCancel={close}
        onSubmit={(tx) => {
          if (initial) {
            update(initial.id, tx)
            toast('Changes saved')
          } else {
            add(tx)
            toast('Transaction added')
          }
          close()
        }}
      />
    </Dialog>
  )
}

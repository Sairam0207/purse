import { useId, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { categoriesFor } from '../lib/categories'
import { minorToInput, parseAmount } from '../lib/format'
import { validateTransaction, type Errors } from '../lib/validate'
import { Button, Field, SegmentedControl, Select, TextInput } from '../ui'
import type { Transaction, TxType } from '../types'
import type { NewTransaction } from '../store/ledger'

interface Props {
  initial?: Transaction
  defaultDate?: string
  onSubmit: (tx: NewTransaction) => void
  onCancel: () => void
}


const TYPES = [
  { value: 'expense' as const, label: 'Expense', tone: 'segment-expense' },
  { value: 'income' as const, label: 'Income', tone: 'segment-income' },
]

export function TransactionForm({ initial, defaultDate, onSubmit, onCancel }: Props) {
  const uid = useId()
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial ? minorToInput(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? 'food')
  const [date, setDate] = useState(
    () => initial?.date ?? defaultDate ?? format(new Date(), 'yyyy-MM-dd'),
  )
  const [note, setNote] = useState(initial?.note ?? '')
  const [errors, setErrors] = useState<Errors>({})

  const switchType = (next: TxType) => {
    setType(next)
    // Keep the category valid for the chosen type.
    if (!categoriesFor(next).some((c) => c.id === categoryId)) setCategoryId(categoriesFor(next)[0].id)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const next = validateTransaction({ amount, date, categoryId, type })
    setErrors(next)
    const firstInvalid = Object.keys(next)[0]
    if (firstInvalid) {
      document.getElementById(`${uid}-${firstInvalid}`)?.focus()
      return
    }
    onSubmit({ type, amount: parseAmount(amount)!, categoryId, date, note: note.trim() })
  }

  return (
    <form className="tx-form" onSubmit={handleSubmit} noValidate>
      <SegmentedControl legend="Type" value={type} options={TYPES} onChange={switchType} />

      <Field label="Amount" error={errors.amount} className="field-amount">
        <TextInput
          id={`${uid}-amount`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          data-autofocus
        />
      </Field>

      <div className="field-row">
        <Field label="Category" error={errors.categoryId}>
          <Select
            id={`${uid}-categoryId`}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categoriesFor(type).map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field label="Date" error={errors.date}>
          <TextInput id={`${uid}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Note" optional>
        <TextInput maxLength={80} placeholder="What was it for?" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="form-actions">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initial ? 'Save changes' : 'Add transaction'}
        </Button>
      </div>
    </form>
  )
}

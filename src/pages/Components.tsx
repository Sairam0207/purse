import { useState, type ReactNode } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { IconPlus, IconTrash } from '../components/Icons'
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  ProgressBar,
  SegmentedControl,
  Select,
  Skeleton,
  TextInput,
  confirm,
} from '../ui'
import { toast } from '../store/toast'

interface Prop {
  name: string
  type: string
  note: string
}

function Spec({ name, summary, props, children }: { name: string; summary: string; props: Prop[]; children: ReactNode }) {
  const id = `c-${name.toLowerCase()}`
  return (
    <section className="spec" aria-labelledby={id}>
      <div className="spec-text">
        <h2 id={id}>{name}</h2>
        <p>{summary}</p>
        <div className="spec-props">
          <table>
            <caption className="sr-only">{name} props</caption>
            <thead>
              <tr><th scope="col">Prop</th><th scope="col">Type</th><th scope="col">Notes</th></tr>
            </thead>
            <tbody>
              {props.map((p) => (
                <tr key={p.name}>
                  <td><code>{p.name}</code></td>
                  <td><code>{p.type}</code></td>
                  <td>{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="spec-demo">{children}</div>
    </section>
  )
}

export default function Components() {
  useDocumentTitle('Components')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [segment, setSegment] = useState<'day' | 'week' | 'month'>('week')
  const [amount, setAmount] = useState('')
  const [progress, setProgress] = useState(64)
  const amountError = amount && !/^\d+(\.\d{1,2})?$/.test(amount) ? 'Use digits, like 250 or 99.50.' : undefined

  return (
    <div className="page components-page">
      <div className="page-head">
        <h1>Components</h1>
        <p className="page-sub">
          The reusable building blocks behind every screen in Purse, exported from <code>src/ui</code>. Each one
          handles its own accessibility wiring so feature code can't forget it.
        </p>
      </div>

      <Spec
        name="Button"
        summary="Every clickable action. Defaults to type=button so it never submits a form by accident."
        props={[
          { name: 'variant', type: "'primary' | 'ghost' | 'quiet' | 'danger'", note: 'One primary action per view.' },
          { name: 'icon', type: 'ReactNode', note: 'Leading icon, hidden from screen readers.' },
        ]}
      >
        <div className="button-row">
          <Button variant="primary" icon={<IconPlus />}>Add transaction</Button>
          <Button>Export CSV</Button>
          <Button variant="quiet">Clear filters</Button>
          <Button variant="danger">Delete all data</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Spec>

      <Spec
        name="IconButton"
        summary="Icon-only actions. The label prop is required by its type, so an unlabeled icon button won't compile."
        props={[
          { name: 'label', type: 'string', note: 'Required. Becomes aria-label and tooltip.' },
          { name: 'tone', type: "'default' | 'danger'", note: 'Danger tints on hover.' },
        ]}
      >
        <div className="button-row">
          <IconButton label="Add" icon={<IconPlus />} />
          <IconButton label="Delete" tone="danger" icon={<IconTrash />} />
        </div>
      </Spec>

      <Spec
        name="Field"
        summary="Wraps any control with a label, help and error text, and links them with aria-describedby and aria-invalid."
        props={[
          { name: 'label', type: 'ReactNode', note: 'Always rendered; use hideLabel to make it visually hidden.' },
          { name: 'error', type: 'string', note: 'Marks the control invalid and announces the message.' },
          { name: 'help', type: 'ReactNode', note: 'Persistent hint below the control.' },
        ]}
      >
        <div className="demo-stack">
          <Field label="Amount" error={amountError} help="Try typing letters to see the error state.">
            <TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Category" optional>
            <Select
              options={[
                { value: 'food', label: 'Eating out' },
                { value: 'transport', label: 'Transport' },
              ]}
            />
          </Field>
        </div>
      </Spec>

      <Spec
        name="SegmentedControl"
        summary="Single choice between a few options. Built on native radios, so arrow keys and form semantics come free."
        props={[
          { name: 'value / onChange', type: 'T extends string', note: 'Generic, so options and value are type-checked together.' },
          { name: 'legend', type: 'string', note: 'Group name for screen readers.' },
        ]}
      >
        <SegmentedControl
          legend="Range"
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
        />
        <p className="demo-note">Selected: {segment}</p>
      </Spec>

      <Spec
        name="ProgressBar"
        summary="Shows progress toward a limit, with a readable value for assistive tech."
        props={[
          { name: 'value / max', type: 'number', note: 'Fill is clamped at 100%.' },
          { name: 'tone', type: "'ok' | 'warn' | 'over'", note: 'Color reflects state.' },
          { name: 'valueText', type: 'string', note: 'e.g. "₹800 of ₹1,000".' },
        ]}
      >
        <div className="demo-stack">
          <ProgressBar label="Demo progress" value={progress} max={100} tone={progress > 100 ? 'over' : progress > 85 ? 'warn' : 'ok'} />
          <input
            type="range"
            min={0}
            max={120}
            value={progress}
            aria-label="Progress value"
            onChange={(e) => setProgress(Number(e.target.value))}
          />
        </div>
      </Spec>

      <Spec
        name="Dialog"
        summary="Modal on the native <dialog> element: focus trap, Escape, inert background, and focus returns to the trigger."
        props={[
          { name: 'open / onClose', type: 'boolean / () => void', note: 'Controlled.' },
          { name: 'title', type: 'string', note: 'Labels the dialog.' },
          { name: 'headerActions', type: 'ReactNode', note: 'Extra buttons beside Close.' },
        ]}
      >
        <div className="button-row">
          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Button
            onClick={async () => {
              const ok = await confirm({ title: 'Archive this?', message: 'You can restore it later.', confirmLabel: 'Archive' })
              toast(ok ? 'Archived' : 'Kept')
            }}
          >
            confirm()
          </Button>
          <Button onClick={() => toast('Saved', { label: 'Undo', onClick: () => toast('Undone') })}>toast()</Button>
        </div>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Example dialog" size="sm">
          <p className="confirm-message">Press Escape, click outside, or use the button to close.</p>
          <div className="form-actions">
            <Button variant="primary" onClick={() => setDialogOpen(false)}>Done</Button>
          </div>
        </Dialog>
      </Spec>

      <Spec
        name="Skeleton and EmptyState"
        summary="Loading and empty moments. Empty states always tell people what to do next."
        props={[{ name: 'title / action', type: 'string / ReactNode', note: 'EmptyState heading and next step.' }]}
      >
        <div className="demo-stack">
          <Skeleton width="70%" height={20} />
          <Skeleton width="45%" height={20} />
          <EmptyState title="No matches" action={<Button variant="quiet">Clear filters</Button>}>
            Try a different search.
          </EmptyState>
        </div>
      </Spec>
    </div>
  )
}

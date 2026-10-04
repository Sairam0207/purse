import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmHost, Field, IconButton, ProgressBar, SegmentedControl, TextInput, confirm } from '.'
import { IconPlus } from '../components/Icons'

describe('UI library', () => {
  it('Field links label, error and help to the control', () => {
    render(
      <Field label="Amount" error="Too big" help="In rupees">
        <TextInput />
      </Field>,
    )
    const input = screen.getByLabelText('Amount')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Too big In rupees')
  })

  it('IconButton always has an accessible name', () => {
    render(<IconButton label="Add" icon={<IconPlus />} />)
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('SegmentedControl reports the chosen value', async () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        legend="Range"
        value="a"
        onChange={onChange}
        options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]}
      />,
    )
    expect(screen.getByRole('group', { name: 'Range' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'B' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('ProgressBar exposes value text and clamps', () => {
    render(<ProgressBar label="Food" value={150} max={100} valueText="₹150 of ₹100" />)
    const bar = screen.getByRole('progressbar', { name: 'Food' })
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    expect(bar).toHaveAttribute('aria-valuetext', '₹150 of ₹100')
  })

  it('confirm() resolves with the user’s choice', async () => {
    render(<ConfirmHost />)
    let result: Promise<boolean>
    act(() => {
      result = confirm({ title: 'Delete?', message: 'Sure?', confirmLabel: 'Delete', tone: 'danger' })
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await expect(result!).resolves.toBe(true)

    act(() => {
      result = confirm({ title: 'Again?', message: 'Sure?', confirmLabel: 'Yes' })
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    await expect(result!).resolves.toBe(false)
  })
})

describe('UI library: remaining pieces', () => {
  it('Select renders options and EmptyState renders its action', async () => {
    const { Select, EmptyState, Button, Skeleton, PageSkeleton } = await import('.')
    render(
      <>
        <Field label="Pick">
          <Select options={[{ value: 'a', label: 'Alpha' }]} />
        </Field>
        <EmptyState title="Nothing here" action={<Button>Add one</Button>}>Start by adding.</EmptyState>
        <Skeleton width={10} />
        <PageSkeleton />
      </>,
    )
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add one' })).toHaveAttribute('type', 'button')
    expect(screen.getByLabelText('Loading page')).toHaveAttribute('aria-busy', 'true')
  })

  it('Dialog opens, focuses data-autofocus, and closes on backdrop click', async () => {
    const { Dialog } = await import('.')
    const onClose = vi.fn()
    const { rerender } = render(
      <Dialog open={false} onClose={onClose} title="Test dialog">
        <input aria-label="Focus me" data-autofocus />
      </Dialog>,
    )
    rerender(
      <Dialog open onClose={onClose} title="Test dialog">
        <input aria-label="Focus me" data-autofocus />
      </Dialog>,
    )
    expect(screen.getByLabelText('Focus me')).toHaveFocus()
    await userEvent.click(screen.getByRole('dialog', { hidden: true }))
    expect(onClose).toHaveBeenCalled()
    rerender(
      <Dialog open={false} onClose={onClose} title="Test dialog">
        <input aria-label="Focus me" data-autofocus />
      </Dialog>,
    )
    expect(screen.queryByLabelText('Focus me')).toBeNull()
  })

  it('cx joins truthy class names', async () => {
    const { cx } = await import('.')
    expect(cx('a', false, null, 'b', undefined)).toBe('a b')
  })
})

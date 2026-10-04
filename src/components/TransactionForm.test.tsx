import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionForm } from './TransactionForm'

describe('TransactionForm', () => {
  it('shows an accessible error and does not submit an invalid amount', async () => {
    const onSubmit = vi.fn()
    render(<TransactionForm onSubmit={onSubmit} onCancel={() => {}} />)

    await userEvent.type(screen.getByLabelText('Amount'), 'abc')
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }))

    const input = screen.getByLabelText('Amount')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(/greater than zero/)
    expect(input).toHaveFocus()
  })

  it('submits amounts in minor units and swaps categories when switching to income', async () => {
    const onSubmit = vi.fn()
    render(<TransactionForm defaultDate="2026-03-04" onSubmit={onSubmit} onCancel={() => {}} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Income' }))
    expect(screen.getByLabelText('Category')).toHaveValue('salary')

    await userEvent.type(screen.getByLabelText('Amount'), '1,500.25')
    await userEvent.type(screen.getByLabelText(/Note/), '  Bonus  ')
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }))

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'income',
      amount: 150025,
      categoryId: 'salary',
      date: '2026-03-04',
      note: 'Bonus',
    })
  })

  it('pre-fills when editing', () => {
    render(
      <TransactionForm
        initial={{ id: 'x', type: 'expense', amount: 9950, categoryId: 'transport', date: '2026-01-02', note: 'Cab', createdAt: 0 }}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByLabelText('Amount')).toHaveValue('99.50')
    expect(screen.getByLabelText('Category')).toHaveValue('transport')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })
})

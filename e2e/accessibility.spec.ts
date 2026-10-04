import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

const ROUTES = ['/', '/#/transactions', '/#/budgets', '/#/settings', '/#/components']

for (const theme of ['light', 'dark'] as const) {
  for (const route of ROUTES) {
    test(`${route} has no serious accessibility violations (${theme})`, async ({ app: page }) => {
      await page.emulateMedia({ colorScheme: theme })
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([])
    })
  }
}

test('the add dialog is accessible when open', async ({ app: page }) => {
  await page.getByRole('button', { name: 'Add transaction' }).filter({ visible: true }).first().click()
  await page.getByRole('button', { name: 'Add transaction' }).last().click() // trigger validation errors too
  const results = await new AxeBuilder({ page }).include('dialog[open]').analyze()
  expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
})

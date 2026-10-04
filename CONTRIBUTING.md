# Contributing

## Setup

```bash
npm install
npx playwright install chromium   # once, for end-to-end tests
npm run dev
```

## Before opening a pull request

```bash
npm run check        # lint, typecheck, unit tests
npm run test:e2e     # browser tests (builds the app first)
npm run build && npm run size   # bundle budget
```

CI runs all of these on every pull request and blocks merging if any fail.

## Conventions

- **Logic goes in `src/lib`** as pure, tested functions. Components and stores call into it.
- **UI goes through `src/ui`.** Before adding markup for a button, field, or dialog, use or extend the component library so accessibility wiring stays consistent. New components get an entry on the `/components` page.
- **Money is integer minor units.** Never store or add floats. Format only for display with `formatMoney`.
- **Query by role in tests.** Prefer `getByRole` and `getByLabelText` over test IDs or CSS selectors, so tests also verify accessibility.
- **New dependencies need a reason.** Add a short entry to `docs/DECISIONS.md` covering alternatives and trade-offs, and check the bundle budget.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `perf:`, `chore:`.

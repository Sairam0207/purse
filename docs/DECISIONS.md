# Architecture decisions

Short records of the significant technical choices in Purse: what was chosen, what else was considered, and the trade-offs accepted. Each one is written so it can be revisited when the context changes.

---

## 1. React with TypeScript, built with Vite

**Decision.** React 19 for the UI, TypeScript in strict mode, Vite for dev server and production builds.

**Alternatives.** Angular gives more out of the box (DI, forms, router, HTTP) but is heavier for a small app and opinionated about structure. Svelte and Solid produce smaller bundles but have smaller ecosystems and fewer engineers who know them. Next.js adds server rendering, which this app doesn't need because it has no backend and no SEO requirement.

**Trade-offs.** React's runtime costs roughly 60 kB gzip before any app code. In return there's the largest ecosystem, mature testing tools, and a framework most teams can maintain. TypeScript slows the first draft of code slightly but catches whole classes of bugs, such as passing paise where rupees were expected, and makes refactors safe.

---

## 2. Zustand for state instead of Redux Toolkit or Context

**Decision.** Four small Zustand stores: `ledger` (persisted), `settings` (persisted), `ui`, and `toast`.

**Alternatives.**
- *React Context + useReducer.* No dependency, but every consumer re-renders when any part of the value changes, and persistence would be hand-written.
- *Redux Toolkit.* Excellent devtools and conventions for large teams, but more boilerplate (slices, providers, typed hooks) than this app's size justifies.
- *TanStack Query.* The right tool for server state. There's no server here; if a sync API is added, Query would sit alongside Zustand, not replace it.

**Trade-offs.** Zustand is about 1 kB and supports selector subscriptions, so components re-render only for the slice they read. Its `persist` middleware handles storage and versioning. The cost is fewer enforced conventions than Redux, so the rule here is that business logic lives in `src/lib` as pure functions and stores stay thin.

**Risk and mitigation.** Persisted state is user-controlled and can be corrupt or written by an older version. The ledger store's `merge` validates every record with `isValidTransaction` and drops bad ones instead of crashing (see `ledger.test.ts`).

---

## 3. Writing list virtualization instead of using react-window or TanStack Virtual

**Decision.** A small `useWindowVirtualizer` hook backed by pure functions in `src/lib/virtual.ts`: prefix sums of row heights, then binary search on scroll to find the visible range.

**Alternatives.** `@tanstack/react-virtual` is the strongest option: it handles dynamic measurement, horizontal lists, and many edge cases. `react-window` is smaller but less actively maintained.

**Why build it.** The requirements are narrow: window scrolling, two fixed row heights (day header and transaction), and grouped content. That's about 60 lines, fully unit-tested, with no dependency to audit or upgrade, and behavior the team fully understands.

**When to switch.** If rows need variable measured heights (for example, wrapping notes) or the list moves into a scroll container with sticky headers, adopt TanStack Virtual rather than growing this.

**Result.** With 10,000 transactions the DOM holds fewer than 80 rows at any scroll position. This is verified by `e2e/performance.spec.ts`.

---

## 4. Native `<dialog>` instead of a headless UI library

**Decision.** The `Dialog` component wraps the native `<dialog>` element with `showModal()`.

**Alternatives.** Radix UI and React Aria provide well-tested accessible primitives and support older browsers.

**Trade-offs.** `showModal()` gives focus trapping, Escape to close, an inert background, and `::backdrop` with zero JavaScript dependencies, and it's supported in every current browser. What it doesn't do is pick the right element to focus: it focuses the first focusable element, usually the Close button. The Dialog component compensates with a `data-autofocus` marker. (This was caught by the Playwright suite, not by unit tests, because jsdom doesn't implement `<dialog>`.) If the component library grows into comboboxes, menus, and popovers, React Aria becomes worth its weight.

---

## 5. Recharts for the trend chart

**Decision.** Recharts for the six-month bar chart. The category breakdown and the calendar heatmap are plain HTML and CSS.

**Alternatives.** D3 gives total control but means writing and maintaining axes, scales, and tooltips by hand. Chart.js renders to canvas, which is fast but invisible to screen readers and harder to theme with CSS variables.

**Trade-offs.** Recharts is the largest dependency, at about 100 kB gzip. It's isolated to the Overview route through lazy loading, so other pages never download it. Its SVG output contains focusable elements that confused assistive tech, which was caught by axe in CI. The chart is therefore marked `inert` and the same data is provided as a visually hidden table. Simple visuals that didn't need a charting library (bars, heatmap) don't use one.

---

## 6. Hash routing

**Decision.** `createHashRouter`, giving URLs like `/#/transactions?cat=food`.

**Alternatives.** History-based routing (`/transactions`) gives cleaner URLs but needs the server to rewrite unknown paths to `index.html`. GitHub Pages can't do that without a 404.html redirect workaround.

**Trade-offs.** Hash URLs are less pretty and invisible to servers, which doesn't matter for an app with no SEO needs and no server. Moving to a host with rewrites (Netlify, Vercel, CloudFront) is a one-line change to `createBrowserRouter`.

---

## 7. Money as integer minor units

**Decision.** All amounts are integers in paise or cents, and user input is parsed as strings.

**Why.** Floating point can't represent most decimal fractions: `0.29 * 100` is `28.999999999999996`. Summing thousands of float amounts drifts. Integers are exact, and display formatting happens only at the edge through `Intl.NumberFormat`.

---

## 8. Testing strategy

| Layer | Tool | What it covers |
| --- | --- | --- |
| Unit | Vitest | Pure logic in `src/lib`: money parsing, stats, CSV, fuzzy search, virtualization math. Fast, and the bulk of the tests. |
| Component | React Testing Library | The UI library and forms, tested through roles and labels the way users find them. |
| End to end | Playwright | Real user journeys in a real browser against the production build, on desktop and mobile viewports. |
| Accessibility | axe-core in Playwright | WCAG 2.1 AA checks on every route, in light and dark themes. |
| Performance | Bundle budget script; Playwright | Gzip budgets fail CI if exceeded; the DOM stays small with 10k rows. |

Coverage thresholds (90% lines) are enforced on `src/lib`, `src/ui`, and `src/store`. Page components aren't held to a coverage number because the E2E suite covers them more meaningfully.

The E2E tests pin the clock with `page.clock.setFixedTime`, so date-dependent screens produce identical results on every run.

---

## 9. Supabase for the backend

**Decision.** Supabase: Postgres, Auth, and Realtime. The app talks to it directly from the browser, with Row Level Security enforcing access.

**Alternatives.**
- *A custom API (Node/Express or Spring) plus Postgres.* Full control, but means writing and hosting auth, session handling, an API layer, and realtime, none of which differentiate this product.
- *Firebase.* Similar developer experience, but Firestore is a document store. This data is relational (transactions, budgets, per-user aggregation), and Postgres gives real constraints, SQL, and a standard migration path.
- *AWS Amplify (Cognito, AppSync, DynamoDB).* Powerful and scales well, but heavier to configure for one developer, and DynamoDB access patterns need designing up front.

**Trade-offs.** Supabase is open source and standard Postgres, so the data and schema are portable. The cost of talking to the database directly is that security lives entirely in RLS policies, so they're covered by their own pgTAP test suite in CI. Business rules that must never be bypassed (amount positive, category valid for type) are duplicated as database constraints, not just client validation. If logic outgrows what policies and constraints can express (for example, shared household budgets with roles), add Postgres functions or an Edge Function rather than trusting the client.

**Risk: vendor dependency.** All Supabase access goes through the `RemoteApi` interface in `src/sync/types.ts`. Moving to another backend means writing one adapter class; the sync engine, UI, and tests don't change.

---

## 10. Offline-first sync instead of fetching from the server

**Decision.** The local store stays the source of truth for the UI. Writes go to a persisted outbox that syncs in the background (see `docs/BACKEND.md`).

**Alternatives.** The common pattern is to fetch on each page and write through the API with TanStack Query and optimistic updates. That's simpler, but every screen depends on the network, and edits made offline are lost.

**Trade-offs.** The app keeps its instant feel and works on bad connections, which matters for a "log it the moment you pay" app on mobile data. The costs are real complexity (outbox, cursors, conflict rules) and eventual consistency between devices. The design keeps that complexity contained: it's one engine behind one interface, with 18 unit tests against a fake server and 4 browser tests against the real SDK. Conflict resolution is deliberately simple, last write wins per transaction, because transactions are rarely edited on two devices at once. If that changes, per-field merging or CRDTs would be the next step.

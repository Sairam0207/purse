import { lazy } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useTheme } from './hooks/useTheme'

// Each page is its own chunk; Recharts only loads with the overview.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Budgets = lazy(() => import('./pages/Budgets'))
const Settings = lazy(() => import('./pages/Settings'))
const Components = lazy(() => import('./pages/Components'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Hash routing keeps deep links working on static hosts like GitHub Pages without server rewrites.
const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'transactions', element: <Transactions /> },
      { path: 'budgets', element: <Budgets /> },
      { path: 'settings', element: <Settings /> },
      { path: 'components', element: <Components /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  useTheme()
  return <RouterProvider router={router} />
}

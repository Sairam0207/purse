import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installGlobalHandlers, startWebVitals } from './lib/monitoring'
import { isCloudConfigured } from './sync/config'
import './index.css'

installGlobalHandlers()
void startWebVitals()
// Supabase code is only downloaded when cloud sync is configured for this build.
if (isCloudConfigured) void import('./sync/auth').then((m) => m.initAuth())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Stale-tab recovery: after a redeploy, a tab opened before it holds an old
// bundle whose lazy chunks (e.g. the Excel engine behind Export) no longer
// exist — the import 404s and buttons appear to do nothing. Vite fires
// vite:preloadError for exactly this; reload once to pick up the new build.
// The model survives the reload because it lives in the URL.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const state = window.history.state as { grossReloaded?: boolean } | null
  if (!state?.grossReloaded) {
    window.history.replaceState({ ...(state ?? {}), grossReloaded: true }, '')
    window.location.reload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

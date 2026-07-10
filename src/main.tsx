import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Stale-tab recovery: after a redeploy, a tab opened before it holds an old
// bundle whose lazy chunks (e.g. the Excel engine behind Export) no longer
// exist — the import 404s and buttons appear to do nothing. Vite fires
// vite:preloadError for exactly this; reload once to pick up the new build.
// The model survives the reload because it lives in the URL.
// At most one automatic reload per half-minute (the URL-sync replaceState
// wipes history.state, so the guard lives in sessionStorage). If the chunk
// still fails after the reload, App's ChunkBoundary shows a refresh button.
window.addEventListener('vite:preloadError', (event) => {
  const last = Number(sessionStorage.getItem('gross-chunk-reload') ?? 0)
  if (Date.now() - last > 30_000) {
    event.preventDefault()
    sessionStorage.setItem('gross-chunk-reload', String(Date.now()))
    window.location.reload()
  }
})

// Error beacon: one anonymous count per session when something throws, so
// breakage shows up in the events table instead of nobody's inbox. No stack,
// no URL params, no PII — just the release id, the error name and the page.
// The release prefix (short commit SHA, or 'dev') says WHICH deploy threw it.
const RELEASE = typeof __RELEASE__ === 'string' ? __RELEASE__ : 'dev'
let errorReported = false
const reportClientError = (message: string) => {
  if (errorReported) return
  errorReported = true
  import('./utils/analytics')
    .then(({ logEvent }) => logEvent('client_error', `${RELEASE} ${message}`.slice(0, 90)))
    .catch(() => {})
}
window.addEventListener('error', (e) => {
  reportClientError(String(e?.message ?? 'unknown'))
})
window.addEventListener('unhandledrejection', (e) => {
  reportClientError(String(e?.reason?.message ?? e?.reason ?? 'rejection'))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { useEffect, useRef, lazy, Suspense, Component, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react'
import { useStore } from './store/useStore'
import { decodeStateFromUrl, decodeBlob, encodeStateToUrl } from './utils/urlState'
import { pageIdFromPath, pathForPageId } from './config/pages'
import { applyRouteMeta } from './utils/routeMeta'
import { logEvent } from './utils/analytics'
import Ticker from './components/gross/Ticker'
import GrossNav from './components/gross/GrossNav'
import Home from './pages/Home'

/**
 * GROSS. — view registry. The homepage plus the calculators and the rate card;
 * ids are stable so pre-rebrand share links keep working. Slugs (the clean,
 * indexable URLs) live in config/pages.ts.
 *
 * The homepage is eager (it's the LCP); everything else is a lazy chunk so the
 * first paint doesn't carry eleven calculators. A stale chunk after a redeploy
 * is caught by the vite:preloadError reload in main.tsx.
 */
const PAGES: Record<string, ComponentType | LazyExoticComponent<ComponentType>> = {
  'home': Home,
  'products': lazy(() => import('./pages/Shelf')),
  'portfolio': lazy(() => import('./calculators/Portfolio')),
  'retailer-pnl': lazy(() => import('./calculators/RetailerPnL')),
  'waterfall': lazy(() => import('./calculators/Waterfall')),
  'min-margin': lazy(() => import('./calculators/MinimumMargin')),
  'listing-model': lazy(() => import('./calculators/ListingModel')),
  'trade-spend': lazy(() => import('./calculators/TradeSpendROI')),
  'stock-forecast': lazy(() => import('./calculators/StockForecast')),
  'amazon-fba': lazy(() => import('./calculators/AmazonFBA')),
  'tiktok-shop': lazy(() => import('./calculators/TikTokShop')),
  'cross-channel': lazy(() => import('./calculators/CrossChannel')),
  'cash-flow': lazy(() => import('./calculators/CashFlow')),
  'ledger': lazy(() => import('./pages/Ledger')),
  'ledger-001': lazy(() => import('./pages/LedgerIssue')),
  'till': lazy(() => import('./pages/Till')),
  'guides': lazy(() => import('./pages/Guides')),
  'guide-retailer-margin': lazy(() => import('./pages/GuidePage')),
  'guide-gross-to-net': lazy(() => import('./pages/GuidePage')),
  'guide-amazon-fba-fees-uk': lazy(() => import('./pages/GuidePage')),
  'guide-fmcg-margin-benchmarks': lazy(() => import('./pages/GuidePage')),
  'guide-payment-terms-uk-grocery': lazy(() => import('./pages/GuidePage')),
  'guide-what-a-promo-costs': lazy(() => import('./pages/GuidePage')),
  'methodology': lazy(() => import('./pages/Methodology')),
}

/** Receipt-paper placeholder while a lazy page chunk loads (usually <100ms). */
function PageLoading() {
  return (
    <div className="min-h-[60vh] bg-receipt flex items-start justify-center pt-24">
      <span className="font-mono text-[13px] tracking-[0.1em] opacity-50">TOTTING UP…</span>
    </div>
  )
}

/**
 * Backstop for a lazy chunk that fails to load (a tab from before a redeploy
 * asking for chunks that no longer exist). main.tsx reloads once automatically;
 * if the page still cannot load, show a way out instead of TOTTING UP… forever.
 * The model survives the refresh because it lives in the URL.
 */
class ChunkBoundary extends Component<{ children: ReactNode; pageId: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidUpdate(prev: { pageId: string }) {
    // A different page may load fine — clear the error when navigating away
    if (prev.pageId !== this.props.pageId && this.state.failed) this.setState({ failed: false })
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="min-h-[60vh] bg-receipt flex flex-col items-center justify-start pt-24 gap-5 px-6 text-center">
        <span className="font-mono text-[13px] tracking-[0.1em]">
          This page did not load. The site has been restocked since you opened this tab.
        </span>
        <button
          onClick={() => window.location.reload()}
          className="border-2 border-ink bg-ink text-bile font-mono text-[13px] tracking-[0.1em] px-6 py-3 cursor-pointer hover:bg-bile hover:text-ink"
        >
          REFRESH — YOUR NUMBERS ARE SAFE
        </button>
      </div>
    )
  }
}

function App() {
  const activeCalculator = useStore((s) => s.activeCalculator)
  const initialMount = useRef(true)
  // Set when a change came from Back/Forward, so we don't push it back on.
  const fromPopstate = useRef(false)

  // Restore state on load. A short link (/s/<id>) resolves to a blob first;
  // otherwise a shared `?s=` blob wins (full model); otherwise the clean path
  // decides the tool (deep links from search / a pasted URL).
  useEffect(() => {
    const short = window.location.pathname.match(/^\/s\/([a-z0-9]{4,16})$/)
    if (short) {
      void (async () => {
        const { resolveShortLink } = await import('./store/cloud')
        const blob = await resolveShortLink(short[1])
        const decoded = blob ? decodeBlob(blob) : null
        if (decoded) {
          useStore.setState({
            products: decoded.products,
            activeProductId: decoded.activeProductId,
            activeCalculator: decoded.activeCalculator in PAGES ? decoded.activeCalculator : 'home',
            scenario: decoded.scenario,
          })
        } else {
          // Dead or mistyped link — land on home rather than a broken path
          useStore.setState({ activeCalculator: 'home' })
          window.history.replaceState(null, '', '/')
        }
      })()
      return
    }
    const decoded = decodeStateFromUrl()
    if (decoded) {
      useStore.setState({
        products: decoded.products,
        activeProductId: decoded.activeProductId,
        activeCalculator: decoded.activeCalculator in PAGES ? decoded.activeCalculator : 'home',
        scenario: decoded.scenario,
      })
    } else {
      const fromPath = pageIdFromPath(window.location.pathname)
      if (fromPath && fromPath in PAGES) {
        useStore.setState({ activeCalculator: fromPath })
      }
    }
  }, [])

  // Count distinct visits (once per browser session) — the Ledger nudge under
  // the calculators fires on the third visit. Storage failures are ignored.
  useEffect(() => {
    try {
      if (!sessionStorage.getItem('gross-session')) {
        sessionStorage.setItem('gross-session', '1')
        const n = Number(localStorage.getItem('gross-visits') ?? 0) + 1
        localStorage.setItem('gross-visits', String(n))
      }
    } catch { /* private mode etc — no nudge, no harm */ }
  }, [])

  // Back/Forward stay inside GROSS: restore the tool from the history entry
  // instead of leaving the site.
  useEffect(() => {
    const onPop = () => {
      const current = useStore.getState().activeCalculator
      const decoded = decodeStateFromUrl()
      if (decoded) {
        const target = decoded.activeCalculator in PAGES ? decoded.activeCalculator : 'home'
        if (target !== current) fromPopstate.current = true
        useStore.setState({
          products: decoded.products,
          activeProductId: decoded.activeProductId,
          activeCalculator: target,
          scenario: decoded.scenario,
        })
      } else {
        const id = pageIdFromPath(window.location.pathname)
        const target = id && id in PAGES ? id : 'home'
        if (target !== current) fromPopstate.current = true
        useStore.setState({ activeCalculator: target })
      }
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Keep the tab title, meta and OG tags in step with the active view, count
  // the view, and push a history entry so Back returns to the previous tool.
  useEffect(() => {
    applyRouteMeta(activeCalculator)
    logEvent('view', activeCalculator)
    if (initialMount.current) {
      initialMount.current = false
      return
    }
    if (fromPopstate.current) {
      fromPopstate.current = false
      return
    }
    const path = pathForPageId(activeCalculator)
    if (window.location.pathname !== path) {
      // Clean path now; the debounced sync below re-adds the ?s= share blob.
      window.history.pushState(null, '', path)
    }
  }, [activeCalculator])

  // Keep the address bar in sync with the full model (debounced replaceState):
  // a refresh never loses work, and the URL is always the share link.
  // State stays in memory + URL only — no localStorage, by design.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = useStore.subscribe((state) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const url = encodeStateToUrl(
          state.products,
          state.activeProductId,
          state.activeCalculator,
          state.scenario,
        )
        window.history.replaceState(null, '', url)
      }, 400)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [])

  const Page = PAGES[activeCalculator] ?? Home

  return (
    <div className="min-h-screen bg-receipt text-ink font-body">
      <Ticker />
      <GrossNav />
      <main>
        <ChunkBoundary pageId={activeCalculator}>
          <Suspense fallback={<PageLoading />}>
            <Page />
          </Suspense>
        </ChunkBoundary>
      </main>
    </div>
  )
}

export default App

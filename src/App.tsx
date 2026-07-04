import { useEffect, useRef } from 'react'
import { useStore } from './store/useStore'
import { decodeStateFromUrl, encodeStateToUrl } from './utils/urlState'
import { pageIdFromPath, pathForPageId } from './config/pages'
import { applyRouteMeta } from './utils/routeMeta'
import { logEvent } from './store/cloud'
import Ticker from './components/gross/Ticker'
import GrossNav from './components/gross/GrossNav'
import Home from './pages/Home'
import Shelf from './pages/Shelf'
import Methodology from './pages/Methodology'
import Portfolio from './calculators/Portfolio'
import RetailerPnL from './calculators/RetailerPnL'
import Waterfall from './calculators/Waterfall'
import MinimumMargin from './calculators/MinimumMargin'
import ListingModel from './calculators/ListingModel'
import TradeSpendROI from './calculators/TradeSpendROI'
import StockForecast from './calculators/StockForecast'
import AmazonFBA from './calculators/AmazonFBA'
import TikTokShop from './calculators/TikTokShop'
import CrossChannel from './calculators/CrossChannel'

/**
 * GROSS. — view registry. The homepage plus the calculators and the rate card;
 * ids are stable so pre-rebrand share links keep working. Slugs (the clean,
 * indexable URLs) live in config/pages.ts.
 */
const PAGES: Record<string, () => React.JSX.Element> = {
  'home': Home,
  'products': Shelf,
  'portfolio': Portfolio,
  'retailer-pnl': RetailerPnL,
  'waterfall': Waterfall,
  'min-margin': MinimumMargin,
  'listing-model': ListingModel,
  'trade-spend': TradeSpendROI,
  'stock-forecast': StockForecast,
  'amazon-fba': AmazonFBA,
  'tiktok-shop': TikTokShop,
  'cross-channel': CrossChannel,
  'methodology': Methodology,
}

function App() {
  const activeCalculator = useStore((s) => s.activeCalculator)
  const initialMount = useRef(true)
  // Set when a change came from Back/Forward, so we don't push it back on.
  const fromPopstate = useRef(false)

  // Restore state on load. A shared `?s=` blob wins (full model). Otherwise the
  // clean path decides the tool (deep links from search / a pasted URL).
  useEffect(() => {
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
        <Page />
      </main>
    </div>
  )
}

export default App

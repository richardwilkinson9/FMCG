import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { decodeStateFromUrl, encodeStateToUrl } from './utils/urlState'
import { pageIdFromPath } from './config/pages'
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

  // Keep the tab title, meta and OG tags in step with the active view, and
  // count the view (anonymous, fire-and-forget).
  useEffect(() => {
    applyRouteMeta(activeCalculator)
    logEvent('view', activeCalculator)
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

import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { decodeStateFromUrl } from './utils/urlState'
import Ticker from './components/gross/Ticker'
import GrossNav from './components/gross/GrossNav'
import Home from './pages/Home'
import Shelf from './pages/Shelf'
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
 * GROSS. — view registry. The homepage plus nine calculators; ids are stable
 * so pre-rebrand share links keep working.
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
}

function App() {
  const activeCalculator = useStore((s) => s.activeCalculator)

  // Restore full state (products + all calculator settings) from a shared URL
  useEffect(() => {
    const decoded = decodeStateFromUrl()
    if (decoded) {
      useStore.setState({
        products: decoded.products,
        activeProductId: decoded.activeProductId,
        activeCalculator: decoded.activeCalculator in PAGES ? decoded.activeCalculator : 'home',
        scenario: decoded.scenario,
      })
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

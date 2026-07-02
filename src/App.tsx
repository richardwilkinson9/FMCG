import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { decodeStateFromUrl } from './utils/urlState'
import ProductManager from './components/ProductManager'
import ShareExport from './components/ShareExport'
import RetailerPnL from './calculators/RetailerPnL'
import MinimumMargin from './calculators/MinimumMargin'
import ListingModel from './calculators/ListingModel'
import TradeSpendROI from './calculators/TradeSpendROI'
import StockForecast from './calculators/StockForecast'
import AmazonFBA from './calculators/AmazonFBA'
import TikTokShop from './calculators/TikTokShop'
import CrossChannel from './calculators/CrossChannel'

const CALCULATORS = [
  { id: 'retailer-pnl', label: 'Retailer P&L', group: 'Grocery', component: RetailerPnL },
  { id: 'min-margin', label: 'Min Margin', group: 'Grocery', component: MinimumMargin },
  { id: 'listing-model', label: 'Listing Model', group: 'Grocery', component: ListingModel },
  { id: 'trade-spend', label: 'Trade Spend ROI', group: 'Grocery', component: TradeSpendROI },
  { id: 'stock-forecast', label: 'Stock Forecast', group: 'Grocery', component: StockForecast },
  { id: 'amazon-fba', label: 'Amazon FBA', group: 'Marketplace', component: AmazonFBA },
  { id: 'tiktok-shop', label: 'TikTok Shop', group: 'Marketplace', component: TikTokShop },
  { id: 'cross-channel', label: 'Cross-Channel', group: 'Compare', component: CrossChannel },
]

function App() {
  const { activeCalculator, setActiveCalculator } = useStore()

  // Restore state from URL on first load
  useEffect(() => {
    const decoded = decodeStateFromUrl()
    if (decoded) {
      useStore.setState({
        products: decoded.products,
        activeProductId: decoded.activeProductId,
        activeCalculator: decoded.activeCalculator,
      })
    }
  }, [])

  const ActiveCalc = CALCULATORS.find((c) => c.id === activeCalculator)?.component ?? RetailerPnL

  const groups = [...new Set(CALCULATORS.map((c) => c.group))]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">FMCG Maths</h1>
              <p className="text-sm text-slate-500 mt-0.5">Commercial calculators for UK brand teams</p>
            </div>
            <ShareExport />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Product spine */}
        <ProductManager />

        {/* Calculator tabs */}
        <div className="bg-white rounded-xl border border-slate-200">
          <nav className="border-b border-slate-200 px-4 pt-4 overflow-x-auto">
            <div className="flex gap-6">
              {groups.map((group) => (
                <div key={group} className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">{group}</span>
                  <div className="flex gap-1 mb-[-1px]">
                    {CALCULATORS.filter((c) => c.group === group).map((calc) => (
                      <button
                        key={calc.id}
                        onClick={() => setActiveCalculator(calc.id)}
                        className={`px-3 py-2 text-sm rounded-t-lg border border-b-0 transition-colors whitespace-nowrap ${
                          activeCalculator === calc.id
                            ? 'bg-white text-blue-700 border-slate-200 font-medium'
                            : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {calc.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Active calculator */}
          <div className="p-6">
            <ActiveCalc />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-400 py-4">
          FMCG Maths — free tools for UK brand teams. All calculations run in your browser. Nothing is stored on a server.
        </footer>
      </main>
    </div>
  )
}

export default App

import { useState } from 'react'
import { useStore } from '../store/useStore'
import { tiktokShopMargin, formatGBP, formatPercent } from '../utils/calculations'
import { TIKTOK_SHOP_DEFAULTS } from '../config/fees'
import FeeInput from '../components/FeeInput'
import ResultCard from '../components/ResultCard'

export default function TikTokShop() {
  const product = useStore((s) => s.getActiveProduct())
  const [platformComm, setPlatformComm] = useState(TIKTOK_SHOP_DEFAULTS.platformCommission.value)
  const [affiliateComm, setAffiliateComm] = useState(TIKTOK_SHOP_DEFAULTS.affiliateCommission.value)
  const [perOrderFee, setPerOrderFee] = useState(TIKTOK_SHOP_DEFAULTS.perOrderFee.value)
  const [refundAdmin, setRefundAdmin] = useState(TIKTOK_SHOP_DEFAULTS.refundAdminPercent.value)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const result = tiktokShopMargin(product, {
    platformCommission: platformComm,
    affiliateCommission: affiliateComm,
    perOrderFee,
    refundAdminPercent: refundAdmin,
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">TikTok Shop Margin Calculator</h3>
        <p className="text-sm text-slate-500">
          See your true margin after TikTok's platform commission, affiliate fees and other charges.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <FeeInput fee={TIKTOK_SHOP_DEFAULTS.platformCommission} value={platformComm} onChange={setPlatformComm} isPercent />
        <FeeInput fee={TIKTOK_SHOP_DEFAULTS.affiliateCommission} value={affiliateComm} onChange={setAffiliateComm} isPercent />
        <FeeInput fee={TIKTOK_SHOP_DEFAULTS.perOrderFee} value={perOrderFee} onChange={setPerOrderFee} />
        <FeeInput fee={TIKTOK_SHOP_DEFAULTS.refundAdminPercent} value={refundAdmin} onChange={setRefundAdmin} isPercent />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ResultCard label="Selling price ex-VAT" value={formatGBP(result.sellingPriceExVat)} />
        <ResultCard label="Platform fee" value={formatGBP(result.platformFee)} />
        <ResultCard label="Affiliate fee" value={formatGBP(result.affiliateFee)} />
        <ResultCard label="Per-order fee" value={formatGBP(result.perOrderFee)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ResultCard label="Refund admin cost" value={formatGBP(result.refundCost)} />
        <ResultCard label="Total fees" value={formatGBP(result.totalFees)} />
        <ResultCard
          label="Gross profit/unit"
          value={formatGBP(result.grossProfit)}
          highlight={result.grossProfit > 0}
          negative={result.grossProfit < 0}
        />
        <ResultCard
          label="Gross margin %"
          value={formatPercent(result.grossMarginPercent)}
          highlight={result.grossMarginPercent > 0}
          negative={result.grossMarginPercent < 0}
        />
      </div>
    </div>
  )
}

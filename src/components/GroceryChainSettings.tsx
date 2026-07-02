import { useStore } from '../store/useStore'
import { GROCERY_DEFAULTS } from '../config/fees'
import FeeInput from './FeeInput'
import Tooltip from './Tooltip'

/**
 * The grocery chain assumptions — retailer margin and optional wholesaler.
 * Shared by every grocery calculator and the Cross-Channel view, and bound to
 * the store so a change here is instantly reflected on every tab.
 */
export default function GroceryChainSettings() {
  const grocery = useStore((s) => s.scenario.grocery)
  const updateScenario = useStore((s) => s.updateScenario)

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 items-end">
      <div className="w-44">
        <FeeInput
          fee={GROCERY_DEFAULTS.retailerMarginPercent}
          value={grocery.retailerMargin}
          onChange={(v) => updateScenario('grocery', { retailerMargin: v })}
          isPercent
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer pb-2.5">
        <input
          type="checkbox"
          checked={grocery.wholesalerEnabled}
          onChange={(e) => updateScenario('grocery', { wholesalerEnabled: e.target.checked })}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-slate-700">
          Via wholesaler
          <Tooltip text={GROCERY_DEFAULTS.wholesalerMarginPercent.note} />
        </span>
      </label>

      {grocery.wholesalerEnabled && (
        <div className="w-44">
          <FeeInput
            fee={GROCERY_DEFAULTS.wholesalerMarginPercent}
            value={grocery.wholesalerMargin}
            onChange={(v) => updateScenario('grocery', { wholesalerMargin: v })}
            isPercent
          />
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useSession } from '../store/session'
import type { WeeklyStatsRow } from '../store/cloud'
import GrossFooter from '../components/gross/GrossFooter'

/**
 * THE TILL — the owner's numbers, on a phone, without the Supabase dashboard.
 * Unlisted and noindexed. Signed out (or signed in as anyone else) the view
 * returns nothing and the page says so — the RLS does the gatekeeping
 * (SETUP_SUPABASE.md §4).
 */
export default function Till() {
  const session = useSession()
  const [rows, setRows] = useState<WeeklyStatsRow[] | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle')

  useEffect(() => {
    if (!session) return
    setState('loading')
    void import('../store/cloud').then(async ({ fetchWeeklyStats }) => {
      const data = await fetchWeeklyStats()
      setRows(data)
      setState(data ? 'done' : 'failed')
    })
  }, [session])

  const totals = rows?.reduce(
    (a, r) => ({
      views: a.views + r.views,
      exports: a.exports + r.exports,
      emails: a.emails + r.export_emails + r.ledger_signups,
    }),
    { views: 0, exports: 0, emails: 0 },
  )

  return (
    <div className="bg-receipt text-ink font-body min-h-screen">
      <div className="py-[clamp(26px,4vw,52px)] px-[clamp(20px,4vw,44px)]">
        <div className="max-w-[720px] mx-auto">
          <div className="font-mono text-[11px] tracking-[0.1em] opacity-60">SKU 50 14358 · BACK OFFICE</div>
          <h1 className="font-display text-[clamp(40px,7vw,72px)] leading-[0.92] tracking-[-0.01em] mt-2">The Till</h1>
          <p className="text-[15px] mt-2">The week's takings. Owner's eyes only — the database checks, not the page.</p>

          <div className="border-2 border-ink bg-white mt-6 p-[clamp(18px,3vw,28px)] font-mono">
            {!session ? (
              <div className="text-[13px]">
                Not signed in. Use SIGN IN in the nav — the archive login is the till key.
              </div>
            ) : state === 'loading' || state === 'idle' ? (
              <div className="text-[13px] opacity-60">Counting…</div>
            ) : state === 'failed' || !rows ? (
              <div className="text-[13px]">
                The database said no. Either the weekly_stats view isn't set up
                (SETUP_SUPABASE.md §4) or this isn't the owner's login.
              </div>
            ) : rows.length === 0 ? (
              <div className="text-[13px]">
                No rows. Either nothing has happened yet, or this login isn't on
                the till's list (SETUP_SUPABASE.md §4).
              </div>
            ) : (
              <>
                {totals && (
                  <div className="flex gap-6 border-b-2 border-ink pb-3 mb-3 text-[13px]">
                    <span><span className="font-bold text-[18px]">{totals.views}</span> views</span>
                    <span><span className="font-bold text-[18px]">{totals.exports}</span> exports</span>
                    <span><span className="font-bold text-[18px]">{totals.emails}</span> emails</span>
                    <span className="opacity-60 self-end">last {rows.length} wks</span>
                  </div>
                )}
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Weekly stats">
                  <table className="w-full text-[12px] border-collapse min-w-[560px]">
                    <thead>
                      <tr className="border-b-2 border-ink text-[10px] tracking-[0.08em] opacity-60">
                        <th scope="col" className="text-left py-1.5 pr-2 font-normal">WEEK OF</th>
                        <th scope="col" className="text-right py-1.5 px-2 font-normal">VIEWS</th>
                        <th scope="col" className="text-right py-1.5 px-2 font-normal">SHARES</th>
                        <th scope="col" className="text-right py-1.5 px-2 font-normal">EXPORTS</th>
                        <th scope="col" className="text-right py-1.5 px-2 font-normal">EXPORT EMAILS</th>
                        <th scope="col" className="text-right py-1.5 px-2 font-normal">SIGNUPS</th>
                        <th scope="col" className="text-right py-1.5 pl-2 font-normal">LINK OPENS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.week} className="border-b border-dotted border-ink">
                          <td className="py-1 pr-2 font-bold">{r.week}</td>
                          <td className="text-right py-1 px-2">{r.views}</td>
                          <td className="text-right py-1 px-2">{r.shares}</td>
                          <td className="text-right py-1 px-2">{r.exports}</td>
                          <td className="text-right py-1 px-2">{r.export_emails}</td>
                          <td className="text-right py-1 px-2">{r.ledger_signups}</td>
                          <td className="text-right py-1 pl-2">{r.shortlink_opens}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          <div className="font-mono text-[10px] mt-3 opacity-60">
            Cookieless counts from the events table. The full funnel SQL lives in SETUP_SUPABASE.md §3.
          </div>
        </div>
      </div>
      <GrossFooter />
    </div>
  )
}

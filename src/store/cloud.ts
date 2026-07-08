import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'
import type { Product } from '../types/product'
import type { Scenario } from '../store/scenario'
import { SUPABASE_URL, SUPABASE_KEY } from '../config/supabase'
import { type SavedModel, listArchive, deleteFromArchive, hydrateSavedModel } from './archive'

/**
 * The cloud layer — Supabase magic-link auth + the synced Archive.
 *
 * Signed out: the Archive is localStorage (see archive.ts). Signed in: the
 * Archive is the `models` table, RLS-scoped to the user; every save INSERTS
 * (never updates), so re-saving a name builds version history for free.
 * On sign-in, local records migrate up once and the local copies are removed.
 *
 * Every call fails soft — the UI shows a state, nothing throws to the page.
 */

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY)
  }
  return client
}

/** Cloud calls must never hang the UI — fail soft after a deadline. */
async function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, fallback: T, ms = 8000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function sendMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await withTimeout(
      supabase().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      }),
      { error: { message: 'timeout' } } as Awaited<ReturnType<ReturnType<typeof supabase>['auth']['signInWithOtp']>>,
    )
    return result.error ? { ok: false, error: result.error.message } : { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network' }
  }
}

export async function getSession(): Promise<Session | null> {
  try {
    const { data } = await supabase().auth.getSession()
    return data.session
  } catch {
    return null
  }
}

export function onAuthChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase().auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export async function signOut(): Promise<void> {
  try {
    await supabase().auth.signOut()
  } catch {
    // already signed out or unreachable — either way, the UI resets
  }
}

// ── The synced Archive ───────────────────────────────────────────────────────

export interface CloudModel {
  id: string
  name: string
  saved_at: string
  payload: { products: Product[]; scenario: Scenario }
}

/** All the user's saved versions, newest first. */
export async function cloudList(): Promise<{ ok: boolean; models: SavedModel[] }> {
  try {
    const { data, error } = await withTimeout(
      supabase()
        .from('models')
        .select('id,name,saved_at,payload')
        .order('saved_at', { ascending: false }),
      { data: null, error: { message: 'timeout' } } as never,
    )
    if (error || !data) return { ok: false, models: [] }
    const models: SavedModel[] = (data as CloudModel[]).map((m) => ({
      id: m.id,
      name: m.name,
      savedAt: m.saved_at,
      products: m.payload?.products ?? [],
      scenario: m.payload?.scenario as Scenario,
    }))
    return { ok: true, models }
  } catch {
    return { ok: false, models: [] }
  }
}

/** Every save is an INSERT — same name again = a new version of that model. */
export async function cloudSave(
  name: string,
  products: Product[],
  scenario: Scenario,
): Promise<{ ok: boolean }> {
  try {
    const { error } = await withTimeout(
      supabase().from('models').insert({
        name: name.trim() || 'Untitled model',
        payload: { products, scenario },
      }),
      { error: { message: 'timeout' } } as never,
    )
    return { ok: !error }
  } catch {
    return { ok: false }
  }
}

export async function cloudDelete(id: string): Promise<{ ok: boolean }> {
  try {
    const { error } = await withTimeout(
      supabase().from('models').delete().eq('id', id),
      { error: { message: 'timeout' } } as never,
    )
    return { ok: !error }
  } catch {
    return { ok: false }
  }
}

/** One-time push of this browser's local archive into the account. */
export async function migrateLocalToCloud(): Promise<number> {
  const local = listArchive()
  let migrated = 0
  for (const m of local) {
    const { products, scenario } = hydrateSavedModel(m)
    const { ok } = await cloudSave(m.name, products, scenario)
    if (ok) {
      deleteFromArchive(m.id)
      migrated++
    }
  }
  return migrated
}

// ── Anonymous usage counts ───────────────────────────────────────────────────

/**
 * Fire-and-forget event counter. No cookies, no user id, no personal data —
 * just {name, slug, timestamp} so we can see which tools get used and what
 * drives sign-ups. Never awaited, never throws, insert-only (the public key
 * can't read the table back). "This is a website."
 */
export function logEvent(name: string, slug = ''): void {
  try {
    void supabase()
      .from('events')
      .insert({ name, slug })
      .then(
        () => {},
        () => {},
      )
  } catch {
    // analytics must never affect the page
  }
}

// ── The Till (owner stats) ───────────────────────────────────────────────────
// Reads the weekly_stats view. RLS restricts it to the owner's signed-in email
// (SETUP_SUPABASE.md §4) — everyone else gets an empty result, which the page
// reports honestly.

export interface WeeklyStatsRow {
  week: string
  views: number
  shares: number
  exports: number
  export_emails: number
  ledger_signups: number
  shortlink_opens: number
}

export async function fetchWeeklyStats(): Promise<WeeklyStatsRow[] | null> {
  try {
    const { data, error } = await withTimeout(
      supabase().from('weekly_stats').select('*').order('week', { ascending: false }).limit(12),
      { data: null, error: { message: 'timeout' } } as never,
    )
    if (error || !data) return null
    return data as WeeklyStatsRow[]
  } catch {
    return null
  }
}

// ── Short share links ────────────────────────────────────────────────────────
// getgross.co.uk/s/<id> instead of a 2,000-character blob. The table stores the
// blob; opens are counted through the events table ('shortlink_open', id) so
// nothing here is updatable by the public key. Fail-soft: callers fall back to
// the long ?s= link if this returns null.

const SHORT_ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no 0/O/1/l/i

function shortId(len = 7): string {
  const out: string[] = []
  const rnd = new Uint32Array(len)
  crypto.getRandomValues(rnd)
  for (let i = 0; i < len; i++) out.push(SHORT_ID_ALPHABET[rnd[i] % SHORT_ID_ALPHABET.length])
  return out.join('')
}

export async function createShortLink(blob: string, tool: string, source = 'site'): Promise<string | null> {
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const id = shortId()
      const { error } = await withTimeout(
        supabase().from('share_links').insert({ id, blob, tool, source }),
        { error: { message: 'timeout', code: 'timeout' } } as never,
        2500,
      )
      if (!error) return id
      if (error.code !== '23505') return null // only retry on an id collision
    }
    return null
  } catch {
    return null
  }
}

export async function resolveShortLink(id: string): Promise<string | null> {
  try {
    const { data, error } = await withTimeout(
      supabase().from('share_links').select('blob').eq('id', id).maybeSingle(),
      { data: null, error: { message: 'timeout' } } as never,
      6000,
    )
    if (error || !data?.blob) return null
    logEvent('shortlink_open', id)
    return data.blob as string
  } catch {
    return null
  }
}

// ── The Union ────────────────────────────────────────────────────────────────

export async function unionSignup(email: string): Promise<{ ok: boolean }> {
  try {
    const { error } = await withTimeout(
      supabase().from('union_signups').insert({ email: email.trim() }),
      { error: { message: 'timeout', code: 'timeout' } } as never,
    )
    // A duplicate signup (unique violation) still counts as signed up
    return { ok: !error || error.code === '23505' }
  } catch {
    return { ok: false }
  }
}

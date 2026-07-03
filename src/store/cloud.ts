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

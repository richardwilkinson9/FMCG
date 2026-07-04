import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

/**
 * Shared auth-session state for the whole UI (nav badge, save prompts, Shelf).
 *
 * The cloud layer — and the Supabase client inside it — loads lazily on the
 * first component that asks, so the first paint stays light. One subscription
 * feeds every consumer; everything fails soft to "signed out".
 */

let current: Session | null = null
let started = false
const subscribers = new Set<(s: Session | null) => void>()

function broadcast(s: Session | null) {
  current = s
  subscribers.forEach((fn) => fn(s))
}

function start() {
  if (started) return
  started = true
  import('./cloud')
    .then(async (cloud) => {
      broadcast(await cloud.getSession())
      cloud.onAuthChange(broadcast)
    })
    .catch(() => {
      // offline / blocked — stay signed out
    })
}

/** The current session, or null. Subscribes the component to auth changes. */
export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(current)
  useEffect(() => {
    start()
    subscribers.add(setSession)
    setSession(current)
    return () => {
      subscribers.delete(setSession)
    }
  }, [])
  return session
}

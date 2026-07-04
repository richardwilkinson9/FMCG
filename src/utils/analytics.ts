/**
 * Fire-and-forget analytics that never weighs down the first paint: the cloud
 * layer (and the Supabase client inside it) loads lazily on the first event,
 * after the page is interactive. Failures are swallowed — analytics must never
 * affect the site.
 */
export function logEvent(name: string, slug = ''): void {
  import('../store/cloud')
    .then((m) => m.logEvent(name, slug))
    .catch(() => {})
}

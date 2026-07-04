import { pageById } from '../config/pages'

/**
 * Update the document <title> and meta/OG tags for the active view.
 *
 * Social scrapers that don't run JS read the prerendered per-route HTML
 * (see scripts/prerender.mjs); this keeps the tags correct for users, in-app
 * navigation, and JS-aware crawlers.
 */

const SITE = 'https://getgross.co.uk'

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function applyRouteMeta(pageId: string): void {
  const meta = pageById(pageId)
  if (!meta) return
  const slug = meta.slug ? `${meta.slug}` : ''
  const url = slug ? `${SITE}/${slug}` : SITE
  const ogImage = `${SITE}/og/${meta.slug || 'home'}.png`

  document.title = meta.seoTitle
  setMeta('meta[name="description"]', 'name', 'description', meta.description)
  setMeta('meta[property="og:title"]', 'property', 'og:title', meta.seoTitle)
  setMeta('meta[property="og:description"]', 'property', 'og:description', meta.description)
  setMeta('meta[property="og:url"]', 'property', 'og:url', url)
  setMeta('meta[property="og:image"]', 'property', 'og:image', ogImage)
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.seoTitle)
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description)
  setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage)

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    document.head.appendChild(canonical)
  }
  canonical.setAttribute('href', url)
}

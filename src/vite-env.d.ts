/// <reference types="vite/client" />

/**
 * Build-time release id, injected by Vite `define` in vite.config.ts from
 * VERCEL_GIT_COMMIT_SHA (first 7 chars), falling back to 'dev' locally. Used to
 * tag the anonymous client_error beacon so a runtime error can be traced to the
 * deploy that threw it. Always a string — never read before it's replaced.
 */
declare const __RELEASE__: string

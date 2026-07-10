/// <reference types="node" />
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The voice, enforced by machine. CLAUDE.md bans these words from any copy:
 * empower, unlock, seamless, solution, journey, supercharge, elevate.
 * This walks every file that carries user-facing strings and fails the build
 * if one sneaks in — suffixed forms included (empowering, unlocked, journeys).
 */

const BANNED = /\b(empower|unlock|seamless|supercharge|elevate)(s|ed|ing|ment|ly)?\b|\b(solution|journey)s?\b/i

const COPY_ROOTS = ['src/config', 'src/pages', 'src/components', 'src/App.tsx', 'index.html']

function walk(path: string): string[] {
  if (statSync(path).isFile()) return [path]
  return readdirSync(path).flatMap((entry: string) => walk(join(path, entry)))
}

describe('the voice', () => {
  it('no banned words in any copy-bearing file', () => {
    const offenders: string[] = []
    for (const root of COPY_ROOTS) {
      for (const file of walk(root)) {
        if (file.includes('.test.')) continue
        const lines = readFileSync(file, 'utf8').split('\n')
        lines.forEach((line: string, i: number) => {
          const hit = line.match(BANNED)
          if (hit) offenders.push(`${file}:${i + 1} — "${hit[0]}"`)
        })
      }
    }
    expect(offenders).toEqual([])
  })
})

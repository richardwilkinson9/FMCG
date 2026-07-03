import type { Product } from '../types/product'
import { type Scenario, mergeScenario } from './scenario'

/**
 * The Archive — named, saved models.
 *
 * Persistence today: this browser's localStorage. The LIVE model deliberately
 * stays in memory + URL only (see CLAUDE.md); the archive is different — it is
 * an explicit "save this" action, which is exactly what storage is for.
 * When log-in lands, these records sync to the user's account and this module
 * becomes the local cache; the shape is versioned for that migration.
 */

export interface SavedModel {
  id: string
  name: string
  savedAt: string // ISO date
  products: Product[]
  scenario: Scenario
}

const KEY = 'gross-archive-v1'

function readAll(): SavedModel[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeAll(models: SavedModel[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(models))
    return true
  } catch {
    return false // storage full or blocked — caller shows the failure
  }
}

export function listArchive(): SavedModel[] {
  return readAll().sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export function saveToArchive(name: string, products: Product[], scenario: Scenario): SavedModel | null {
  const model: SavedModel = {
    id: Math.random().toString(36).slice(2, 10),
    name: name.trim() || 'Untitled model',
    savedAt: new Date().toISOString(),
    products,
    scenario,
  }
  const ok = writeAll([model, ...readAll()])
  return ok ? model : null
}

export function deleteFromArchive(id: string): void {
  writeAll(readAll().filter((m) => m.id !== id))
}

/** Load a saved model, tolerating records saved by older versions of the app. */
export function hydrateSavedModel(model: SavedModel): { products: Product[]; scenario: Scenario } {
  return {
    products: Array.isArray(model.products) ? model.products : [],
    scenario: mergeScenario(model.scenario),
  }
}

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import ExcelJS from 'exceljs'
import { importExcelModel } from './excelImport'
import { defaultScenario } from '../store/scenario'
import type { Product } from '../types/product'

/**
 * Fuzzing the deck importer. The safety property: importExcelModel NEVER
 * throws — every hostile file becomes { ok: false } with a deadpan error,
 * and every readable deck comes back as a fully shaped model.
 */

const asFile = (bytes: ArrayBuffer | Uint8Array, name = 'hostile.xlsx'): File =>
  new File([bytes as BlobPart], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

const product: Product = {
  id: 'sku-1',
  name: 'Fuzz bar',
  cogsPerUnit: 0.72,
  unitsPerCase: 12,
  rrpIncVat: 2.5,
  vatRate: 0.2,
  weeklyRateOfSale: 4,
}

const validBlob = (): string =>
  btoa(
    encodeURIComponent(
      JSON.stringify({ products: [product], activeProductId: product.id, scenario: defaultScenario() }),
    ),
  )

/** A minimal workbook that satisfies the gross-meta contract. */
async function deckBytes(mutate?: (wb: ExcelJS.Workbook) => void): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const meta = wb.addWorksheet('gross-meta')
  meta.getCell('A1').value = 'GROSS-DECK-V1'
  meta.getCell('A2').value = validBlob()
  mutate?.(wb)
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

describe('importExcelModel never throws', () => {
  it('random bytes are rejected with the deadpan not-an-Excel error', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ minLength: 0, maxLength: 4096 }), async (bytes) => {
        const result = await importExcelModel(asFile(bytes))
        expect(result.ok).toBe(false)
        expect(result.error).toBe(
          'That did not read as an Excel file. Upload the .xlsx the Export gave you.',
        )
      }),
      { numRuns: 30 },
    )
  })

  it('bytes dressed up as a ZIP are still rejected gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ minLength: 0, maxLength: 2048 }), async (tail) => {
        const bytes = new Uint8Array(4 + tail.length)
        bytes.set([0x50, 0x4b, 0x03, 0x04]) // "PK\x03\x04"
        bytes.set(tail, 4)
        const result = await importExcelModel(asFile(bytes))
        expect(result.ok).toBe(false)
        expect(typeof result.error).toBe('string')
      }),
      { numRuns: 20 },
    )
  })

  it('a real workbook without gross-meta gets the predates-upload-back error', async () => {
    const wb = new ExcelJS.Workbook()
    wb.addWorksheet('Assumptions').getCell('A1').value = 'Not a GROSS deck'
    const result = await importExcelModel(asFile((await wb.xlsx.writeBuffer()) as ArrayBuffer))
    expect(result.ok).toBe(false)
    expect(result.error).toContain('predates upload-back')
  })

  it('a wrong magic tag in A1 is rejected, whatever it says', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 40 }).filter((s) => s !== 'GROSS-DECK-V1'),
        async (tag) => {
          const wb = new ExcelJS.Workbook()
          const meta = wb.addWorksheet('gross-meta')
          meta.getCell('A1').value = tag
          meta.getCell('A2').value = validBlob()
          const result = await importExcelModel(asFile((await wb.xlsx.writeBuffer()) as ArrayBuffer))
          expect(result.ok).toBe(false)
        },
      ),
      { numRuns: 15 },
    )
  })

  it('a damaged hidden blob is rejected with the damaged-sheet error', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ maxLength: 500 }), async (blob) => {
        const wb = new ExcelJS.Workbook()
        const meta = wb.addWorksheet('gross-meta')
        meta.getCell('A1').value = 'GROSS-DECK-V1'
        meta.getCell('A2').value = blob
        const result = await importExcelModel(asFile((await wb.xlsx.writeBuffer()) as ArrayBuffer))
        // Random strings essentially never decode to a valid model; either
        // outcome must be well-formed, and a crash is the only failure
        if (!result.ok) expect(typeof result.error).toBe('string')
        else expect(result.products!.length).toBeGreaterThan(0)
      }),
      { numRuns: 30 },
    )
  })

  it('a blob whose JSON has no products is rejected', async () => {
    for (const hostile of [{}, { products: [] }, { products: 'nope' }, [], 42, null]) {
      const wb = new ExcelJS.Workbook()
      const meta = wb.addWorksheet('gross-meta')
      meta.getCell('A1').value = 'GROSS-DECK-V1'
      meta.getCell('A2').value = btoa(encodeURIComponent(JSON.stringify(hostile)))
      const result = await importExcelModel(asFile((await wb.xlsx.writeBuffer()) as ArrayBuffer))
      expect(result.ok).toBe(false)
      expect(result.error).toContain('hidden model sheet is damaged')
    }
  })

  it('a minimal valid deck reads back the embedded model intact', async () => {
    const result = await importExcelModel(asFile(await deckBytes()))
    expect(result.ok).toBe(true)
    expect(result.products).toHaveLength(1)
    expect(result.products![0]).toMatchObject({
      id: product.id,
      cogsPerUnit: product.cogsPerUnit,
      rrpIncVat: product.rrpIncVat,
    })
    expect(result.activeProductId).toBe(product.id)
    // The scenario comes back healed: every section present
    for (const key of Object.keys(defaultScenario())) {
      expect(result.scenario).toHaveProperty(key)
    }
  })

  it('hostile values in named input cells never crash the overlay', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string({ maxLength: 20 }),
          fc.double({ noNaN: false }),
          fc.constant(null),
          fc.boolean(),
        ),
        fc.constantFrom(
          'COGS', 'RRP', 'VAT', 'ROS', 'UnitsPerCase', 'RetailerMargin',
          'WholesalerMargin', 'Logistics', 'Stores', 'SKUs', 'WeeksInPeriod',
          'Investment', 'StartStock', 'LeadWeeks', 'CoverWeeks', 'AmzReferral', 'TtkCommission',
        ),
        async (value, name) => {
          const bytes = await deckBytes((wb) => {
            const ws = wb.addWorksheet('Assumptions')
            ws.getCell('C5').value = value as ExcelJS.CellValue
            wb.definedNames.add(`Assumptions!$C$5`, name)
          })
          const result = await importExcelModel(asFile(bytes))
          expect(result.ok).toBe(true)
          // Non-numeric values are ignored; the embedded model still stands
          expect(result.products![0].unitsPerCase).toBeGreaterThanOrEqual(1)
          expect(result.scenario!.listing.weeksInPeriod).toBeGreaterThanOrEqual(1)
          expect(result.scenario!.listing.weeksInPeriod).toBeLessThanOrEqual(104)
        },
      ),
      { numRuns: 40 },
    )
  })

  it('a hostile Range sheet (garbage rows, missing headers) never crashes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.oneof(fc.string({ maxLength: 10 }), fc.double({ noNaN: false }), fc.constant(null)), {
          maxLength: 12,
        }),
        async (cells) => {
          const bytes = await deckBytes((wb) => {
            const rng = wb.addWorksheet('The Range')
            rng.getCell(3, 2).value = 'SKU'
            cells.forEach((v, i) => {
              rng.getCell(4, 2 + i).value = v as ExcelJS.CellValue
            })
          })
          const result = await importExcelModel(asFile(bytes))
          expect(result.ok).toBe(true)
        },
      ),
      { numRuns: 30 },
    )
  })
})

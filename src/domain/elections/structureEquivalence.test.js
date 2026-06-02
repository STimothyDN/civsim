import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { simulateElection } from './index'
import { buildProvinceComparisonRows } from '../provinceVisualizations'
import { deepClone } from '../../utils/object'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(resolve(here, '../../../jayavarman.json'), 'utf8'))

// The structure abstraction must not perturb the decentralized result: a
// template with no `config.structure` (the default path) and one with an
// explicit `{ id: 'decentralized' }` must produce identical chambers/regions.
describe('structure equivalence — decentralized default vs explicit', () => {
  it('default and explicit decentralized produce identical seat maps and regions', () => {
    const rows = buildProvinceComparisonRows(data)
    const electionConfig = { seed: 'verify', jitterSeed: 'verify', trends: [] }

    const baseData = deepClone(data)
    if (baseData.config) delete baseData.config.structure

    const explicitData = deepClone(data)
    explicitData.config = explicitData.config || {}
    explicitData.config.structure = { id: 'decentralized' }

    const a = simulateElection({ data: baseData, provinceRows: rows, electionConfig })
    const b = simulateElection({ data: explicitData, provinceRows: rows, electionConfig })

    expect(b.national.assembly.seats).toEqual(a.national.assembly.seats)
    expect(b.national.prelates.seats).toEqual(a.national.prelates.seats)

    expect(Object.keys(b.regions).sort()).toEqual(Object.keys(a.regions).sort())
    expect(Object.keys(a.regions).length).toBeGreaterThan(0)
    Object.keys(a.regions).forEach((name) => {
      expect(b.regions[name].assembly.seats).toEqual(a.regions[name].assembly.seats)
      expect(b.regions[name].prelates.seats).toEqual(a.regions[name].prelates.seats)
    })
  })
})

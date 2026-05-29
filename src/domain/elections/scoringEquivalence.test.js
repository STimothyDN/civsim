import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { calculateProvincePartyScores } from './scoring/provinceScores'
import { calculateCountyPartyScores } from './scoring/countyScores'
import { calculateNationalPartyScores } from './scoring/nationalScores'

/**
 * Regression gate for the "Khmer-specific -> data-driven" engine refactor.
 *
 * scoringBaseline.json was captured from the ORIGINAL hand-coded scoring
 * functions: it stores the exact feature INPUTS (province + county
 * political_features, national features) and the resulting party scores.
 * We replay the stored features through the (now data-driven) scoring
 * functions and require they reproduce the baseline:
 *   - EXACT for the five non-branched parties (yellow/orange/red/blue/green)
 *   - within tolerance for white/purple, whose original code used a hard
 *     "natural vs diaspora" branch now expressed as additive voter blocs.
 *
 * Replaying stored features keeps this immune to the upstream Math.random
 * population jitter that perturbs feature derivation run-to-run.
 */
const here = dirname(fileURLToPath(import.meta.url))
const baseline = JSON.parse(
  readFileSync(resolve(here, '__fixtures__/scoringBaseline.json'), 'utf8')
)

const EXACT_PARTIES = ['yellow', 'orange', 'red', 'blue', 'green']
const TOLERANT_PARTIES = ['white', 'purple']
const TOLERANCE = 0.05

function expectScoresMatch(actual, expected, label) {
  EXACT_PARTIES.forEach((party) => {
    expect(actual[party], `${label} ${party}`).toBeCloseTo(expected[party], 8)
  })
  TOLERANT_PARTIES.forEach((party) => {
    expect(
      Math.abs(actual[party] - expected[party]),
      `${label} ${party} within ${TOLERANCE}`
    ).toBeLessThan(TOLERANCE)
  })
}

describe('data-driven scoring reproduces the original Khmer engine', () => {
  // Reconstruct the province object the way the engine sees it: raw attributes
  // (group, original_country, is_conquered, religion shares) drive voter-bloc
  // membership; political_features drive the linear model.
  const provinceFor = (p) => ({
    group: p.group,
    original_country: p.original_country,
    is_conquered: p.is_conquered,
    is_national_capital: p.is_national_capital,
    is_regional_capital: p.is_regional_capital,
    is_founded: p.is_founded,
    is_joined: p.is_joined,
    continent: p.continent,
    religion_shares: p.religion_shares,
    political_features: p.political_features,
  })

  it('province scores match baseline', () => {
    baseline.provinces.forEach((p) => {
      expectScoresMatch(calculateProvincePartyScores(provinceFor(p)), p.provinceScores, `province ${p.key}`)
    })
  })

  it('county scores match baseline', () => {
    baseline.provinces.forEach((p) => {
      const province = provinceFor(p)
      p.counties.forEach((c, i) => {
        const county = { political_features: c.political_features }
        expectScoresMatch(
          calculateCountyPartyScores(county, province),
          c.countyScores,
          `county ${p.key}#${i}`
        )
      })
    })
  })

  it('national scores match baseline', () => {
    const nf = baseline.nationalFeatures
    // National bloc membership mirrors the old additive national identity terms.
    const blocMembership = {
      american_identity: nf.american_identity_index,
      american_conquered: 0,
      taoist_minority: nf.taoist_share,
      roman_restoration: nf.roman_identity_index,
    }
    expectScoresMatch(
      calculateNationalPartyScores(nf, { blocMembership }),
      baseline.nationalScores,
      'national'
    )
  })
})

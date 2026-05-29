import { buildProvinceComparisonRows } from '../provinceVisualizations'
import { buildFeatureUnitsByName } from './simulateElection'
import { buildProvinceFeatureVector } from './scoring/provinceScores'
import { buildCountyFeatureVector } from './scoring/countyScores'
import { featuresForScope } from './features/featureCatalog'

/**
 * Deterministic generators that pre-populate the political-model weight matrix
 * from the actual input data's feature distribution. Three modes:
 *   - 'balanced'    : each party gets a modest, distinct slice of features;
 *                     base support is calibrated so average scores equalize
 *                     (balanced outcomes without gaudy weights).
 *   - 'data-driven' : features are weighted by their variance across the data
 *                     (the real cleavages), so the election reflects the data.
 *   - 'random'      : sparse random weights within sane bounds.
 *
 * Returns an array parallel to `parties` of { affinities, bias }, where
 * affinities/bias are scoped maps ({ county, province, national }).
 */

const SCOPES = ['county', 'province', 'national']

// Acceptable weight bounds (keep generated values non-gaudy).
const BALANCED_WEIGHT = 0.12
const BALANCED_BIAS_FLOOR = 0.02
const DATA_DRIVEN_MIN = 0.05
const DATA_DRIVEN_SPAN = 0.35
const DATA_DRIVEN_BIAS = 0.03
const RANDOM_SPARSITY = 0.55 // chance a given (party,feature) weight is left at 0
const RANDOM_MIN = -0.15
const RANDOM_SPAN = 0.5 // → range [-0.15, 0.35]
const RANDOM_BIAS_MAX = 0.12

const round = (n) => Math.round(n * 1e4) / 1e4

function emptyScoped(zero = () => ({})) {
  return { county: zero(), province: zero(), national: zero() }
}

function featureStats(samples, key) {
  if (!samples.length) return { mean: 0, std: 0 }
  let sum = 0
  for (const s of samples) sum += Number(s[key]) || 0
  const mean = sum / samples.length
  let variance = 0
  for (const s of samples) {
    const d = (Number(s[key]) || 0) - mean
    variance += d * d
  }
  return { mean, std: Math.sqrt(variance / samples.length) }
}

/**
 * Build feature-value samples per scope from the dataset. National scope has a
 * single aggregate, so the province distribution is used as its proxy.
 */
export function gatherFeatureSamples(data) {
  const rows = buildProvinceComparisonRows(data)
  const units = buildFeatureUnitsByName(data || {}, rows)
  const provinceVectors = []
  const countyVectors = []
  for (const { province, counties } of units.values()) {
    provinceVectors.push(buildProvinceFeatureVector(province))
    for (const county of counties) countyVectors.push(buildCountyFeatureVector(county, province))
  }
  return {
    county: countyVectors.length ? countyVectors : provinceVectors,
    province: provinceVectors,
    national: provinceVectors,
  }
}

function blankResult(parties) {
  return parties.map(() => ({ affinities: emptyScoped(), bias: { county: 0, province: 0, national: 0 } }))
}

// Focused minor parties champion only a few features; wide-appeal majors get
// the rest. Round-robin keeps the strongest cleavages spread across parties.
const MINOR_FEATURE_CAP = 4
// Minor parties target roughly half a major party's expected support.
const MINOR_TARGET_FRACTION = 0.5

function isMinor(party) {
  return party?.tier === 'minor'
}

function assignFeaturesByTier(parties, feats) {
  const assigned = parties.map(() => [])
  let cursor = 0
  for (const f of feats) {
    let placed = false
    for (let tries = 0; tries < parties.length; tries += 1) {
      const pi = cursor % parties.length
      cursor += 1
      if (isMinor(parties[pi]) && assigned[pi].length >= MINOR_FEATURE_CAP) continue
      assigned[pi].push(f)
      placed = true
      break
    }
    if (!placed) {
      // Every eligible party is full (all minors capped) — give it to the
      // major (or any) party with the fewest features so nothing is dropped.
      let best = 0
      for (let p = 1; p < parties.length; p += 1) {
        if (assigned[p].length < assigned[best].length) best = p
      }
      assigned[best].push(f)
    }
  }
  return assigned
}

/**
 * Balanced: each party gets a modest, distinct slice of features (minors fewer,
 * so they stay focused), then base support is calibrated so that *within a tier*
 * every party has the same expected score — and minors sit a notch below majors.
 * No single weight is cranked up, so balance comes from base support, not gaudy
 * affinities.
 */
function generateBalanced(parties, samplesByScope) {
  const result = blankResult(parties)
  for (const scope of SCOPES) {
    const samples = samplesByScope[scope]
    const feats = featuresForScope(scope).map((f) => f.key)
    const assigned = assignFeaturesByTier(parties, feats)

    const sums = parties.map((_, pi) => {
      let sum = 0
      for (const f of assigned[pi]) {
        result[pi].affinities[scope][f] = BALANCED_WEIGHT
        sum += BALANCED_WEIGHT * featureStats(samples, f).mean
      }
      return sum
    })

    // Major parties all reach `majorTarget`; minors all reach a lower target.
    const majorTarget = BALANCED_BIAS_FLOOR + (sums.length ? Math.max(...sums) : 0)
    const minorTarget = BALANCED_BIAS_FLOOR + MINOR_TARGET_FRACTION * (majorTarget - BALANCED_BIAS_FLOOR)
    parties.forEach((party, pi) => {
      const target = isMinor(party) ? minorTarget : majorTarget
      result[pi].bias[scope] = round(Math.max(BALANCED_BIAS_FLOOR, target - sums[pi]))
    })
  }
  return result
}

function generateDataDriven(parties, samplesByScope) {
  const result = blankResult(parties)
  for (const scope of SCOPES) {
    const samples = samplesByScope[scope]
    const stats = featuresForScope(scope)
      .map((f) => ({ key: f.key, ...featureStats(samples, f.key) }))
      .sort((a, b) => b.std - a.std)
    const maxStd = Math.max(1e-6, ...stats.map((s) => s.std))
    stats.forEach((s, i) => {
      const pi = i % parties.length
      result[pi].affinities[scope][s.key] = round(DATA_DRIVEN_MIN + DATA_DRIVEN_SPAN * (s.std / maxStd))
    })
    parties.forEach((_, pi) => { result[pi].bias[scope] = DATA_DRIVEN_BIAS })
  }
  return result
}

function generateRandom(parties, samplesByScope, rng = Math.random) {
  const result = blankResult(parties)
  for (const scope of SCOPES) {
    const feats = featuresForScope(scope).map((f) => f.key)
    parties.forEach((_, pi) => {
      result[pi].bias[scope] = round(rng() * RANDOM_BIAS_MAX)
      for (const f of feats) {
        if (rng() < RANDOM_SPARSITY) continue
        result[pi].affinities[scope][f] = round(RANDOM_MIN + rng() * RANDOM_SPAN)
      }
    })
  }
  return result
}

export function generatePoliticalModel(mode, data, parties, rng = Math.random) {
  if (!Array.isArray(parties) || !parties.length) return []
  const samples = gatherFeatureSamples(data)
  if (mode === 'balanced') return generateBalanced(parties, samples)
  if (mode === 'data-driven') return generateDataDriven(parties, samples)
  return generateRandom(parties, samples, rng)
}

export const WEIGHT_BOUNDS = {
  randomMin: RANDOM_MIN,
  randomMax: RANDOM_MIN + RANDOM_SPAN,
  dataDrivenMin: DATA_DRIVEN_MIN,
  dataDrivenMax: DATA_DRIVEN_MIN + DATA_DRIVEN_SPAN,
}

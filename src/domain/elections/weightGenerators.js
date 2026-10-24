import { buildProvinceComparisonRows } from '../provinceVisualizations'
import { buildFeatureUnitsByName } from './simulateElection'
import { buildProvinceFeatureVector } from './scoring/provinceScores'
import { buildCountyFeatureVector } from './scoring/countyScores'
import { FEATURE_CATALOG, featuresForScope } from './features/featureCatalog'

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
  narrativeMin: -0.4,
  narrativeMax: 0.45,
  narrativeBiasMin: -0.1,
  narrativeBiasMax: 0.35,
}

const SCOPE_FEATURE_SIBLINGS = {
  urban_index: ['urbanization_index'],
  urbanization_index: ['urban_index'],
  commercial_index: ['commerce_index'],
  commerce_index: ['commercial_index'],
  religious_minority_index: ['minority_religion_share'],
  minority_religion_share: ['religious_minority_index'],
  improved_status_index: ['development_index'],
  development_index: ['improved_status_index'],
  economic_diversity_index: ['yield_diversity_index'],
  yield_diversity_index: ['economic_diversity_index'],
  worker_grievance_index: ['worker_index'],
  worker_index: ['worker_grievance_index'],
  mine_or_corporation_index: ['extractive_index'],
  cultural_output_index: ['culture_index'],
}

function normalizeToken(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function resolveFeatureKey(rawKey) {
  const trimmed = String(rawKey || '').trim()
  if (!trimmed) return null

  const exact = FEATURE_CATALOG.find((entry) => entry.key === trimmed)
  if (exact) return exact.key

  const norm = normalizeToken(trimmed)
  const byNormalized = FEATURE_CATALOG.find((entry) => (
    normalizeToken(entry.key) === norm ||
    normalizeToken(entry.key.replace(/_(index|share)$/, '')) === norm ||
    normalizeToken(entry.label) === norm
  ))
  return byNormalized ? byNormalized.key : null
}

function clampWeight(value, min = WEIGHT_BOUNDS.narrativeMin, max = WEIGHT_BOUNDS.narrativeMax) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return round(Math.max(min, Math.min(max, n)))
}

/**
 * Summarize the empirical feature distributions (means and standard deviations)
 * across the empire's provinces and counties so the LLM can ground party
 * affinities in the actual cleavages and characteristics of the dataset.
 */
export function buildEmpireFeatureProfile(data) {
  const samples = gatherFeatureSamples(data)
  const provinceSamples = samples.province || []
  const countySamples = samples.county || []

  const allStats = FEATURE_CATALOG.map((feature) => {
    const useCounty = feature.scopes.length === 1 && feature.scopes[0] === 'county'
    const pool = useCounty ? countySamples : provinceSamples
    const { mean, std } = featureStats(pool, feature.key)
    return {
      key: feature.key,
      label: feature.label,
      group: feature.group,
      scopes: feature.scopes,
      mean: round(mean),
      std: round(std),
    }
  })

  const strongestCleavages = [...allStats]
    .filter((item) => item.std > 0)
    .sort((a, b) => b.std - a.std || b.mean - a.mean)
    .slice(0, 16)

  const dominantCharacteristics = [...allStats]
    .filter((item) => item.mean > 0)
    .sort((a, b) => b.mean - a.mean || b.std - a.std)
    .slice(0, 12)

  return {
    strongestCleavages,
    dominantCharacteristics,
  }
}

function findPartySpecInPlan(plan, party) {
  if (!plan || typeof plan !== 'object') return null

  const aliases = new Set(
    [
      party.id,
      party.name,
      party.abbreviation,
      party.colorName,
      party.colorName ? `${party.colorName} Party` : '',
    ]
      .filter(Boolean)
      .map(normalizeToken),
  )

  const containers = [
    plan.partyWeights,
    plan.parties,
    plan.weights,
    plan.model,
    plan,
  ]

  for (const container of containers) {
    if (!container) continue
    if (Array.isArray(container)) {
      const match = container.find((item) => (
        item &&
        typeof item === 'object' &&
        [item.id, item.partyId, item.party, item.name, item.abbreviation].some((k) => aliases.has(normalizeToken(k)))
      ))
      if (match) return match
    } else if (typeof container === 'object') {
      for (const [key, value] of Object.entries(container)) {
        if (!value || typeof value !== 'object') continue
        if (aliases.has(normalizeToken(key))) return value
        if ([value.id, value.partyId, value.party, value.name, value.abbreviation].some((k) => aliases.has(normalizeToken(k)))) {
          return value
        }
      }
    }
  }

  return null
}

function assignFeatureAcrossScopes(scopedAffinities, allowedByScope, rawKey, rawWeight, targetScopes = SCOPES) {
  const key = resolveFeatureKey(rawKey)
  if (!key) return
  const weight = clampWeight(rawWeight)
  if (!weight) return

  for (const scope of targetScopes) {
    const allowed = allowedByScope[scope]
    if (allowed.has(key)) {
      if (scopedAffinities[scope][key] === undefined) {
        scopedAffinities[scope][key] = weight
      }
      continue
    }

    const siblings = SCOPE_FEATURE_SIBLINGS[key] || []
    for (const sibling of siblings) {
      if (allowed.has(sibling) && scopedAffinities[scope][sibling] === undefined) {
        scopedAffinities[scope][sibling] = weight
        break
      }
    }
  }
}

function extractScopedAffinities(spec, allowedByScope) {
  const scopedAffinities = emptyScoped()
  if (!spec || typeof spec !== 'object') return scopedAffinities

  const rawAffinities = spec.affinities || spec.features || spec.weights || {}
  if (!rawAffinities || typeof rawAffinities !== 'object') return scopedAffinities

  const hasExplicitScopes = SCOPES.some((scope) => (
    rawAffinities[scope] && typeof rawAffinities[scope] === 'object' && !Array.isArray(rawAffinities[scope])
  ))

  if (hasExplicitScopes) {
    // 1. Apply explicit per-scope weights first.
    for (const scope of SCOPES) {
      const scopeMap = rawAffinities[scope]
      if (!scopeMap || typeof scopeMap !== 'object') continue
      for (const [featKey, weight] of Object.entries(scopeMap)) {
        assignFeatureAcrossScopes(scopedAffinities, allowedByScope, featKey, weight, [scope])
      }
    }
    // 2. Project any populated scope keys onto missing scopes via shared/sibling rules.
    for (const sourceScope of ['province', 'county', 'national']) {
      for (const [featKey, weight] of Object.entries(scopedAffinities[sourceScope])) {
        assignFeatureAcrossScopes(scopedAffinities, allowedByScope, featKey, weight, SCOPES)
      }
    }
  } else {
    for (const [featKey, weight] of Object.entries(rawAffinities)) {
      if (SCOPES.includes(featKey)) continue
      assignFeatureAcrossScopes(scopedAffinities, allowedByScope, featKey, weight, SCOPES)
    }
  }

  return scopedAffinities
}

function extractScopedBias(spec) {
  if (!spec || typeof spec !== 'object') return null
  const rawBias = spec.bias ?? spec.baseSupport ?? spec.base_support ?? spec.base ?? null
  if (rawBias === null || rawBias === undefined) return null

  if (typeof rawBias === 'number' || typeof rawBias === 'string') {
    const n = Number(rawBias)
    if (!Number.isFinite(n)) return null
    const clamped = clampWeight(n, WEIGHT_BOUNDS.narrativeBiasMin, WEIGHT_BOUNDS.narrativeBiasMax)
    return { county: clamped, province: clamped, national: clamped }
  }

  if (typeof rawBias === 'object' && !Array.isArray(rawBias)) {
    const out = {}
    let found = false
    for (const scope of SCOPES) {
      const n = Number(rawBias[scope] ?? rawBias.province ?? rawBias.national ?? rawBias.county)
      if (Number.isFinite(n)) {
        out[scope] = clampWeight(n, WEIGHT_BOUNDS.narrativeBiasMin, WEIGHT_BOUNDS.narrativeBiasMax)
        found = true
      }
    }
    return found ? out : null
  }

  return null
}

/**
 * Compile an LLM narrative weight plan into a sanitized, calibrated political
 * model array parallel to `parties` (`[{ id, affinities, bias, rationale }]`).
 */
export function compileNarrativePoliticalModel(plan, data, parties = data?.config?.parties || []) {
  if (!Array.isArray(parties) || !parties.length) return []

  const samplesByScope = gatherFeatureSamples(data)
  const fallbackModel = generateBalanced(parties, samplesByScope)
  const allowedByScope = Object.fromEntries(
    SCOPES.map((scope) => [scope, new Set(featuresForScope(scope).map((f) => f.key))]),
  )

  return parties.map((party, index) => {
    const spec = findPartySpecInPlan(plan, party)
    const fallback = fallbackModel[index]
    const extractedAffinities = extractScopedAffinities(spec, allowedByScope)
    const explicitBias = extractScopedBias(spec)

    const hasAnyExtractedAffinity = SCOPES.some((scope) => Object.keys(extractedAffinities[scope]).length > 0)
    const affinities = hasAnyExtractedAffinity ? extractedAffinities : fallback.affinities
    const bias = { ...fallback.bias }

    for (const scope of SCOPES) {
      const samples = samplesByScope[scope] || []
      let expectedFeatureSum = 0
      for (const [featKey, weight] of Object.entries(affinities[scope] || {})) {
        expectedFeatureSum += weight * featureStats(samples, featKey).mean
      }

      const minExpectedScore = isMinor(party) ? 0.015 : 0.04
      if (explicitBias && Number.isFinite(explicitBias[scope])) {
        const requestedBias = explicitBias[scope]
        const floorAdjustedBias = Math.max(requestedBias, minExpectedScore - expectedFeatureSum)
        bias[scope] = clampWeight(floorAdjustedBias, WEIGHT_BOUNDS.narrativeBiasMin, WEIGHT_BOUNDS.narrativeBiasMax)
      } else {
        const defaultTarget = isMinor(party) ? 0.045 : 0.11
        bias[scope] = clampWeight(
          Math.max(BALANCED_BIAS_FLOOR, defaultTarget - expectedFeatureSum * 0.5),
          WEIGHT_BOUNDS.narrativeBiasMin,
          WEIGHT_BOUNDS.narrativeBiasMax,
        )
      }
    }

    const rationale = String(spec?.rationale || spec?.reason || spec?.summary || '').trim()

    return {
      id: party.id,
      affinities,
      bias,
      ...(rationale ? { rationale } : {}),
    }
  })
}

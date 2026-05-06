import {
  apportionDHondt,
  apportionModifiedSainteLague,
  apportionSainteLague,
  PARTIES,
  THRESHOLDS,
} from '../index'
import { createSeededRng } from '../randomness/seededRandom'

export const POLLSTERS = [
  {
    id: 'imperial-gazette',
    name: 'Imperial Gazette Polling',
    tagline: 'The voice of the capital.',
    methodology: 'State-affiliated polling with institutional credibility. Samples urban centers and government employees. Tends to reflect establishment preferences.',
    marginOfError: 0.025,
    segment: 'establishment',
    biasParty: 'yellow',
  },
  {
    id: 'rural-voice',
    name: 'Rural Voice Network',
    tagline: 'Heartland perspectives.',
    methodology: 'Independent rural polling organization. Focuses on agricultural regions and military communities. Known for conservative-leaning results.',
    marginOfError: 0.028,
    segment: 'rural-conservative',
    biasParty: 'red',
  },
  {
    id: 'workers-council',
    name: 'Workers Council Research',
    tagline: 'Polling for the working class.',
    methodology: 'Labor-affiliated polling targeting industrial workers and urban labor unions. historically favorable to labor-aligned parties.',
    marginOfError: 0.03,
    segment: 'labor',
    biasParty: 'orange',
  },
  {
    id: 'civic-freedom',
    name: 'Civic Freedom Institute',
    tagline: 'Measuring the pulse of liberty.',
    methodology: 'Liberal think tank polling. Samples educated urban professionals and reform-minded demographics. Leans toward decentralist and reform parties.',
    marginOfError: 0.026,
    segment: 'liberal-intellectual',
    biasParty: 'blue',
  },
  {
    id: 'american-autonomy',
    name: 'American Autonomy Polls',
    tagline: 'Regional interests, national voice.',
    methodology: 'American provincial interest group polling. Focuses on American-majority regions and autonomy advocates. Strong regional bias.',
    marginOfError: 0.032,
    segment: 'regionalist',
    biasParty: 'white',
  },
  {
    id: 'lotus-institute',
    name: 'Lotus Institute surveys',
    tagline: 'Tradition measured with wisdom.',
    methodology: 'Religious-cultural research organization. Polls within Taoist and restorationist communities. Reflects minority cultural perspectives.',
    marginOfError: 0.035,
    segment: 'cultural-religious',
    biasParty: 'purple',
  },
  {
    id: 'ecology-matters',
    name: 'Ecology Matters Research',
    tagline: 'The planet has a vote.',
    methodology: 'Environmental advocacy polling. Targets younger demographics and urban environmentalists. Historically favorable to green parties.',
    marginOfError: 0.033,
    segment: 'environmental',
    biasParty: 'green',
  },
  {
    id: 'independent-consensus',
    name: 'Independent Consensus',
    tagline: 'Beyond partisan lines.',
    methodology: 'Non-partisan academic polling. Uses stratified sampling across all demographics. Attempts to minimize bias but tends toward centrist results.',
    marginOfError: 0.022,
    segment: 'centrist-academic',
    biasParty: null,
  },
  {
    id: 'market-dynamics',
    name: 'Market Dynamics Group',
    tagline: 'Politics as markets.',
    methodology: 'Corporate market research firm. Polls business owners, investors, and economic elites. Leans toward pro-business and stability-oriented parties.',
    marginOfError: 0.024,
    segment: 'business-elite',
    biasParty: 'yellow',
  },
  {
    id: 'grassroots-pulse',
    name: 'Grassroots Pulse',
    tagline: 'From the ground up.',
    methodology: 'Grassroots activist polling. Uses community-based sampling and social media outreach. Tends to amplify anti-establishment and reform sentiment.',
    marginOfError: 0.036,
    segment: 'grassroots-activist',
    biasParty: 'blue',
  },
]

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function emptyPartyMap(value = 0) {
  return Object.fromEntries(PARTIES.map((party) => [party, value]))
}

function sum(values = []) {
  return values.reduce((total, value) => total + number(value), 0)
}

function sumSeats(seats = {}) {
  return sum(Object.values(seats || {}))
}

function topParty(values = {}) {
  return [...PARTIES].sort((a, b) => number(values[b]) - number(values[a]) || PARTIES.indexOf(a) - PARTIES.indexOf(b))[0]
}

function normalizeShares(shares = {}) {
  const raw = Object.fromEntries(PARTIES.map((party) => [party, Math.max(0, number(shares?.[party]))]))
  const total = sum(Object.values(raw))
  if (total <= 0) return Object.fromEntries(PARTIES.map((party) => [party, 1 / PARTIES.length]))
  return Object.fromEntries(PARTIES.map((party) => [party, raw[party] / total]))
}

function gaussianish(rng) {
  return (rng() + rng() + rng() + rng() + rng() + rng() - 3) / 3
}

function climateTrendParty(trends = [], fallbackShares = {}) {
  const trendScores = emptyPartyMap(0)
  trends.forEach((trend) => {
    const party = trend?.party
    if (!PARTIES.includes(party)) return
    const magnitude = Math.abs(number(trend?.magnitude, 0.08)) || 0.08
    trendScores[party] += magnitude
  })
  return sum(Object.values(trendScores)) > 0 ? topParty(trendScores) : topParty(fallbackShares)
}

function localistParty(partyMeta = {}) {
  const keywords = ['local', 'agrarian', 'rural', 'decentral', 'autonomy', 'regional']
  const scores = Object.fromEntries(PARTIES.map((party) => {
    const ideology = String(partyMeta?.[party]?.ideology || '').toLowerCase()
    const score = keywords.reduce((total, keyword) => total + (ideology.includes(keyword) ? 1 : 0), 0)
    return [party, score]
  }))
  return sum(Object.values(scores)) > 0 ? topParty(scores) : 'red'
}

function houseSeatLeader(unit = {}) {
  const seats = unit?.assembly?.seats || {}
  return sumSeats(seats) > 0 ? topParty(seats) : topParty(unit?.assembly?.vote_shares)
}

function applyHouseEffect(shares = {}, party, points = 0) {
  const normalized = normalizeShares(shares)
  if (!PARTIES.includes(party) || points <= 0) return normalized
  const current = normalized[party]
  const remainingTotal = Math.max(Number.EPSILON, 1 - current)
  const target = Math.min(0.82, current + points)

  return normalizeShares(Object.fromEntries(PARTIES.map((candidate) => {
    if (candidate === party) return [candidate, target]
    const scaled = normalized[candidate] * ((1 - target) / remainingTotal)
    return [candidate, scaled]
  })))
}

function addPollingNoise(shares = {}, rng, marginOfError = 0.025, scale = 0.34) {
  const noisy = Object.fromEntries(PARTIES.map((party) => [
    party,
    number(shares[party]) + gaussianish(rng) * marginOfError * scale,
  ]))
  return normalizeShares(noisy)
}

function likelyVoterShares(shares = {}) {
  const normalized = normalizeShares(shares)
  return normalizeShares(Object.fromEntries(PARTIES.map((party) => {
    const share = normalized[party]
    const turnoutWeight = 0.9 + Math.sqrt(Math.max(0, share)) * 0.24
    const microPartyPenalty = share < 0.05 ? 0.88 : 1
    return [party, share * turnoutWeight * microPartyPenalty]
  })))
}

function blendShares(primary = {}, secondary = {}, primaryWeight = 0.7) {
  const first = normalizeShares(primary)
  const second = normalizeShares(secondary)
  const weight = Math.max(0, Math.min(1, number(primaryWeight, 0.7)))
  return normalizeShares(Object.fromEntries(PARTIES.map((party) => [
    party,
    first[party] * weight + second[party] * (1 - weight),
  ])))
}

function seatEfficiencyShares(unit = {}) {
  const seats = unit?.assembly?.seats || {}
  return sumSeats(seats) > 0 ? normalizeShares(seats) : normalizeShares(unit?.assembly?.vote_shares)
}

function buildScopeUnit(scope, scopeKey, scopeLabel, unit, baselineUnit = null, provinceIndex = null) {
  return { scope, scopeKey, scopeLabel, unit, baselineUnit, provinceIndex }
}

function scopeUnits(results = {}, baselineResults = {}) {
  const units = [
    buildScopeUnit('national', 'national', 'National', results.national || {}, baselineResults?.national || null),
  ]

  Object.values(results.regions || {}).forEach((region) => {
    units.push(buildScopeUnit('regional', region.name, region.name, region, baselineResults?.regions?.[region.name] || null))
  })

  ;(results.provinces || []).forEach((province) => {
    const key = String(province.provinceIndex)
    const baselineProvince = (baselineResults?.provinces || []).find((candidate) => (
      candidate.provinceIndex === province.provinceIndex || candidate.name === province.name
    )) || null
    units.push(buildScopeUnit('provincial', key, province.name, province, baselineProvince, province.provinceIndex))
  })

  return units
}

function assemblySeatCount(scope, unit = {}) {
  if (scope === 'national') return number(unit?.assembly?.seat_count, sumSeats(unit?.assembly?.seats))
  if (scope === 'regional') return number(unit?.assemblypeople, sumSeats(unit?.assembly?.seats))
  return number(unit?.assemblypeople, sumSeats(unit?.assembly?.seats))
}

function prelateSeatCount(unit = {}) {
  return number(unit?.prelates?.seat_count ?? unit?.prelate_count, sumSeats(unit?.prelates?.seats))
}

function apportionAssembly(scope, voteShares, seatCount, threshold = null) {
  if (scope === 'national') {
    return apportionSainteLague(voteShares, seatCount, {
      threshold: threshold ?? THRESHOLDS.nationalAssembly,
    })
  }

  return apportionDHondt(voteShares, seatCount, {
    threshold: threshold ?? THRESHOLDS.provincialAssembly,
  })
}

function apportionPrelates(voteShares, seatCount) {
  return apportionModifiedSainteLague(voteShares, seatCount, {
    threshold: THRESHOLDS.provincialPrelates,
  })
}

function baseSharesForPollster(pollsterId, scopeUnit, results) {
  const assembly = scopeUnit.unit?.assembly || {}
  const pollster = POLLSTERS.find((p) => p.id === pollsterId)
  
  // Segment-based sampling: different pollsters weight different demographic signals
  if (pollsterId === 'imperial-gazette') {
    // Establishment: weight urban and government-aligned signals
    return blendShares(assembly.vote_shares, assembly.climate_vote_shares || assembly.vote_shares, 0.7)
  }
  if (pollsterId === 'rural-voice') {
    // Rural conservative: weight local and traditional signals
    return blendShares(assembly.vote_shares, assembly.local_vote_shares || assembly.vote_shares, 0.65)
  }
  if (pollsterId === 'workers-council') {
    // Labor: weight economic and urban worker signals
    return blendShares(assembly.vote_shares, assembly.climate_vote_shares || assembly.vote_shares, 0.6)
  }
  if (pollsterId === 'civic-freedom') {
    // Liberal intellectual: weight reform and decentralization signals
    return blendShares(assembly.vote_shares, assembly.local_vote_shares || assembly.vote_shares, 0.6)
  }
  if (pollsterId === 'american-autonomy') {
    // Regionalist: weight local vote shares heavily
    return assembly.local_vote_shares || assembly.vote_shares
  }
  if (pollsterId === 'lotus-institute') {
    // Cultural-religious: blend current with traditional patterns
    return blendShares(assembly.vote_shares, scopeUnit.baselineUnit?.assembly?.vote_shares || assembly.vote_shares, 0.55)
  }
  if (pollsterId === 'ecology-matters') {
    // Environmental: weight climate signals heavily
    return assembly.climate_vote_shares || assembly.vote_shares
  }
  if (pollsterId === 'independent-consensus') {
    // Centrist academic: use raw vote shares with minimal adjustment
    return assembly.vote_shares
  }
  if (pollsterId === 'market-dynamics') {
    // Business elite: weight seat efficiency (establishment stability)
    return blendShares(assembly.vote_shares, seatEfficiencyShares(scopeUnit.unit), 0.68)
  }
  if (pollsterId === 'grassroots-pulse') {
    // Grassroots activist: weight local signals and blend with baseline for change sentiment
    return blendShares(assembly.vote_shares, assembly.local_vote_shares || assembly.vote_shares, 0.55)
  }
  return assembly.vote_shares
}

function pollsterHouseEffect(pollsterId, scopeUnit, results) {
  const pollster = POLLSTERS.find((p) => p.id === pollsterId)
  const baseShares = scopeUnit.unit?.assembly?.vote_shares || {}
  
  // If pollster has an explicit bias party, use it with appropriate magnitude
  if (pollster?.biasParty && PARTIES.includes(pollster.biasParty)) {
    // Different segments have different bias strengths
    const biasStrengths = {
      'establishment': 0.015,
      'rural-conservative': 0.018,
      'labor': 0.016,
      'liberal-intellectual': 0.014,
      'regionalist': 0.02,
      'cultural-religious': 0.012,
      'environmental': 0.014,
      'centrist-academic': 0.004,
      'business-elite': 0.012,
      'grassroots-activist': 0.016,
    }
    return { 
      party: pollster.biasParty, 
      points: biasStrengths[pollster.segment] || 0.01 
    }
  }
  
  // Fallback for pollsters without explicit bias (centrist academic)
  return { party: topParty(baseShares), points: 0.003 }
}

function pollsterShares(pollster, scopeUnit, results, pollSeed) {
  const rng = createSeededRng(`${pollSeed}:${pollster.id}:${scopeUnit.scopeKey}`)
  const base = normalizeShares(baseSharesForPollster(pollster.id, scopeUnit, results))
  const effect = pollsterHouseEffect(pollster.id, scopeUnit, results)
  
  // Apply likely-voter adjustment for establishment and business-elite pollsters
  const adjustedBase = (pollster.id === 'imperial-gazette' || pollster.id === 'market-dynamics') 
    ? likelyVoterShares(base) 
    : base
  
  const withEffect = applyHouseEffect(adjustedBase, effect.party, effect.points)
  
  // Noise scale based on segment: academic/establishment more precise, grassroots/religious less precise
  const noiseScale = pollster.id === 'independent-consensus'
    ? 0.12
    : pollster.id === 'imperial-gazette' || pollster.id === 'market-dynamics'
      ? 0.16
      : pollster.id === 'rural-voice' || pollster.id === 'workers-council'
        ? 0.22
        : pollster.id === 'grassroots-pulse' || pollster.id === 'lotus-institute'
          ? 0.28
          : pollster.id === 'ecology-matters'
            ? 0.24
            : 0.18
  
  return {
    voteShares: addPollingNoise(withEffect, rng, pollster.marginOfError, noiseScale),
    houseEffect: effect,
  }
}

function projectedSeats(scope, voteShares, unit, strictThreshold = false) {
  const assemblyThreshold = strictThreshold && scope === 'national'
    ? THRESHOLDS.nationalAssembly + 0.01
    : null
  const assembly = apportionAssembly(scope, voteShares, assemblySeatCount(scope, unit), assemblyThreshold)
  const prelates = apportionPrelates(voteShares, prelateSeatCount(unit))
  return { assembly, prelates }
}

function buildPollsterResult(pollster, scopeUnit, results, pollSeed) {
  const { voteShares, houseEffect } = pollsterShares(pollster, scopeUnit, results, pollSeed)
  const seats = projectedSeats(scopeUnit.scope, voteShares, scopeUnit.unit, false)
  const leader = topParty(voteShares)

  return {
    id: pollster.id,
    name: pollster.name,
    tagline: pollster.tagline,
    methodology: pollster.methodology,
    segment: pollster.segment,
    houseEffect: {
      party: houseEffect.party,
      points: Number((houseEffect.points * 100).toFixed(1)),
    },
    voteShares,
    seats,
    leader,
    marginOfError: pollster.marginOfError,
  }
}

function aggregatePollsters(scope, unit, pollsters) {
  const weightedTotals = emptyPartyMap(0)
  let weightTotal = 0

  pollsters.forEach((pollster) => {
    const weight = 1 / Math.max(0.0001, pollster.marginOfError)
    weightTotal += weight
    PARTIES.forEach((party) => {
      weightedTotals[party] += number(pollster.voteShares[party]) * weight
    })
  })

  const voteShares = normalizeShares(Object.fromEntries(PARTIES.map((party) => [
    party,
    weightedTotals[party] / Math.max(Number.EPSILON, weightTotal),
  ])))
  const seats = projectedSeats(scope, voteShares, unit)
  const leader = topParty(voteShares)
  const voteShareRangePct = Object.fromEntries(PARTIES.map((party) => {
    const values = pollsters.map((pollster) => number(pollster.voteShares?.[party]) * 100)
    return [party, {
      min: Number(Math.min(...values).toFixed(1)),
      max: Number(Math.max(...values).toFixed(1)),
    }]
  }))
  const assemblySeatRange = Object.fromEntries(PARTIES.map((party) => {
    const values = pollsters.map((pollster) => number(pollster.seats?.assembly?.[party]))
    return [party, { min: Math.min(...values), max: Math.max(...values) }]
  }))

  return {
    voteShares,
    seats,
    leader,
    spread: { voteShareRangePct, assemblySeatRange },
  }
}

function buildScopeResult(scopeUnit, results, pollSeed) {
  const pollsters = POLLSTERS.map((pollster) => buildPollsterResult(pollster, scopeUnit, results, pollSeed))
  const aggregate = aggregatePollsters(scopeUnit.scope, scopeUnit.unit, pollsters)

  return {
    scope: scopeUnit.scope,
    scopeKey: scopeUnit.scopeKey,
    scopeLabel: scopeUnit.scopeLabel,
    pollsters,
    aggregate,
  }
}

export function pollingPromptPayload(scopeResult) {
  if (!scopeResult) return null
  return {
    scope: scopeResult.scope,
    scopeLabel: scopeResult.scopeLabel,
    aggregate: {
      voteSharesPct: Object.fromEntries(PARTIES.map((party) => [
        party,
        Number((number(scopeResult.aggregate?.voteShares?.[party]) * 100).toFixed(1)),
      ])),
      projectedSeats: {
        assembly: scopeResult.aggregate?.seats?.assembly || emptyPartyMap(0),
        prelates: scopeResult.aggregate?.seats?.prelates || emptyPartyMap(0),
      },
      leader: scopeResult.aggregate?.leader || null,
    },
    spread: scopeResult.aggregate?.spread || null,
    pollsterCount: Array.isArray(scopeResult.pollsters) ? scopeResult.pollsters.length : 0,
    methodologyNotes: POLLSTERS.map((pollster) => `${pollster.name}: ${pollster.methodology}`),
  }
}

export function runPolls({ results = {}, baselineResults = {}, pollSeed = 'poll-baseline' } = {}) {
  return scopeUnits(results, baselineResults).map((scopeUnit) => buildScopeResult(scopeUnit, results, pollSeed))
}

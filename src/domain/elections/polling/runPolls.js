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
    id: 'climate-heavy',
    name: 'Aurora Public Opinion',
    tagline: 'Reading the temper of the realm.',
    methodology: 'Uses climate-weighted vote shares and leans toward the strongest active climate signal.',
    marginOfError: 0.035,
  },
  {
    id: 'local-weighted',
    name: 'Parish & Precinct',
    tagline: 'Door-to-door, hearth to hearth.',
    methodology: 'Uses local vote shares and gives a small edge to parties with localist or agrarian appeal.',
    marginOfError: 0.025,
  },
  {
    id: 'likely-voter',
    name: 'Civitas Standard-Bearer',
    tagline: 'Counting the citizens who will actually vote.',
    methodology: 'Uses likely-voter turnout weighting, stricter thresholds, and incumbent-seat strength.',
    marginOfError: 0.02,
  },
  {
    id: 'tracking',
    name: 'Sentinel Daily Tracker',
    tagline: 'The pulse, refreshed at dawn.',
    methodology: 'Uses current vote shares with deterministic daily-tracker sampling noise.',
    marginOfError: 0.03,
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
  if (pollsterId === 'climate-heavy') return assembly.climate_vote_shares || assembly.vote_shares
  if (pollsterId === 'local-weighted') return assembly.local_vote_shares || assembly.vote_shares
  return assembly.vote_shares
}

function pollsterHouseEffect(pollsterId, scopeUnit, results) {
  const baseShares = scopeUnit.unit?.assembly?.vote_shares || {}
  if (pollsterId === 'climate-heavy') {
    return { party: climateTrendParty(results.config?.trends || [], baseShares), points: 0.012 }
  }
  if (pollsterId === 'local-weighted') {
    return { party: localistParty(results.config?.partyMeta || results.parties), points: 0.008 }
  }
  if (pollsterId === 'likely-voter') {
    return { party: houseSeatLeader(scopeUnit.unit), points: 0.006 }
  }
  return { party: topParty(baseShares), points: 0 }
}

function pollsterShares(pollster, scopeUnit, results, pollSeed) {
  const rng = createSeededRng(`${pollSeed}:${pollster.id}:${scopeUnit.scopeKey}`)
  const base = normalizeShares(baseSharesForPollster(pollster.id, scopeUnit, results))
  const effect = pollsterHouseEffect(pollster.id, scopeUnit, results)
  const adjustedBase = pollster.id === 'likely-voter' ? likelyVoterShares(base) : base
  const withEffect = applyHouseEffect(adjustedBase, effect.party, effect.points)
  const noiseScale = pollster.id === 'tracking' ? 0.58 : pollster.id === 'climate-heavy' ? 0.24 : 0.18
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
  const seats = projectedSeats(scopeUnit.scope, voteShares, scopeUnit.unit, pollster.id === 'likely-voter')
  const leader = topParty(voteShares)

  return {
    id: pollster.id,
    name: pollster.name,
    tagline: pollster.tagline,
    methodology: pollster.methodology,
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

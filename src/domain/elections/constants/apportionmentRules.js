export const DEFAULT_VOLATILITY = {
  national: 0.05,
  region: 0.08,
  province: 0.12,
  county: 0.20,
}

// How strongly a unit's political make-up decides its vote, per level: shares
// follow score^decisiveness (before trends and random swings). 1 = proportional
// to the scores; higher gives parties real strongholds.
export const DEFAULT_DECISIVENESS = { county: 2, province: 2, national: 2 }

/** Decisiveness per level from a number (every level) or a partial map. */
export function resolveDecisiveness(...sources) {
  const out = { ...DEFAULT_DECISIVENESS }
  for (const source of sources) {
    if (source === undefined || source === null) continue
    for (const level of Object.keys(out)) {
      const value = typeof source === 'object' ? source[level] : source
      const n = Number(value)
      if (value !== undefined && value !== null && value !== '' && Number.isFinite(n)) out[level] = Math.max(0.5, Math.min(4, n))
    }
  }
  return out
}

export const DEFAULT_VOTE_BLEND = {
  provincialAssemblyLocalWeight: 0.65,
  nationalAssemblyLocalWeight: 0.7,
}

export const APPORTIONMENT = {
  provincialAssembly: 'dhondt',
  provincialPrelates: 'modifiedSainteLague',
  nationalAssembly: 'sainteLague',
  nationalPrelates: 'provinceByProvinceDhondt',
}

export const THRESHOLDS = {
  provincialAssembly: 0,
  provincialPrelates: 0,
  nationalAssembly: 0,
  nationalPrelates: 0,
}

export const BASELINE_ELECTION_CONFIG = {
  seed: 'baseline',
  jitterSeed: 'baseline',
  trendPackageId: 'baseline',
  scenarioName: 'Baseline Election Climate',
  scenarioDescription: 'No randomized climate trends are active.',
  trends: [],
  volatility: DEFAULT_VOLATILITY,
  voteBlend: DEFAULT_VOTE_BLEND,
  decisiveness: DEFAULT_DECISIVENESS,
}

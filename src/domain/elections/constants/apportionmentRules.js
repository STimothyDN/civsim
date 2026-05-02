export const DEFAULT_VOLATILITY = {
  national: 0.05,
  region: 0.08,
  province: 0.12,
  county: 0.20,
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
  trends: [],
  volatility: DEFAULT_VOLATILITY,
}


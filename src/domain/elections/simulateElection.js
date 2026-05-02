import { THRESHOLDS, BASELINE_ELECTION_CONFIG } from './constants/apportionmentRules'
import { PARTIES, PARTY_META } from './constants/parties'
import { apportionDHondt, apportionModifiedSainteLague, apportionSainteLague, createEmptySeats } from './apportionment/highestAverages'
import { allocateCountyPopulations } from './population/allocateCountyPopulations'
import { calculateCountyFeatures } from './features/countyFeatures'
import { calculateNationalFeatures } from './features/nationalFeatures'
import { calculateProvinceBaseFeatures, calculateProvinceFeatures } from './features/provinceFeatures'
import { calculateCountyPartyScores } from './scoring/countyScores'
import { calculateNationalPartyScores } from './scoring/nationalScores'
import { calculateProvincePartyScores } from './scoring/provinceScores'
import { emptyPartyMap, scoresToVoteShares, sumPartyMaps, weightedVoteShares } from './scoring/normalizeScores'
import { applyJitter } from './randomness/jitter'
import { applyTrends } from './trends/applyTrends'
import { num, roundTo, sumObjectValues } from './normalization/numbers'
import { determineHouseControl } from './coalitions/houseControl'

function mergeConfig(electionConfig = {}) {
  return {
    ...BASELINE_ELECTION_CONFIG,
    ...electionConfig,
    volatility: {
      ...BASELINE_ELECTION_CONFIG.volatility,
      ...(electionConfig.volatility || {}),
    },
    trends: Array.isArray(electionConfig.trends) ? electionConfig.trends : [],
  }
}

function rawProvinceFor(data, row) {
  return data?.provinces?.[row.index] || {}
}

function createProvinceInput(data, row) {
  const raw = rawProvinceFor(data, row)
  const provincialPopulation = Math.max(0, Math.round(num(row.provincialPopulation ?? raw.provincial_population)))
  const assemblypeople = Math.max(0, Math.round(num(row.assemblypeople ?? raw.assemblypeople)))
  const prelates = Math.max(0, Math.round(num(row.prelates ?? raw.prelates)))

  return {
    ...raw,
    provinceIndex: row.index,
    name: row.name || raw.name || `Province ${row.index + 1}`,
    group: raw.group || row.group || 'Unassigned',
    provincial_population: provincialPopulation,
    assemblypeople,
    prelates,
    population: raw.population ?? row.population,
    row,
  }
}

function makeCountyUnit(county, index, province) {
  return {
    ...county,
    countyIndex: index,
    id: `${province.provinceIndex}:${county.tile_id || index}`,
    name: county.name || `County ${index + 1}`,
    group: province.group,
    is_conquered: province.is_conquered,
    improvement_name: county.improvement?.name || '',
  }
}

function calculateCountyVote(county, province, config) {
  const rawScores = calculateCountyPartyScores(county, province)
  const trendScores = applyTrends(rawScores, county, 'county', config.trends)
  const adjustedScores = applyJitter(trendScores, {
    national: 'national',
    region: province.group || 'Unassigned',
    province: province.city_id || province.provinceIndex,
    county: county.id,
  }, config)
  const voteShares = scoresToVoteShares(adjustedScores)

  return {
    ...county,
    vote_shares: voteShares,
    raw_scores: rawScores,
    adjusted_scores: adjustedScores,
  }
}

function calculateProvinceAssembly(province, config) {
  const rawScores = calculateProvincePartyScores(province)
  const trendScores = applyTrends(rawScores, province, 'province', config.trends)
  const adjustedScores = applyJitter(trendScores, {
    national: 'national',
    region: province.group || 'Unassigned',
    province: province.city_id || province.provinceIndex,
  }, config)
  const voteShares = scoresToVoteShares(adjustedScores)
  const seats = apportionDHondt(voteShares, province.assemblypeople, {
    threshold: THRESHOLDS.provincialAssembly,
    rawScores: adjustedScores,
  })

  return {
    vote_shares: voteShares,
    seats,
    control: determineHouseControl(seats, config.trends),
    raw_scores: rawScores,
    adjusted_scores: adjustedScores,
  }
}

function calculateProvincePrelates(province, counties, config) {
  const voteShares = weightedVoteShares(
    counties,
    (county) => county.county_population,
    (county) => county.vote_shares
  )
  const seats = apportionModifiedSainteLague(voteShares, province.prelates, {
    threshold: THRESHOLDS.provincialPrelates,
  })

  return {
    vote_shares: voteShares,
    seats,
    control: determineHouseControl(seats, config.trends),
  }
}

function buildProvinceResult(data, row, config) {
  const country = data?.country || {}
  const provinceInput = createProvinceInput(data, row)
  const baseFeatures = calculateProvinceBaseFeatures(provinceInput, country)
  const allocatedCounties = allocateCountyPopulations(provinceInput, provinceInput.provincial_population)
  const preliminaryCountyUnits = allocatedCounties.map((county, index) => {
    const countyUnit = makeCountyUnit(county, index, provinceInput)
    return {
      ...countyUnit,
      political_features: calculateCountyFeatures(county, {
        ...baseFeatures,
        is_conquered: provinceInput.is_conquered,
      }),
    }
  })
  const provinceFeatures = calculateProvinceFeatures(
    provinceInput,
    country,
    preliminaryCountyUnits,
    provinceInput.provincial_population
  )
  const province = {
    ...provinceInput,
    group: provinceInput.group || 'Unassigned',
    political_features: provinceFeatures,
  }
  const counties = preliminaryCountyUnits.map((county) => {
    const features = calculateCountyFeatures(county, {
      ...provinceFeatures,
      is_conquered: province.is_conquered,
    })
    return calculateCountyVote({ ...county, political_features: features }, province, config)
  })
  const assembly = calculateProvinceAssembly(province, config)
  const prelates = calculateProvincePrelates(province, counties, config)
  const national_prelate_delegation = apportionDHondt(assembly.vote_shares, province.prelates, {
    threshold: THRESHOLDS.nationalPrelates,
    rawScores: assembly.adjusted_scores,
  })

  return {
    provinceIndex: province.provinceIndex,
    name: province.name,
    group: province.group || 'Unassigned',
    city_id: province.city_id,
    is_national_capital: !!province.is_national_capital,
    is_regional_capital: !!province.is_regional_capital,
    is_founded: !!province.is_founded,
    is_joined: !!province.is_joined,
    is_conquered: !!province.is_conquered,
    provincial_population: province.provincial_population,
    assemblypeople: province.assemblypeople,
    prelates: province.prelates,
    political_features: province.political_features,
    assembly,
    prelates: {
      ...prelates,
      seat_count: province.prelates,
    },
    national_prelate_delegation,
    counties: counties.map((county) => ({
      name: county.name,
      tile_id: county.tile_id,
      county_population: county.county_population,
      county_population_share: county.county_population_share,
      political_features: county.political_features,
      vote_shares: county.vote_shares,
      raw_scores: county.raw_scores,
      adjusted_scores: county.adjusted_scores,
      improvement_name: county.improvement_name,
      terrain: county.terrain,
    })),
  }
}

function aggregateRegions(provinces) {
  const regions = {}

  provinces.forEach((province) => {
    const group = province.group || 'Unassigned'
    if (!regions[group]) {
      regions[group] = {
        name: group,
        assembly: { seats: createEmptySeats(), vote_shares: emptyPartyMap() },
        prelates: { seats: createEmptySeats(), vote_shares: emptyPartyMap() },
        province_count: 0,
        population: 0,
        assemblypeople: 0,
        prelate_count: 0,
        provinces: [],
      }
    }

    const region = regions[group]
    region.province_count += 1
    region.population += province.provincial_population
    region.assemblypeople += province.assemblypeople
    region.prelate_count += province.prelates.seat_count
    region.provinces.push(province.name)
    PARTIES.forEach((party) => {
      region.assembly.seats[party] += num(province.assembly.seats[party])
      region.prelates.seats[party] += num(province.prelates.seats[party])
      region.assembly.vote_shares[party] += num(province.assembly.vote_shares[party]) * province.provincial_population
      region.prelates.vote_shares[party] += num(province.prelates.vote_shares[party]) * province.provincial_population
    })
  })

  Object.values(regions).forEach((region) => {
    PARTIES.forEach((party) => {
      region.assembly.vote_shares[party] = region.population ? region.assembly.vote_shares[party] / region.population : 0
      region.prelates.vote_shares[party] = region.population ? region.prelates.vote_shares[party] / region.population : 0
    })
  })

  return regions
}

function addRegionControls(regions, trends) {
  Object.values(regions).forEach((region) => {
    region.assembly.control = determineHouseControl(region.assembly.seats, trends)
    region.prelates.control = determineHouseControl(region.prelates.seats, trends)
    region.dominant_party = region.assembly.control.leaderParty
  })
  return regions
}

function calculateNational(provinces, config) {
  const features = calculateNationalFeatures(provinces)
  const unit = { id: 'national', name: 'National', political_features: features, features }
  const rawScores = calculateNationalPartyScores(features)
  const trendScores = applyTrends(rawScores, unit, 'national', config.trends)
  const adjustedScores = applyJitter(trendScores, { national: 'national' }, config)
  const voteShares = scoresToVoteShares(adjustedScores)
  const assemblySeatCount = provinces.reduce((sum, province) => sum + num(province.assemblypeople), 0)
  const prelateSeatCount = provinces.reduce((sum, province) => sum + num(province.prelates.seat_count), 0)
  const assemblySeats = apportionSainteLague(voteShares, assemblySeatCount, {
    threshold: THRESHOLDS.nationalAssembly,
    rawScores: adjustedScores,
  })
  const prelateSeats = sumPartyMaps(provinces.map((province) => province.national_prelate_delegation))

  return {
    features,
    population: features.national_population,
    assembly: {
      vote_shares: voteShares,
      seats: assemblySeats,
      control: determineHouseControl(assemblySeats, config.trends),
      raw_scores: rawScores,
      adjusted_scores: adjustedScores,
      seat_count: assemblySeatCount,
    },
    prelates: {
      seats: prelateSeats,
      control: determineHouseControl(prelateSeats, config.trends),
      seat_count: prelateSeatCount,
    },
  }
}

function validateResults(provinces, national) {
  const warnings = []
  const validation = {
    countyPopulation: true,
    voteShares: true,
    seatCounts: true,
  }

  provinces.forEach((province) => {
    const countyPop = province.counties.reduce((sum, county) => sum + num(county.county_population), 0)
    if (countyPop !== province.provincial_population) {
      validation.countyPopulation = false
      warnings.push(`${province.name}: county population does not sum to provincial population`)
    }

    const assemblySeatTotal = sumObjectValues(province.assembly.seats)
    const prelateSeatTotal = sumObjectValues(province.prelates.seats)
    if (assemblySeatTotal !== province.assemblypeople || prelateSeatTotal !== province.prelates.seat_count) {
      validation.seatCounts = false
      warnings.push(`${province.name}: chamber seat totals do not match available seats`)
    }

    const voteChecks = [
      province.assembly.vote_shares,
      province.prelates.vote_shares,
      ...province.counties.map((county) => county.vote_shares),
    ]
    voteChecks.forEach((shares) => {
      if (Math.abs(sumObjectValues(shares) - 1) > 0.000001) validation.voteShares = false
    })

    if (!province.counties.length) warnings.push(`${province.name}: no counties available`)
    if (province.group === 'Unassigned') warnings.push(`${province.name}: no province group assigned`)
  })

  if (sumObjectValues(national.assembly.seats) !== national.assembly.seat_count) {
    validation.seatCounts = false
    warnings.push('National Assembly seat total does not match available seats')
  }
  if (sumObjectValues(national.prelates.seats) !== national.prelates.seat_count) {
    validation.seatCounts = false
    warnings.push('National Prelate seat total does not match available seats')
  }

  if (!validation.voteShares) warnings.push('One or more vote shares did not sum to 1')

  return { warnings, validation }
}

export function simulateElection({ data, provinceRows = [], electionConfig = {} } = {}) {
  const config = mergeConfig(electionConfig)
  const rows = Array.isArray(provinceRows) ? provinceRows : []
  const provinces = rows.map((row) => buildProvinceResult(data || {}, row, config))
  const regions = addRegionControls(aggregateRegions(provinces), config.trends)
  const national = calculateNational(provinces, config)
  const diagnostics = validateResults(provinces, national)

  if (!provinces.length) {
    diagnostics.warnings.push('No province data loaded')
  }

  return {
    config,
    parties: PARTY_META,
    provinces,
    regions,
    national,
    diagnostics: {
      ...diagnostics,
      validation: Object.fromEntries(
        Object.entries(diagnostics.validation).map(([key, value]) => [key, Boolean(value)])
      ),
    },
  }
}

export function formatShare(value) {
  return `${roundTo(num(value) * 100, 1)}%`
}

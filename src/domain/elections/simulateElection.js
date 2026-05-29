import { THRESHOLDS, APPORTIONMENT, DEFAULT_VOLATILITY, DEFAULT_VOTE_BLEND, BASELINE_ELECTION_CONFIG } from './constants/apportionmentRules'
import { PARTIES, normalizePartyConfig, partyMetaFromConfig, partyNamesFromConfig } from './constants/parties'
import { DEFAULT_VOTER_BLOCS } from './constants/defaultVoterBlocs'
import { aggregateNationalBlocMembership } from './features/voterBlocs'
import { apportionDHondt, apportionModifiedSainteLague, apportionSainteLague, createEmptySeats } from './apportionment/highestAverages'
import { allocateCountyPopulations } from './population/allocateCountyPopulations'
import { calculateCountyFeatures } from './features/countyFeatures'
import { calculateNationalFeatures } from './features/nationalFeatures'
import { calculateProvinceBaseFeatures, calculateProvinceFeatures } from './features/provinceFeatures'
import { buildEmpireReligionTotals } from './features/religionDistribution'
import { calculateCountyPartyScores } from './scoring/countyScores'
import { calculateNationalPartyScores } from './scoring/nationalScores'
import { calculateProvincePartyScores } from './scoring/provinceScores'
import { emptyPartyMap, scoresToVoteShares, sumPartyMaps, weightedVoteShares } from './scoring/normalizeScores'
import { applyJitter } from './randomness/jitter'
import { applyTrends } from './trends/applyTrends'
import { clamp, num, roundTo, sumObjectValues } from './normalization/numbers'
import { determineHouseControl } from './coalitions/houseControl'
import { applyNeighborInfluence } from './scoring/applyNeighborInfluence'

function mergeConfig(electionConfig = {}, rules = {}) {
  const volatilityBase = rules.volatility || DEFAULT_VOLATILITY
  const voteBlendBase = rules.voteBlend || DEFAULT_VOTE_BLEND
  return {
    ...BASELINE_ELECTION_CONFIG,
    apportionment: { ...APPORTIONMENT, ...(rules.apportionment || {}) },
    thresholds: { ...THRESHOLDS, ...(rules.thresholds || {}) },
    ...electionConfig,
    volatility: {
      ...volatilityBase,
      ...(electionConfig.volatility || {}),
    },
    voteBlend: {
      ...voteBlendBase,
      ...(electionConfig.voteBlend || {}),
    },
    trends: Array.isArray(electionConfig.trends) ? electionConfig.trends : [],
  }
}

// Select the highest-averages method by config name.
function apportionByMethod(method, voteShares, seatCount, options = {}) {
  switch (method) {
    case 'sainteLague': return apportionSainteLague(voteShares, seatCount, options)
    case 'modifiedSainteLague': return apportionModifiedSainteLague(voteShares, seatCount, options)
    case 'dhondt':
    default: return apportionDHondt(voteShares, seatCount, options)
  }
}

function normalizeVoteShares(shares = {}, parties) {
  const list = parties || Object.keys(shares || {})
  const totals = Object.fromEntries(list.map((party) => [party, Math.max(0, num(shares?.[party]))]))
  const total = sumObjectValues(totals)
  if (total <= 0) return scoresToVoteShares(totals, list)
  return Object.fromEntries(list.map((party) => [party, totals[party] / total]))
}

function blendVoteShares(localShares, climateShares, localWeight, parties) {
  const list = parties || Object.keys({ ...localShares, ...climateShares })
  const local = clamp(num(localWeight, 0.5), 0, 1)
  const climate = 1 - local
  return normalizeVoteShares(Object.fromEntries(list.map((party) => [
    party,
    local * num(localShares?.[party]) + climate * num(climateShares?.[party]),
  ])), list)
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

// Pass-through keys that must NOT be magnified (population, names, ids, raw diagnostic).
const MAGNIFIER_PASSTHROUGH_KEYS = new Set([
  'county_population',
  'county_population_share',
  'improvement_name',
  'maritime_basin_name',
  'river_name',
  'citizens_working_index',
])

function citizenMagnifier(rawCitizens) {
  if (rawCitizens === null || rawCitizens === undefined || rawCitizens === '') return 0.70
  const c = Number(rawCitizens)
  if (!Number.isFinite(c)) return 0.70
  if (c <= 0) return 0.80
  if (c <= 1) return 0.95
  if (c <= 2) return 1.10
  return 1.25
}

function applyCitizenMagnifier(features, rawCitizens) {
  const M = citizenMagnifier(rawCitizens)
  const result = {}
  for (const [key, value] of Object.entries(features)) {
    if (MAGNIFIER_PASSTHROUGH_KEYS.has(key) || typeof value !== 'number') {
      result[key] = value
      continue
    }
    const scaled = value * M
    result[key] = scaled < 0 ? 0 : scaled > 1 ? 1 : scaled
  }
  result.citizen_magnifier = M
  return result
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

function countyHasMeaningfulDetails(county = {}) {
  const improvementName = String(county?.improvement?.name || '').trim()
  const hasEnabledObjectValue = (value) =>
    value && typeof value === 'object' && Object.values(value).some(Boolean)

  return Boolean(
    String(county?.name || '').trim() ||
    String(county?.terrain || '').trim() ||
    String(county?.resource || '').trim() ||
    improvementName ||
    hasEnabledObjectValue(county?.features) ||
    hasEnabledObjectValue(county?.improvement?.buildings) ||
    hasEnabledObjectValue(county?.improvement?.great_works) ||
    sumObjectValues(county?.yields || {}) > 0 ||
    num(county?.citizens_working) > 0 ||
    county?.appeal !== null && county?.appeal !== undefined && county?.appeal !== '' ||
    county?.river === true ||
    county?.has_railroad === true
  )
}

function countyDataQuality(province = {}, row = {}) {
  const counties = Array.isArray(province?.counties) ? province.counties : []
  const countyCount = num(row.countyCount, counties.length)
  const detailCount = num(
    row.countyDetailCount,
    counties.reduce((sum, county) => sum + (countyHasMeaningfulDetails(county) ? 1 : 0), 0)
  )
  const detailShare = countyCount > 0 ? detailCount / countyCount : 0

  if (countyCount <= 1) return 'stub'
  if (countyCount >= 12 && detailShare >= 0.5) return 'rich'
  return 'sparse'
}

function calculateCountyVote(county, province, config) {
  const rawScores = calculateCountyPartyScores(county, province, { parties: config.partyDefs, voterBlocs: config.voterBlocs })
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

function calculateProvinceAssembly(province, counties, config) {
  const scoringOptions = { parties: config.partyDefs, voterBlocs: config.voterBlocs }
  const rawScores = applyNeighborInfluence(calculateProvincePartyScores(province, scoringOptions), province, scoringOptions)
  const trendScores = applyTrends(rawScores, province, 'province', config.trends)
  const adjustedScores = applyJitter(trendScores, {
    national: 'national',
    region: province.group || 'Unassigned',
    province: province.city_id || province.provinceIndex,
  }, config)
  const climateVoteShares = scoresToVoteShares(adjustedScores)
  const localVoteShares = weightedVoteShares(
    counties,
    (county) => county.county_population,
    (county) => county.vote_shares
  )
  const localWeight = num(config.voteBlend?.provincialAssemblyLocalWeight, 0.65)
  const voteShares = blendVoteShares(localVoteShares, climateVoteShares, localWeight)
  const seats = apportionByMethod(config.apportionment?.provincialAssembly, voteShares, province.assemblypeople, {
    threshold: config.thresholds?.provincialAssembly ?? THRESHOLDS.provincialAssembly,
    rawScores: adjustedScores,
  })

  return {
    vote_shares: voteShares,
    local_vote_shares: localVoteShares,
    climate_vote_shares: climateVoteShares,
    vote_blend: {
      local_weight: clamp(localWeight, 0, 1),
      climate_weight: 1 - clamp(localWeight, 0, 1),
    },
    seats,
    control: determineHouseControl(seats, config.trends, config.partyNames, null, config.coalitionPartners),
    raw_scores: rawScores,
    adjusted_scores: adjustedScores,
  }
}

function calculateProvincePrelates(province, counties, config, priorControl = null) {
  const voteShares = weightedVoteShares(
    counties,
    (county) => county.county_population,
    (county) => county.vote_shares
  )
  const seats = apportionByMethod(config.apportionment?.provincialPrelates, voteShares, province.prelates, {
    threshold: config.thresholds?.provincialPrelates ?? THRESHOLDS.provincialPrelates,
  })

  return {
    vote_shares: voteShares,
    seats,
    control: determineHouseControl(seats, config.trends, config.partyNames, priorControl, config.coalitionPartners),
  }
}

function calculateProvincePrelatesCouncil(counties, config, priorControl = null) {
  const seats = createEmptySeats(config.partyList)
  counties.forEach((county) => {
    if (num(county.county_population) <= 0) return
    let winner = null
    let winnerShare = -Infinity
    for (const party of Object.keys(county.vote_shares)) {
      const share = num(county.vote_shares[party])
      if (share > winnerShare) {
        winnerShare = share
        winner = party
      }
    }
    if (winner !== null && Object.prototype.hasOwnProperty.call(seats, winner)) {
      seats[winner] += 1
    }
  })

  const voteShares = weightedVoteShares(
    counties,
    (county) => county.county_population,
    (county) => county.vote_shares
  )

  return {
    vote_shares: voteShares,
    seats,
    control: determineHouseControl(seats, config.trends, config.partyNames, priorControl, config.coalitionPartners),
  }
}

function buildProvinceFeatureUnit(data, row) {
  const nationalCapitalContinent = (data?.provinces || []).find(p => p.is_national_capital)?.continent ?? null
  const country = { ...(data?.country || {}), national_capital_continent: nationalCapitalContinent }
  const provinceInput = createProvinceInput(data, row)
  const calculations = data?.config?.calculations
  const empireReligionTotals = buildEmpireReligionTotals(data, calculations)
  const featureOptions = { provinceIndex: provinceInput.provinceIndex, empireReligionTotals, calculations }
  const baseFeatures = calculateProvinceBaseFeatures(provinceInput, country, featureOptions)
  const allocatedCounties = allocateCountyPopulations(provinceInput, provinceInput.provincial_population)
  const preliminaryCountyUnits = allocatedCounties.map((county, index) => {
    const countyUnit = makeCountyUnit(county, index, provinceInput)
    return {
      ...countyUnit,
      political_features: applyCitizenMagnifier(
        calculateCountyFeatures(county, {
          ...baseFeatures,
          is_conquered: provinceInput.is_conquered,
        }),
        county.citizens_working,
      ),
    }
  })
  const provinceFeatures = calculateProvinceFeatures(
    provinceInput,
    country,
    preliminaryCountyUnits,
    provinceInput.provincial_population,
    featureOptions
  )
  const province = {
    ...provinceInput,
    group: provinceInput.group || 'Unassigned',
    political_features: provinceFeatures,
  }

  return {
    province,
    counties: preliminaryCountyUnits,
  }
}

function provinceNameKey(value) {
  return String(value || '').trim().toLowerCase()
}

function provinceRowsByName(data = {}, rows = []) {
  const byName = new Map()
  rows.forEach((row) => {
    const raw = rawProvinceFor(data, row)
    const name = row?.name || raw?.name
    if (name) byName.set(provinceNameKey(name), row)
  })
  return byName
}

function adjacentProvinceUnitsFromCache(province = {}, featureUnitsByName = new Map()) {
  return (Array.isArray(province.closest_provinces) ? province.closest_provinces : [])
    .map((entry) => {
      const unit = featureUnitsByName.get(provinceNameKey(entry?.province_name))
      if (!unit) return null
      return {
        ...unit.province,
        distance: num(entry?.distance),
      }
    })
    .filter(Boolean)
}

function buildFeatureUnitsByName(data, rows) {
  const map = new Map()
  rows.forEach((row) => {
    const raw = rawProvinceFor(data, row)
    const name = row?.name || raw?.name
    const key = provinceNameKey(name)
    if (!key) return
    map.set(key, buildProvinceFeatureUnit(data, row))
  })
  return map
}

function buildProvinceResult(data, row, config, featureUnitsByName = null) {
  const raw = rawProvinceFor(data, row)
  const ownKey = provinceNameKey(row?.name || raw?.name)
  const cachedUnit = featureUnitsByName ? featureUnitsByName.get(ownKey) : null
  const { province: provinceBase, counties: preliminaryCountyUnits } = cachedUnit || buildProvinceFeatureUnit(data, row)
  const unitsByName = featureUnitsByName || new Map([[ownKey, { province: provinceBase, counties: preliminaryCountyUnits }]])
  const province = {
    ...provinceBase,
    adjacent_provinces: adjacentProvinceUnitsFromCache(provinceBase, unitsByName),
  }
  const nationalCapitalContinent = (data?.provinces || []).find(p => p.is_national_capital)?.continent ?? null
  const isCrossContinental = !!nationalCapitalContinent && !!province.continent && province.continent !== nationalCapitalContinent
  const provinceConfig = isCrossContinental ? {
    ...config,
    voteBlend: { ...config.voteBlend, provincialAssemblyLocalWeight: 0.75 },
    volatility: { ...config.volatility, province: (config.volatility?.province ?? 0.12) * 1.3 },
  } : config
  const counties = preliminaryCountyUnits.map((county) => {
    const features = applyCitizenMagnifier(
      calculateCountyFeatures(county, {
        ...province.political_features,
        is_conquered: province.is_conquered,
      }),
      county.citizens_working,
    )
    return calculateCountyVote({ ...county, political_features: features }, province, provinceConfig)
  })
  const assembly = calculateProvinceAssembly(province, counties, provinceConfig)
  const usesCountyCouncil = counties.length > 20
  const prelates = usesCountyCouncil
    ? calculateProvincePrelatesCouncil(counties, config, assembly.control)
    : calculateProvincePrelates(province, counties, config, assembly.control)
  const prelateSeatCount = usesCountyCouncil
    ? counties.filter((county) => num(county.county_population) > 0).length
    : province.prelates
  const national_prelate_delegation = apportionDHondt(assembly.vote_shares, province.prelates, {
    threshold: config.thresholds?.nationalPrelates ?? THRESHOLDS.nationalPrelates,
    rawScores: assembly.adjusted_scores,
  })

  return {
    provinceIndex: province.provinceIndex,
    name: province.name,
    group: province.group || 'Unassigned',
    city_id: province.city_id,
    continent: province.continent || null,
    is_national_capital: !!province.is_national_capital,
    is_regional_capital: !!province.is_regional_capital,
    is_founded: !!province.is_founded,
    is_joined: !!province.is_joined,
    is_conquered: !!province.is_conquered,
    original_country: province.original_country || '',
    closest_provinces: province.closest_provinces || [],
    adjacent_provinces: province.adjacent_provinces.map((adjacent) => ({
      name: adjacent.name,
      group: adjacent.group,
      original_country: adjacent.original_country || '',
      distance: adjacent.distance,
      political_features: adjacent.political_features,
    })),
    provincial_population: province.provincial_population,
    assemblypeople: province.assemblypeople,
    raw_prelate_count: province.prelates,
    county_data_quality: countyDataQuality(raw, row),
    political_features: province.political_features,
    assembly,
    prelates: {
      ...prelates,
      seat_count: prelateSeatCount,
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
      resource: county.resource,
    })),
  }
}

function aggregateRegions(provinces, parties = PARTIES) {
  const regions = {}

  provinces.forEach((province) => {
    const group = province.group || 'Unassigned'
    if (!regions[group]) {
      regions[group] = {
        name: group,
        assembly: { seats: createEmptySeats(parties), vote_shares: emptyPartyMap(0, parties) },
        prelates: { seats: createEmptySeats(parties), vote_shares: emptyPartyMap(0, parties) },
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
    parties.forEach((party) => {
      region.assembly.seats[party] += num(province.assembly.seats[party])
      region.prelates.seats[party] += num(province.prelates.seats[party])
      region.assembly.vote_shares[party] += num(province.assembly.vote_shares[party]) * province.provincial_population
      region.prelates.vote_shares[party] += num(province.prelates.vote_shares[party]) * province.provincial_population
    })
  })

  Object.values(regions).forEach((region) => {
    parties.forEach((party) => {
      region.assembly.vote_shares[party] = region.population ? region.assembly.vote_shares[party] / region.population : 0
      region.prelates.vote_shares[party] = region.population ? region.prelates.vote_shares[party] / region.population : 0
    })
  })

  return regions
}

function addRegionControls(regions, trends, partyNames, coalitionPartners) {
  Object.values(regions).forEach((region) => {
    region.assembly.control = determineHouseControl(region.assembly.seats, trends, partyNames, null, coalitionPartners)
    region.prelates.control = determineHouseControl(region.prelates.seats, trends, partyNames, region.assembly.control, coalitionPartners)
    region.dominant_party = region.assembly.control.leaderParty
  })
  return regions
}

function calculateNational(provinces, config) {
  const features = calculateNationalFeatures(provinces)
  const unit = { id: 'national', name: 'National', political_features: features, features }
  const blocMembership = aggregateNationalBlocMembership(provinces, config.voterBlocs)
  const rawScores = calculateNationalPartyScores(features, {
    parties: config.partyDefs,
    voterBlocs: config.voterBlocs,
    blocMembership,
  })
  const trendScores = applyTrends(rawScores, unit, 'national', config.trends)
  const adjustedScores = applyJitter(trendScores, { national: 'national' }, config)
  const climateVoteShares = scoresToVoteShares(adjustedScores)
  const localVoteShares = weightedVoteShares(
    provinces,
    (province) => province.provincial_population,
    (province) => province.assembly.vote_shares
  )
  const localWeight = num(config.voteBlend?.nationalAssemblyLocalWeight, 0.7)
  const voteShares = blendVoteShares(localVoteShares, climateVoteShares, localWeight)
  const assemblySeatCount = provinces.reduce((sum, province) => sum + num(province.assemblypeople), 0)
  const prelateSeatCount = provinces.reduce((sum, province) => sum + num(province.raw_prelate_count), 0)
  const assemblySeats = apportionByMethod(config.apportionment?.nationalAssembly, voteShares, assemblySeatCount, {
    threshold: config.thresholds?.nationalAssembly ?? THRESHOLDS.nationalAssembly,
    rawScores: adjustedScores,
  })
  const prelateSeats = sumPartyMaps(provinces.map((province) => province.national_prelate_delegation))
  // Population-weighted national council (prelate) popular vote.
  const prelateVoteShares = weightedVoteShares(
    provinces,
    (province) => province.provincial_population,
    (province) => province.prelates.vote_shares
  )

  return {
    features,
    population: features.national_population,
    assembly: {
      vote_shares: voteShares,
      local_vote_shares: localVoteShares,
      climate_vote_shares: climateVoteShares,
      vote_blend: {
        local_weight: clamp(localWeight, 0, 1),
        climate_weight: 1 - clamp(localWeight, 0, 1),
      },
      seats: assemblySeats,
      control: determineHouseControl(assemblySeats, config.trends, config.partyNames, null, config.coalitionPartners),
      raw_scores: rawScores,
      adjusted_scores: adjustedScores,
      seat_count: assemblySeatCount,
    },
    prelates: {
      vote_shares: prelateVoteShares,
      seats: prelateSeats,
      control: determineHouseControl(prelateSeats, config.trends, config.partyNames, determineHouseControl(assemblySeats, config.trends, config.partyNames, null, config.coalitionPartners), config.coalitionPartners),
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

// Granular pipeline exports — used by the reactive electionPipeline composable
// to cache per-province work and avoid re-simulating the entire country on
// every keystroke.
export {
  mergeConfig,
  buildProvinceFeatureUnit,
  buildFeatureUnitsByName,
  buildProvinceResult,
  aggregateRegions,
  addRegionControls,
  calculateNational,
  validateResults,
  provinceNameKey,
}

function partyConfigBits(data) {
  const source = data?.config?.parties ?? data?.election_parties
  const partyDefs = normalizePartyConfig(source)
  return {
    partyDefs,
    partyList: partyDefs.map((party) => party.id),
    partyMeta: partyMetaFromConfig(source),
    partyNames: partyNamesFromConfig(source),
    coalitionPartners: Object.fromEntries(partyDefs.map((party) => [party.id, party.coalitionPartners || []])),
    voterBlocs: Array.isArray(data?.config?.voterBlocs) ? data.config.voterBlocs : DEFAULT_VOTER_BLOCS,
  }
}

export function buildElectionConfig(data, electionConfig = {}) {
  return {
    ...mergeConfig(electionConfig, data?.config?.elections || {}),
    ...partyConfigBits(data),
  }
}

export function simulateElection({ data, provinceRows = [], electionConfig = {} } = {}) {
  const config = buildElectionConfig(data, electionConfig)
  const { partyMeta, partyList, coalitionPartners } = config
  const rows = Array.isArray(provinceRows) ? provinceRows : []
  const featureUnitsByName = buildFeatureUnitsByName(data || {}, rows)
  const provinces = rows.map((row) => buildProvinceResult(data || {}, row, config, featureUnitsByName))
  const regions = addRegionControls(aggregateRegions(provinces, partyList), config.trends, config.partyNames, coalitionPartners)
  const national = calculateNational(provinces, config)
  const diagnostics = validateResults(provinces, national)

  if (!provinces.length) {
    diagnostics.warnings.push('No province data loaded')
  }

  return {
    config,
    parties: partyMeta,
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

import { DEFAULT_VOLATILITY } from './constants/apportionmentRules'
import { PARTY_META } from './constants/parties'
import { RANDOM_TREND_TEMPLATES, generateTrendPackageFromSelections } from './trends/randomizeTrends'

const DEFAULT_ENDPOINT = 'http://localhost:1234/api/v1/chat'
const DEFAULT_MODEL = 'qwen/qwen3.5-9b'
const DEFAULT_CONTEXT_LENGTH = 262144
const MAX_TEMPLATE_DESCRIPTION = 160
const MAX_TEMPLATE_HOOK = 150
const MAX_TEMPLATE_BEAT = 90
const MAX_SCENARIO_NAME = 72
const MAX_SCENARIO_DESCRIPTION = 260
const MAX_WORLD_PROVINCES = 24
const MAX_GROUP_SUMMARIES = 16
const MAX_TOP_CONTEXT_VALUES = 8
const CLIMATE_SUMMARY_TOKEN_BUDGETS = [480, 900]
const MAX_CUSTOM_TRENDS = 3
const MAX_CUSTOM_EFFECTS = 4
const CUSTOM_EFFECT_LEVELS = ['national', 'province', 'county']
const CUSTOM_MODES = ['boost', 'suppress']
const CUSTOM_MAGNITUDE_LIMITS = {
  national: 0.16,
  province: 0.22,
  county: 0.26,
}
const FEATURE_ALLOWLIST = [
  'state_religion_share',
  'minority_religion_share',
  'taoist_share',
  'american_identity_index',
  'roman_identity_index',
  'imperial_core_index',
  'urbanization_index',
  'urban_index',
  'rural_index',
  'industrial_index',
  'agrarian_index',
  'military_index',
  'intellectual_index',
  'spiritual_index',
  'commerce_index',
  'commercial_index',
  'commercial_middle_class_index',
  'cultural_elite_index',
  'worker_index',
  'worker_grievance_index',
  'infrastructure_index',
  'appeal_index',
  'localist_index',
  'traditionalist_index',
  'restorationist_index',
  'coastal_index',
  'maritime_index',
  'mountain_index',
  'wilderness_index',
  'residential_index',
  'extractive_index',
  'leisure_tourism_index',
  'civic_monument_index',
  'terrain_habitation_index',
  'loyalty_index',
  'happiness_index',
  'growth_index',
  'amenity_index',
  'food_index',
  'production_index',
  'gold_index',
  'culture_index',
  'science_index',
  'faith_index',
  'county_population_share',
  'distance_index',
  'citizens_working_index',
  'mine_or_corporation_index',
  'neighborhood_index',
  'religious_minority_index',
]
const SELECTOR_SHORTCUTS = [
  'minIndustrialIndex',
  'minProductionIndex',
  'minTaoistShare',
  'minRomanIdentityIndex',
  'minImperialCoreIndex',
  'minAgrarianIndex',
  'minLocalistIndex',
  'minSpiritualIndex',
  'minMilitaryIndex',
  'minIntellectualIndex',
  'minCommercialMiddleClassIndex',
  'minCulturalEliteIndex',
  'minInfrastructureIndex',
  'minCoastalIndex',
  'minMaritimeIndex',
  'minMountainIndex',
  'minWildernessIndex',
  'minResidentialIndex',
  'minExtractiveIndex',
  'minLeisureTourismIndex',
  'minCivicMonumentIndex',
  'minWorkerGrievanceIndex',
  'minLoyaltyIndex',
  'maxLoyaltyIndex',
  'maxUrbanIndex',
]

class ModelOutputError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'ModelOutputError'
    this.code = code
  }
}

function truncate(value, length = MAX_TEMPLATE_DESCRIPTION) {
  const text = String(value || '')
  return text.length > length ? `${text.slice(0, length - 3)}...` : text
}

function asArray(value) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function uniqueList(values = [], max = Number.POSITIVE_INFINITY) {
  const seen = new Set()
  const result = []

  for (const value of values.flatMap(asArray)) {
    const text = String(value || '').trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    result.push(text)
    if (result.length >= max) break
  }

  return result
}

function numberOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function roundNumber(value, decimals = 1) {
  const number = numberOrNull(value)
  if (number === null) return null
  const factor = 10 ** decimals
  return Math.round(number * factor) / factor
}

function integerOrNull(value) {
  const number = numberOrNull(value)
  return number === null ? null : Math.round(number)
}

function clampNumber(value, min, max, fallback) {
  const number = numberOrNull(value)
  const safe = number === null ? fallback : number
  return Math.max(min, Math.min(max, safe))
}

function compactObject(source = {}) {
  return Object.fromEntries(
    Object.entries(source || {}).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0
      if (value && typeof value === 'object') return Object.keys(value).length > 0
      return value !== undefined && value !== null && value !== ''
    })
  )
}

function slug(value, fallback = 'custom') {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || fallback
}

function partyLegend() {
  return Object.entries(PARTY_META).map(([id, meta]) => ({
    id,
    name: meta.name,
    ideology: meta.ideology,
  }))
}

function templateParties(template) {
  return uniqueList([
    template?.party,
    ...(template?.effects || []).flatMap((effect) => asArray(effect?.party)),
  ])
}

function templateLevels(template) {
  return uniqueList([
    template?.level,
    ...(template?.scope || []),
    ...(template?.effects || []).flatMap((effect) => asArray(effect?.level)),
  ])
}

function templateSummaries() {
  return RANDOM_TREND_TEMPLATES.map((template) => {
    const beats = (template.narrative?.beats || [])
      .slice(0, 3)
      .map((beat) => truncate(beat, MAX_TEMPLATE_BEAT))

    return compactObject({
      id: template.id,
      label: template.label,
      kind: template.complexity,
      family: template.family,
      levels: templateLevels(template),
      parties: templateParties(template),
      signals: uniqueList([...(template.tags || []), ...(template.narrative?.promptTags || [])], 10),
      summary: truncate(template.description),
      hook: truncate(template.narrative?.hook || '', MAX_TEMPLATE_HOOK),
      beats,
      effects: (template.effects || []).slice(0, 5).map((effect) => compactObject({
        level: effect.level || template.level,
        party: effect.party || template.party,
        mode: effect.mode || 'boost',
        selector: effect.selector || template.selector || {},
      })),
      strengthRange: Array.isArray(template.magnitudeRange)
        ? template.magnitudeRange.map((value) => roundNumber(value, 2))
        : null,
    })
  })
}

function trendSummaries(trends = []) {
  return trends.map((trend) => {
    const magnitude = Number(trend?.magnitude)
    return compactObject({
      templateId: trend?.templateId,
      label: trend?.label,
      summary: truncate(trend?.description, 140),
      parties: uniqueList([
        trend?.party,
        ...(trend?.effects || []).flatMap((effect) => asArray(effect?.party)),
      ]),
      levels: uniqueList([...(trend?.scope || []), trend?.level]),
      signals: uniqueList([...(trend?.tags || []), ...(trend?.narrative?.promptTags || [])], 8),
      hook: truncate(trend?.narrative?.hook || '', 120),
      reason: truncate(trend?.narrative?.reason || '', 120),
      magnitude: Number.isFinite(magnitude) ? Number(magnitude.toFixed(3)) : null,
    })
  })
}

function groupName(group) {
  if (group && typeof group === 'object') return String(group.name || group.label || 'Unassigned')
  return String(group || 'Unassigned')
}

function provinceFlags(province = {}) {
  const flags = []
  if (province.is_national_capital) flags.push('national_capital')
  if (province.is_regional_capital) flags.push('regional_capital')
  if (province.is_founded) flags.push('founded')
  if (province.is_joined) flags.push('joined')
  if (province.is_conquered) flags.push('conquered')
  return flags
}

function dominantReligion(province = {}) {
  if (province.dominant_religion) return province.dominant_religion
  const religions = Array.isArray(province.religions) ? province.religions : []
  const topReligion = religions
    .map((religion) => ({
      name: String(religion?.name || '').trim(),
      followers: numberOrNull(religion?.followers) ?? 0,
    }))
    .filter((religion) => religion.name)
    .sort((a, b) => b.followers - a.followers)[0]

  return topReligion?.name || null
}

function topYieldValues(yields = {}, max = 3) {
  return Object.fromEntries(
    Object.entries(yields || {})
      .map(([key, value]) => [key, roundNumber(value, 1)])
      .filter(([, value]) => value !== null && value > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, max)
  )
}

function provinceContextScore(province = {}, index = 0) {
  const population = numberOrNull(province.provincial_population) ?? (numberOrNull(province.population) ?? 0) * 1_000_000
  return population +
    (province.is_national_capital ? 100_000_000 : 0) +
    (province.is_regional_capital ? 65_000_000 : 0) +
    (province.is_conquered ? 45_000_000 : 0) +
    (province.is_joined ? 20_000_000 : 0) +
    (province.is_founded ? 12_000_000 : 0) -
    index
}

function provinceSummaries(data, max = MAX_WORLD_PROVINCES) {
  return (data?.provinces || [])
    .map((province, index) => ({ province, index, score: provinceContextScore(province, index) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ province }) => compactObject({
      name: province.name || 'Unnamed province',
      group: province.group || 'Unassigned',
      population: integerOrNull(province.provincial_population ?? province.population),
      flags: provinceFlags(province),
      loyalty: roundNumber(province.loyalty, 1),
      happiness: roundNumber(province.happiness_percentage, 1),
      growth: roundNumber(province.growth_percentage, 1),
      religion: dominantReligion(province),
      topYields: topYieldValues(province.yields),
      notes: truncate(province.notes || '', 100),
    }))
}

function ensureGroup(groups, name) {
  if (!groups.has(name)) {
    groups.set(name, {
      name,
      provinceCount: 0,
      regionalCapitals: [],
      nationalCapitals: [],
      conqueredCount: 0,
      joinedCount: 0,
      foundedCount: 0,
    })
  }
  return groups.get(name)
}

function provinceGroupSummaries(data) {
  const groups = new Map()

  for (const group of data?.province_groups || []) {
    const name = groupName(group)
    const entry = ensureGroup(groups, name)
    if (group && typeof group === 'object') {
      entry.population = integerOrNull(group.regional_population ?? group.population)
      entry.assemblypeople = integerOrNull(group.assemblypeople)
      entry.prelates = integerOrNull(group.prelates)
    }
  }

  for (const province of data?.provinces || []) {
    const entry = ensureGroup(groups, province.group || 'Unassigned')
    entry.provinceCount += 1
    if (province.is_regional_capital && province.name) entry.regionalCapitals.push(province.name)
    if (province.is_national_capital && province.name) entry.nationalCapitals.push(province.name)
    if (province.is_conquered) entry.conqueredCount += 1
    if (province.is_joined) entry.joinedCount += 1
    if (province.is_founded) entry.foundedCount += 1
  }

  return [...groups.values()]
    .map((group) => compactObject({
      ...group,
      regionalCapitals: group.regionalCapitals.slice(0, 3),
      nationalCapitals: group.nationalCapitals.slice(0, 2),
    }))
    .sort((a, b) => (numberOrNull(b.population) ?? b.provinceCount) - (numberOrNull(a.population) ?? a.provinceCount))
    .slice(0, MAX_GROUP_SUMMARIES)
}

function incrementCounter(counter, value) {
  const text = String(value || '').trim()
  if (!text) return
  counter.set(text, (counter.get(text) || 0) + 1)
}

function topCounter(counter, max = MAX_TOP_CONTEXT_VALUES) {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([name, count]) => ({ name, count }))
}

function countySignals(data) {
  const terrains = new Map()
  const resources = new Map()
  const improvements = new Map()
  const buildings = new Map()
  let countyCount = 0
  let namedCountyCount = 0
  let railroadCount = 0
  let riverCountyCount = 0

  for (const province of data?.provinces || []) {
    for (const county of province.counties || []) {
      countyCount += 1
      if (String(county?.name || '').trim()) namedCountyCount += 1
      if (county?.has_railroad) railroadCount += 1
      if (county?.river) riverCountyCount += 1
      incrementCounter(terrains, county?.terrain)
      incrementCounter(resources, county?.resource)
      incrementCounter(improvements, county?.improvement?.name)

      Object.entries(county?.improvement?.buildings || {}).forEach(([name, enabled]) => {
        if (enabled) incrementCounter(buildings, name)
      })
    }
  }

  return compactObject({
    countyCount,
    namedCountyCount,
    railroadCount,
    riverCountyCount,
    topTerrains: topCounter(terrains),
    topResources: topCounter(resources),
    topImprovements: topCounter(improvements),
    topBuildings: topCounter(buildings),
  })
}

function compactEconomy(economy = {}) {
  return compactObject(
    Object.fromEntries(
      Object.entries(economy || {}).map(([key, value]) => [key, roundNumber(value, 1)])
    )
  )
}

function worldContext(data, { includeProvinces = true } = {}) {
  const country = data?.country || {}
  return compactObject({
    country: compactObject({
      name: country.basic_info?.name || 'Untitled Civilization',
      leader: country.basic_info?.leader || null,
      stateReligion: country.state_religion || null,
      totalPopulation: integerOrNull(country.total_population),
      economy: compactEconomy(country.economy),
    }),
    provinceCount: Array.isArray(data?.provinces) ? data.provinces.length : 0,
    provinceGroups: provinceGroupSummaries(data || {}),
    countySignals: countySignals(data || {}),
    notableProvinces: includeProvinces ? provinceSummaries(data || {}) : undefined,
  })
}

function plannerSystemPrompt() {
  return [
    'You are the election-climate planner inside a fictional Civilization-style simulator.',
    'Your job is template selection, not prose writing: map the user narrative to existing trend templates.',
    'Return ONLY a compact JSON object matching the schema. Do not use markdown, preamble, commentary, hidden reasoning, or <think> blocks.',
    'Make final decisions from the supplied context; never ask the user for more information.',
    'Select 3 to 7 unique template IDs from TREND_TEMPLATES. Prefer 3 to 4 for a narrow narrative and 5 to 7 for a multi-thread crisis.',
    'Include at least one simple template and at least one compound or storyline template when the catalog provides a good fit.',
    'Prefer templates whose signals, hooks, parties, and world applicability match USER_NARRATIVE and CURRENT_WORLD.',
    'Use customTrends only as a fallback for important narrative details not covered by TREND_TEMPLATES. Keep them conservative and targeted.',
    'Use intensity 0.35-0.65 for normal effects, 0.7-1.0 for crisis or landslide effects, and 0.15-0.34 for subtle background effects.',
    'Only move volatility away from DEFAULT_VOLATILITY when the narrative clearly implies chaos, stability, landslide, or local uncertainty.',
    'Do not invent template IDs, parties, regions, features, or facts.',
  ].join(' ')
}

function plannerUserPrompt(narrative, data) {
  return JSON.stringify({
    task: 'Select trend templates and election jitter settings for this desired election narrative.',
    rules: [
      'Use only templateId values present in TREND_TEMPLATES.',
      'Keep reasons under 16 words each.',
      'Use seedHint as lowercase kebab-case with no dates.',
      'If unsure, choose lower intensity and default volatility.',
    ],
    outputSchema: {
      title: 'short scenario title',
      summary: 'one sentence explaining how the chosen trends tell the story',
      selections: [
        {
          templateId: 'one id from TREND_TEMPLATES',
          intensity: 'number 0.15 to 1.0',
          reason: 'short reason this template fits',
        },
      ],
      jitter: {
        seedHint: 'short kebab-case phrase for deterministic seed',
        volatility: {
          national: 'number 0.01 to 0.12',
          region: 'number 0.02 to 0.18',
          province: 'number 0.04 to 0.24',
          county: 'number 0.08 to 0.35',
        },
      },
      customTrends: [
        {
          label: 'optional custom trend name; omit array when templates cover the narrative',
          description: 'one sentence',
          family: 'short lowercase category',
          tags: ['short tags'],
          reason: 'why existing templates were insufficient',
          effects: [
            {
              level: 'national | province | county',
              party: 'allowed party id',
              mode: 'boost | suppress',
              magnitude: 'bounded number from CUSTOM_TREND_GRAMMAR',
              selector: 'optional selector from CUSTOM_TREND_GRAMMAR',
              weightBy: 'optional feature weighting from CUSTOM_TREND_GRAMMAR',
            },
          ],
        },
      ],
    },
    USER_NARRATIVE: narrative,
    CURRENT_WORLD: worldContext(data),
    PARTY_LEGEND: partyLegend(),
    DEFAULT_VOLATILITY,
    CUSTOM_TREND_GRAMMAR: customTrendGrammar(),
    TREND_TEMPLATES: templateSummaries(),
  })
}

function climateSummarySystemPrompt() {
  return [
    'You are naming an election climate for a fictional Civilization-style simulator.',
    'Return ONLY a compact JSON object. No markdown, preamble, commentary, hidden reasoning, or <think> blocks.',
    'Provide the final scenario name and description immediately. Do not ask for more context or details.',
    'The application has already randomized the trend templates; do not add, remove, rename, or alter trends.',
    'Write a vivid but concise name and one grounded sentence explaining how the fixed trends combine.',
    'Use only the supplied randomized trends, party legend, and world context.',
  ].join(' ')
}

function broadcastSystemPrompt(scope = 'national', targetName = null) {
  const scopeMap = {
    national: 'Imperial Decision Desk',
    regional: `${targetName || 'Regional'} Election Center`,
    provincial: `${targetName || 'Provincial'} Results Service`,
  }
  const stationName = scopeMap[scope] || 'Khmer State Television'

  return [
    `You are the lead anchor for the ${stationName}.`,
    'TONE: Professional, authoritative, and analytically sharp; emulate a high-end election night broadcast.',
    'TASK: Deliver exactly 5 paragraphs that prioritize hard data while maintaining historical consequence.',
    'PROJECTIONS: Use the language of a decision desk (e.g., "We are projecting," "Too close to call," "Seismic shifts in the battlegrounds," "The path to power").',
    'DATA FIRST: Lead with the numbers. Seat counts, control shifts, and popular vote margins must be the foundation of the report.',
    'JOURNALISTIC ANALYSIS: Beyond the numbers, explain why these shifts are occurring based on the provided trends and demographics.',
    scope === 'national' ? 'Provide a comprehensive national breakdown: House control, the struggle for the Imperial center, and the emerging national mandate.' : '',
    scope === 'regional' ? `Focus on the regional mechanics of ${targetName}. Detail the local assembly shifts and how this region is influencing the national balance of power.` : '',
    scope === 'provincial' ? `Deliver a localized deep-dive for ${targetName}. Analyze the county-level data, the council control, and the specific local swings that defined the night.` : '',
    'Paragraph 1: The Lead. The top-line projection and the overall mood of the electorate.',
    'Paragraph 2: The Math. A disciplined breakdown of the seats, the control of the houses, and the popular vote margins.',
    'Paragraph 3-4: The Analysis. Identify specific battleground swings or surprising trend impacts. What specific demographic or regional shift changed the math?',
    'Paragraph 5: The Outlook. The political reality for the coming term and what this "new math" means for the Empire.',
    'Use only supplied facts and numbers; do not invent counties, parties, margins, or quotes.',
    'Return ONLY the script as five plain-text paragraphs separated by blank lines. No markdown, headings, commentary, hidden reasoning, or <think> blocks.',
  ].filter(Boolean).join(' ')
}

function tickerSystemPrompt(scope = 'national', targetName = null) {
  const scopeName = scope === 'overview'
    ? 'Election Overview'
    : scope === 'national'
      ? 'National Decision Desk'
      : targetName || scope

  return [
    `You are writing one live election ticker paragraph for ${scopeName}.`,
    'Return exactly one plain-text paragraph, 55 to 85 words.',
    'Lead with the most important control call or vote movement, then explain the main reason using supplied trends and numbers.',
    'Use hard data, but stay compact enough for an on-page ticker card.',
    'Use only supplied facts and numbers; do not invent counties, parties, margins, or quotes.',
    'No markdown, heading, bullets, preamble, hidden reasoning, or <think> blocks.',
  ].join(' ')
}

function getSwings(current, baseline) {
  if (!current || !baseline) return {}
  return Object.fromEntries(
    Object.entries(current).map(([party, share]) => {
      const diff = share - (baseline[party] || 0)
      return [party, roundNumber(diff * 100, 2)]
    })
  )
}

function sumSeats(seats = {}) {
  return Object.values(seats || {}).reduce((sum, value) => sum + (numberOrNull(value) || 0), 0)
}

function seatMap(seats = {}) {
  return compactObject(
    Object.fromEntries(
      Object.keys(PARTY_META).map((party) => [party, integerOrNull(seats?.[party]) ?? 0])
    )
  )
}

function voteShareMap(shares = {}) {
  return compactObject(
    Object.fromEntries(
      Object.keys(PARTY_META).map((party) => [party, roundNumber((numberOrNull(shares?.[party]) ?? 0) * 100, 1)])
    )
  )
}

function topPartiesFromShares(shares = {}, max = 3) {
  return Object.keys(PARTY_META)
    .map((party) => ({
      party,
      name: PARTY_META[party].name,
      votePct: roundNumber((numberOrNull(shares?.[party]) ?? 0) * 100, 1),
    }))
    .filter((row) => row.votePct > 0)
    .sort((a, b) => b.votePct - a.votePct)
    .slice(0, max)
}

function strongestSwing(current, baseline) {
  const swings = getSwings(current, baseline)
  const strongest = Object.entries(swings)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]

  if (!strongest) return null
  const [party, points] = strongest
  return {
    party,
    name: PARTY_META[party]?.name || party,
    points,
  }
}

function chamberContext(chamber = {}, baselineChamber = null) {
  return compactObject({
    control: chamber?.control?.label,
    detail: chamber?.control?.detail,
    majority: integerOrNull(chamber?.control?.majority),
    seatCount: integerOrNull(chamber?.seat_count) ?? sumSeats(chamber?.seats),
    seats: seatMap(chamber?.seats),
    votePct: chamber?.vote_shares ? voteShareMap(chamber.vote_shares) : null,
    swingPct: baselineChamber?.vote_shares ? getSwings(chamber?.vote_shares, baselineChamber.vote_shares) : null,
    strongestSwing: baselineChamber?.vote_shares ? strongestSwing(chamber?.vote_shares, baselineChamber.vote_shares) : null,
  })
}

function regionContext(name, region = {}, baselineRegion = null) {
  return compactObject({
    name,
    population: integerOrNull(region.population),
    provinceCount: integerOrNull(region.province_count),
    provinces: (region.provinces || []).slice(0, 10),
    assembly: chamberContext(region.assembly, baselineRegion?.assembly),
    council: chamberContext(region.prelates, baselineRegion?.prelates),
  })
}

function provinceResultContext(province = {}, baselineProvince = null) {
  return compactObject({
    name: province.name,
    group: province.group,
    population: integerOrNull(province.provincial_population),
    flags: provinceFlags(province),
    assemblypeople: integerOrNull(province.assemblypeople),
    prelates: integerOrNull(province.prelates?.seat_count),
    featureSignals: compactObject({
      urbanization: roundNumber(province.political_features?.urbanization_index, 2),
      industrial: roundNumber(province.political_features?.industrial_index, 2),
      localist: roundNumber(province.political_features?.localist_index, 2),
      workerGrievance: roundNumber(province.political_features?.worker_grievance_index, 2),
      spiritual: roundNumber(province.political_features?.spiritual_index, 2),
      imperialCore: roundNumber(province.political_features?.imperial_core_index, 2),
    }),
    assembly: chamberContext(province.assembly, baselineProvince?.assembly),
    council: chamberContext(province.prelates, baselineProvince?.prelates),
  })
}

function countyResultContext(county = {}, baselineCounty = null) {
  return compactObject({
    name: county.name || county.tile_id || 'Unnamed county',
    population: integerOrNull(county.county_population),
    terrain: county.terrain || null,
    improvement: county.improvement_name || null,
    topParties: topPartiesFromShares(county.vote_shares, 2),
    strongestSwing: baselineCounty?.vote_shares ? strongestSwing(county.vote_shares, baselineCounty.vote_shares) : null,
  })
}

function findBaselineProvince(baselineResults, province) {
  return (baselineResults?.provinces || []).find((candidate) => (
    candidate.name === province?.name || candidate.city_id === province?.city_id
  )) || null
}

function findBaselineCounty(baselineProvince, county) {
  return (baselineProvince?.counties || []).find((candidate) => (
    candidate.tile_id === county?.tile_id || candidate.name === county?.name
  )) || null
}

function broadcastFocusContext(results = {}, baselineResults = {}, scope = 'national', targetName = null) {
  if (scope === 'regional') {
    const region = results.regions?.[targetName] || {}
    const baselineRegion = baselineResults?.regions?.[targetName] || null
    const provinces = (results.provinces || [])
      .filter((province) => province.group === targetName)
      .sort((a, b) => (numberOrNull(b.provincial_population) || 0) - (numberOrNull(a.provincial_population) || 0))
      .slice(0, 12)
      .map((province) => provinceResultContext(province, findBaselineProvince(baselineResults, province)))

    return {
      type: 'regional',
      region: regionContext(targetName, region, baselineRegion),
      provinces,
    }
  }

  if (scope === 'provincial') {
    const province = (results.provinces || []).find((candidate) => candidate.name === targetName) || {}
    const baselineProvince = findBaselineProvince(baselineResults, province)
    const counties = (province.counties || [])
      .sort((a, b) => (numberOrNull(b.county_population) || 0) - (numberOrNull(a.county_population) || 0))
      .slice(0, 12)
      .map((county) => countyResultContext(county, findBaselineCounty(baselineProvince, county)))

    return {
      type: 'provincial',
      province: provinceResultContext(province, baselineProvince),
      counties,
    }
  }

  return {
    type: 'national',
    regionalOverview: Object.entries(results.regions || {})
      .map(([name, region]) => regionContext(name, region, baselineResults?.regions?.[name]))
      .sort((a, b) => (numberOrNull(b.population) || 0) - (numberOrNull(a.population) || 0))
      .slice(0, 14),
  }
}

function broadcastUserPrompt(results = {}, baselineResults = {}, scope = 'national', targetName = null) {
  return JSON.stringify({
    task: 'Write exactly five plain-text election broadcast paragraphs based only on this newsroom data.',
    scope,
    target: targetName || 'National',
    partyLegend: partyLegend(),
    activeTrends: trendSummaries(results.config?.trends || []),
    national: compactObject({
      population: integerOrNull(results.national?.population),
      assembly: chamberContext(results.national?.assembly, baselineResults?.national?.assembly),
      council: chamberContext(results.national?.prelates, baselineResults?.national?.prelates),
    }),
    focus: broadcastFocusContext(results, baselineResults, scope, targetName),
  })
}

function tickerUserPrompt(results = {}, baselineResults = {}, scope = 'national', targetName = null) {
  return JSON.stringify({
    task: 'Write one concise election ticker paragraph based only on this page-specific data.',
    scope,
    target: targetName || (scope === 'overview' ? 'Election Overview' : 'National'),
    partyLegend: partyLegend(),
    activeTrends: trendSummaries(results.config?.trends || []).slice(0, 8),
    climate: compactObject({
      name: results.config?.scenarioName,
      description: results.config?.scenarioDescription,
      trendCount: Array.isArray(results.config?.trends) ? results.config.trends.length : 0,
    }),
    national: compactObject({
      population: integerOrNull(results.national?.population),
      assembly: chamberContext(results.national?.assembly, baselineResults?.national?.assembly),
      council: chamberContext(results.national?.prelates, baselineResults?.national?.prelates),
    }),
    focus: broadcastFocusContext(results, baselineResults, scope, targetName),
  })
}

function climateSummaryUserPrompt({ trends, seed, data }) {
  return JSON.stringify({
    task: 'Create a scenario name and description for this randomized election climate.',
    outputSchema: {
      scenarioName: 'short scenario name, 3 to 7 words',
      scenarioDescription: 'one sentence describing how the randomized trends combine into an election climate',
    },
    RANDOM_SEED: seed || null,
    CURRENT_WORLD: data ? worldContext(data, { includeProvinces: false }) : null,
    PARTY_LEGEND: partyLegend(),
    RANDOMIZED_TRENDS: trendSummaries(Array.isArray(trends) ? trends : []),
  })
}

function chatContentToText(content) {
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part
      if (part && typeof part === 'object') return part.text || part.content || ''
      return ''
    }).join('')
  }

  if (content && typeof content === 'object') return JSON.stringify(content)
  return String(content || '')
}

function extractJsonObject(rawText) {
  if (rawText && typeof rawText === 'object' && !Array.isArray(rawText)) return rawText

  const text = chatContentToText(rawText).trim()
  if (!text) throw new ModelOutputError('The model returned an empty response.', 'empty')

  // Try parsing directly first
  try {
    return JSON.parse(text)
  } catch (e) {
    // Attempt to extract the JSON block
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    
    if (start >= 0 && end > start) {
      let jsonCandidate = text.slice(start, end + 1)
        .replace(/\/\/.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/,\s*([\]}])/g, '$1') // Remove trailing commas
      
      try {
        return JSON.parse(jsonCandidate)
      } catch (innerError) {
        // More aggressive repair: handle unescaped quotes in summary/reason fields
        // This is a common failure point for small models
        try {
          // Replace single quotes with double quotes for keys (crude)
          const repaired = jsonCandidate
            .replace(/([{,]\s*)'([^']+)':/g, '$1"$2":') // keys
            .replace(/:\s*'([^']*)'/g, ': "$1"') // values
          return JSON.parse(repaired)
        } catch (repairError) {
          throw new ModelOutputError(`JSON Parse Error: ${innerError.message}. Content near: ${jsonCandidate.slice(0, 100)}...`, 'invalid-json')
        }
      }
    }
    
    throw new ModelOutputError(`Could not find a valid JSON object in model output.`, 'no-json')
  }
}

function cleanScenarioText(value, fallback, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return truncate(text || fallback, maxLength)
}

function normalizedKey(key) {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function pickField(source, aliases) {
  if (!source || typeof source !== 'object') return ''
  const aliasSet = new Set(aliases.map(normalizedKey))
  const match = Object.entries(source).find(([key]) => aliasSet.has(normalizedKey(key)))
  return match ? match[1] : ''
}

function pickScenarioField(plan, aliases) {
  const direct = pickField(plan, aliases)
  if (direct) return direct

  const containers = ['scenario', 'electionClimate', 'climate', 'metadata', 'result']
  for (const key of containers) {
    const nested = pickField(plan, [key])
    const value = pickField(nested, aliases)
    if (value) return value
  }

  const shallowMatch = Object.values(plan || {}).find((value) => (
    value && typeof value === 'object' && pickField(value, aliases)
  ))
  return shallowMatch ? pickField(shallowMatch, aliases) : ''
}

function normalizeScenarioMetadata(plan = {}) {
  const name = cleanScenarioText(
    pickScenarioField(plan, [
      'scenarioName',
      'scenario_name',
      'climateName',
      'climate_name',
      'name',
      'title',
    ]),
    'Randomized Election Climate',
    MAX_SCENARIO_NAME
  )
  const description = cleanScenarioText(
    pickScenarioField(plan, [
      'scenarioDescription',
      'scenario_description',
      'climateDescription',
      'climate_description',
      'description',
      'summary',
    ]),
    'Randomized climate signals are reshaping the campaign.',
    MAX_SCENARIO_DESCRIPTION
  )

  return {
    name,
    description,
    title: name,
    summary: description,
  }
}

function customTrendGrammar() {
  return {
    useWhen: 'Prefer TREND_TEMPLATES. Add customTrends only for a narrative element that no existing template covers well.',
    limits: {
      maxCustomTrends: MAX_CUSTOM_TRENDS,
      maxEffectsPerTrend: MAX_CUSTOM_EFFECTS,
      effectLevels: CUSTOM_EFFECT_LEVELS,
      maxMagnitudeByLevel: CUSTOM_MAGNITUDE_LIMITS,
    },
    allowedParties: partyLegend(),
    allowedModes: CUSTOM_MODES,
    allowedSelectorShortcuts: SELECTOR_SHORTCUTS,
    allowedFeatureNames: FEATURE_ALLOWLIST,
    selectorNotes: [
      'There is no direct region effect level; affect a region with province/county effects plus selector.groupIncludes.',
      'Use minFeatures/maxFeatures for feature names in allowedFeatureNames.',
      'Use groupIncludes, groupEquals, nameIncludes, terrains, resources, improvementIncludes, isConquered, isNationalCapital, isRegionalCapital, isFounded, or isJoined for targeted effects.',
    ],
    customTrendSchema: {
      label: 'short display name',
      description: 'one sentence describing the custom political signal',
      family: 'short lowercase category',
      tags: ['2 to 6 lowercase tags'],
      reason: 'why this was generated instead of using only templates',
      effects: [
        {
          level: 'national | province | county, or an array of those',
          party: 'one allowed party id',
          mode: 'boost or suppress',
          magnitude: 'number, clamped by maxMagnitudeByLevel',
          selector: 'optional selector object using allowed selector grammar',
          weightBy: 'optional { feature, minMultiplier, maxMultiplier } using allowedFeatureNames',
        },
      ],
    },
  }
}

function partyIdFromValue(value) {
  const text = String(value || '').trim()
  if (Object.prototype.hasOwnProperty.call(PARTY_META, text)) return text

  const normalized = normalizedKey(text)
  const match = Object.entries(PARTY_META).find(([id, meta]) => (
    normalizedKey(id) === normalized || normalizedKey(meta.name) === normalized
  ))

  return match?.[0] || null
}

function featureNameFromValue(value) {
  const normalized = normalizedKey(value)
  return FEATURE_ALLOWLIST.find((feature) => normalizedKey(feature) === normalized) || null
}

function shortcutSelectorKey(value) {
  const normalized = normalizedKey(value)
  return SELECTOR_SHORTCUTS.find((key) => normalizedKey(key) === normalized) || null
}

function sanitizeTextList(value, max = 6) {
  return uniqueList(asArray(value).map((item) => truncate(item, 48)), max)
}

function sanitizeFeatureRules(rules = []) {
  const sanitized = asArray(rules)
    .map((rule) => {
      if (!rule || typeof rule !== 'object') return null
      const feature = featureNameFromValue(rule.feature || rule.key)
      if (!feature) return null

      return compactObject({
        feature,
        value: roundNumber(clampNumber(rule.value ?? rule.threshold, 0, 1, 0.5), 2),
        fallbackKeys: sanitizeTextList(rule.fallbackKeys || [], 3)
          .map(featureNameFromValue)
          .filter(Boolean),
      })
    })
    .filter(Boolean)

  if (!sanitized.length) return null
  return sanitized.length === 1 ? sanitized[0] : sanitized
}

function sanitizeWeightBy(weightBy = null) {
  const sanitized = asArray(weightBy)
    .slice(0, 3)
    .map((weight) => {
      if (!weight || typeof weight !== 'object') return null
      const feature = featureNameFromValue(weight.feature || weight.key)
      if (!feature) return null

      const min = clampNumber(weight.min, 0, 1, 0)
      const max = clampNumber(weight.max, min, 1, 1)

      return compactObject({
        feature,
        fallbackKeys: sanitizeTextList(weight.fallbackKeys || [], 3)
          .map(featureNameFromValue)
          .filter(Boolean),
        min: roundNumber(min, 2),
        max: roundNumber(max, 2),
        minMultiplier: roundNumber(clampNumber(weight.minMultiplier, 0.45, 1.6, 0.85), 2),
        maxMultiplier: roundNumber(clampNumber(weight.maxMultiplier, 0.55, 1.8, 1.25), 2),
      })
    })
    .filter(Boolean)

  if (!sanitized.length) return null
  return sanitized.length === 1 ? sanitized[0] : sanitized
}

function sanitizeSelector(selector = {}, depth = 0) {
  if (!selector || typeof selector !== 'object' || depth > 3) return {}
  const result = {}

  for (const [key, value] of Object.entries(selector)) {
    const normalized = normalizedKey(key)
    const shortcutKey = shortcutSelectorKey(key)

    if (normalized === 'any' || normalized === 'all') {
      const children = asArray(value)
        .map((child) => sanitizeSelector(child, depth + 1))
        .filter((child) => Object.keys(child).length > 0)
        .slice(0, 6)
      if (children.length) result[normalized] = children
      continue
    }

    if (normalized === 'not') {
      const child = sanitizeSelector(value, depth + 1)
      if (Object.keys(child).length) result.not = child
      continue
    }

    if (normalized === 'minfeatures' || normalized === 'maxfeatures') {
      const rules = sanitizeFeatureRules(value)
      if (rules) result[normalized === 'minfeatures' ? 'minFeatures' : 'maxFeatures'] = rules
      continue
    }

    if (shortcutKey) {
      result[shortcutKey] = roundNumber(clampNumber(value, 0, 1, 0.5), 2)
      continue
    }

    if (normalized === 'groupincludes') result.groupIncludes = sanitizeTextList(value, 6)
    if (normalized === 'groupequals') result.groupEquals = sanitizeTextList(value, 6)
    if (normalized === 'nameincludes') result.nameIncludes = sanitizeTextList(value, 6)
    if (normalized === 'improvementnames') result.improvementNames = sanitizeTextList(value, 8)
    if (normalized === 'improvementincludes') result.improvementIncludes = sanitizeTextList(value, 8)
    if (normalized === 'terrains') result.terrains = sanitizeTextList(value, 8)
    if (normalized === 'resources') result.resources = sanitizeTextList(value, 8)
    if (normalized === 'provinceindexin') {
      const seenIndexes = new Set()
      const indexes = asArray(value)
        .map((item) => integerOrNull(item))
        .filter((item) => item !== null && item >= 0)
        .filter((item) => {
          if (seenIndexes.has(item)) return false
          seenIndexes.add(item)
          return true
        })
        .slice(0, 24)
      if (indexes.length) result.provinceIndexIn = indexes
    }

    const booleanKeys = {
      isconquered: 'isConquered',
      isnationalcapital: 'isNationalCapital',
      isregionalcapital: 'isRegionalCapital',
      isfounded: 'isFounded',
      isjoined: 'isJoined',
    }
    if (booleanKeys[normalized]) result[booleanKeys[normalized]] = Boolean(value)
  }

  return compactObject(result)
}

function normalizeEffectLevels(value) {
  return uniqueList(asArray(value)
    .map((level) => String(level || '').trim().toLowerCase())
    .filter((level) => CUSTOM_EFFECT_LEVELS.includes(level)), CUSTOM_EFFECT_LEVELS.length)
}

function sanitizeCustomEffect(effect = {}, trendId, index) {
  if (!effect || typeof effect !== 'object') return null
  const levels = normalizeEffectLevels(effect.level || effect.levels)
  const party = partyIdFromValue(effect.party)
  if (!levels.length || !party) return null

  const primaryLevel = levels[0]
  const maxMagnitude = CUSTOM_MAGNITUDE_LIMITS[primaryLevel] || 0.2
  const magnitude = roundNumber(clampNumber(effect.magnitude ?? effect.strength, 0.02, maxMagnitude, Math.min(0.1, maxMagnitude)), 3)
  const mode = CUSTOM_MODES.includes(String(effect.mode || '').toLowerCase())
    ? String(effect.mode).toLowerCase()
    : 'boost'

  return compactObject({
    id: `${trendId}-effect-${index + 1}`,
    level: levels.length === 1 ? levels[0] : levels,
    party,
    mode,
    selector: sanitizeSelector(effect.selector || {}),
    magnitude,
    weightBy: sanitizeWeightBy(effect.weightBy),
  })
}

function compileCustomTrends(plan = {}, seed = 'narrative') {
  const rawCustomTrends = pickField(plan, ['customTrends', 'custom_trends', 'generatedTrends', 'generated_trends'])
  if (!Array.isArray(rawCustomTrends)) return []

  return rawCustomTrends
    .slice(0, MAX_CUSTOM_TRENDS)
    .map((customTrend, index) => {
      if (!customTrend || typeof customTrend !== 'object') return null
      const label = cleanScenarioText(customTrend.label || customTrend.name, `Custom Trend ${index + 1}`, 64)
      const trendId = `custom-${slug(seed, 'narrative')}-${index + 1}-${slug(customTrend.idSuffix || label, 'trend')}`
      const rawEffects = Array.isArray(customTrend.effects) && customTrend.effects.length
        ? customTrend.effects
        : [customTrend]
      const effects = rawEffects
        .slice(0, MAX_CUSTOM_EFFECTS)
        .map((effect, effectIndex) => sanitizeCustomEffect(effect, trendId, effectIndex))
        .filter(Boolean)

      if (!effects.length) return null

      const primaryEffect = effects.find((effect) => effect.mode !== 'suppress') || effects[0]
      const tags = uniqueList(['custom', ...(customTrend.tags || []), customTrend.family], 8)

      return {
        id: trendId,
        templateId: trendId,
        label,
        description: cleanScenarioText(customTrend.description || customTrend.summary, 'Custom narrative-driven election signal.', 180),
        complexity: 'custom',
        family: slug(customTrend.family || 'custom', 'custom'),
        scope: uniqueList(effects.flatMap((effect) => asArray(effect.level))),
        tags,
        narrative: compactObject({
          hook: cleanScenarioText(customTrend.hook, customTrend.description || label, 160),
          promptTags: tags,
          beats: sanitizeTextList(customTrend.beats || [], 4),
          reason: cleanScenarioText(customTrend.reason, 'Generated because the catalog did not fully cover the narrative.', 140),
        }),
        level: primaryEffect.level,
        party: primaryEffect.party,
        selector: primaryEffect.selector || {},
        magnitude: primaryEffect.magnitude,
        effects,
        interactions: [],
        source: 'llm-custom',
      }
    })
    .filter(Boolean)
}

function sanitizeVolatility(volatility = {}) {
  return Object.fromEntries(
    Object.entries(DEFAULT_VOLATILITY).map(([level, fallback]) => {
      const value = Number(volatility?.[level])
      if (!Number.isFinite(value)) return [level, fallback]
      return [level, Math.max(0, Math.min(0.4, value))]
    })
  )
}

function defaultContextLength() {
  const envValue = Number(import.meta.env.VITE_LMSTUDIO_CONTEXT_LENGTH)
  return Number.isFinite(envValue) && envValue > 0 ? envValue : DEFAULT_CONTEXT_LENGTH
}

function nativeChatEndpoint(endpoint) {
  const text = String(endpoint || DEFAULT_ENDPOINT).trim()
  if (text.endsWith('/v1/chat/completions')) {
    return text.replace('/v1/chat/completions', '/api/v1/chat')
  }
  return text || DEFAULT_ENDPOINT
}

function emitLlmStatus(onStatus, status = {}) {
  if (typeof onStatus !== 'function') return
  const phase = status.phase || 'working'
  onStatus({
    phase,
    progress: null,
    message: 'Working with the local model.',
    detail: '',
    eventType: status.eventType || `app.${phase}`,
    ...status,
    timestamp: Date.now(),
  })
}

function contentFromMessage(message = {}) {
  return chatContentToText(message.content)
}

function nativeChatPayload({
  model,
  temperature,
  max_tokens,
  messages,
  context_length,
}) {
  const systemPrompt = messages
    .filter((message) => message.role === 'system')
    .map(contentFromMessage)
    .filter(Boolean)
    .join('\n\n')
  const inputMessages = messages
    .filter((message) => message.role !== 'system')
    .map(contentFromMessage)
    .filter(Boolean)
  const input = inputMessages.length === 1
    ? inputMessages[0]
    : inputMessages.map((content) => ({ type: 'message', content }))

  return compactObject({
    model,
    system_prompt: systemPrompt,
    input,
    temperature,
    max_output_tokens: max_tokens,
    context_length,
    stream: true,
    store: false,
  })
}

function percent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return `${Math.round(Math.max(0, Math.min(1, number)) * 100)}%`
}

function nativeChatOutputToText(payload = {}) {
  const result = payload?.result || payload
  const output = Array.isArray(result?.output) ? result.output : []
  const messages = output
    .filter((item) => item?.type === 'message')
    .map((item) => chatContentToText(item.content).trim())
    .filter(Boolean)

  if (messages.length) return messages.join('\n\n')
  return chatContentToText(result?.message?.content ?? result?.text ?? '')
}

function parseSseBlock(block) {
  let event = 'message'
  const dataLines = []

  for (const rawLine of String(block || '').split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    if (!line || line.startsWith(':')) continue

    const separator = line.indexOf(':')
    const field = separator >= 0 ? line.slice(0, separator) : line
    const value = separator >= 0 ? line.slice(separator + 1).replace(/^ /, '') : ''

    if (field === 'event') event = value
    if (field === 'data') dataLines.push(value)
  }

  const data = dataLines.join('\n').trim()
  return {
    event,
    payload: data ? JSON.parse(data) : {},
  }
}

function progressForNativeEvent(eventType, payload = {}) {
  const eventProgress = Number(payload.progress)
  const hasEventProgress = Number.isFinite(eventProgress)
  const boundedEventProgress = hasEventProgress ? Math.max(0, Math.min(1, eventProgress)) : 0

  if (eventType === 'chat.start') return 0.2
  if (eventType === 'model_load.start') return 0.24
  if (eventType === 'model_load.progress') return hasEventProgress ? 0.24 + boundedEventProgress * 0.18 : null
  if (eventType === 'model_load.end') return 0.42
  if (eventType === 'prompt_processing.start') return 0.44
  if (eventType === 'prompt_processing.progress') return hasEventProgress ? 0.44 + boundedEventProgress * 0.22 : null
  if (eventType === 'prompt_processing.end') return 0.66
  if (eventType === 'reasoning.start') return 0.68
  if (eventType === 'reasoning.delta') return null
  if (eventType === 'reasoning.end') return 0.72
  if (eventType === 'message.start') return 0.74
  if (eventType === 'message.delta') return null
  if (eventType === 'message.end') return 0.92
  if (eventType === 'chat.end') return 0.96
  if (eventType === 'error') return 1

  return hasEventProgress ? eventProgress : null
}

function phaseForNativeEvent(eventType) {
  if (eventType.startsWith('model_load.')) return 'model_load'
  if (eventType.startsWith('prompt_processing.')) return 'prompt_processing'
  if (eventType.startsWith('reasoning.')) return 'reasoning'
  if (eventType.startsWith('message.')) return 'message'
  if (eventType.startsWith('tool_call.')) return 'tool_call'
  if (eventType === 'chat.start' || eventType === 'chat.end') return 'chat'
  if (eventType === 'error') return 'error'
  return 'streaming'
}

function streamStatsDetail(stats = {}) {
  const parts = []
  const inputTokens = integerOrNull(stats.input_tokens)
  const outputTokens = integerOrNull(stats.total_output_tokens)
  const tokensPerSecond = roundNumber(stats.tokens_per_second, 1)
  const timeToFirstToken = roundNumber(stats.time_to_first_token_seconds, 2)
  const modelLoadTime = roundNumber(stats.model_load_time_seconds, 2)

  if (inputTokens !== null) parts.push(`${inputTokens} input tokens`)
  if (outputTokens !== null) parts.push(`${outputTokens} output tokens`)
  if (tokensPerSecond !== null) parts.push(`${tokensPerSecond} tok/s`)
  if (timeToFirstToken !== null) parts.push(`${timeToFirstToken}s first token`)
  if (modelLoadTime !== null) parts.push(`${modelLoadTime}s model load`)
  return parts.join(' · ')
}

function nativeEventDetail(eventType, payload = {}, streamState = {}) {
  const nativePercent = percent(payload.progress)
  if (eventType === 'model_load.start') return payload.model_instance_id || 'Model load requested by LM Studio.'
  if (eventType === 'model_load.progress') return nativePercent ? `Native model-load progress ${nativePercent}.` : 'Model load progress event received.'
  if (eventType === 'model_load.end') return payload.load_time_seconds ? `Loaded in ${roundNumber(payload.load_time_seconds, 2)}s.` : 'Model loaded.'
  if (eventType === 'prompt_processing.start') return 'Prompt processing started.'
  if (eventType === 'prompt_processing.progress') return nativePercent ? `Native prompt-processing progress ${nativePercent}.` : 'Prompt-processing progress event received.'
  if (eventType === 'prompt_processing.end') return 'Prompt processing complete.'
  if (eventType === 'reasoning.start') return 'Reasoning stream started.'
  if (eventType === 'reasoning.delta') return `${streamState.reasoningChunks || 0} reasoning fragments received.`
  if (eventType === 'reasoning.end') return 'Reasoning stream complete.'
  if (eventType === 'message.start') return 'Message stream started.'
  if (eventType === 'message.delta') return `${streamState.outputChars || 0} output characters streamed.`
  if (eventType === 'message.end') return 'Message stream complete.'
  if (eventType === 'chat.end') return streamStatsDetail(payload.result?.stats) || 'Final aggregated result received.'
  if (eventType === 'error') return payload.error?.message || 'LM Studio emitted a streaming error.'
  return payload.type ? `LM Studio payload type ${payload.type}.` : 'LM Studio streaming event received.'
}

function emitNativeEventStatus(onStatus, eventType, payload = {}, streamState = {}) {
  emitLlmStatus(onStatus, {
    phase: phaseForNativeEvent(eventType),
    progress: progressForNativeEvent(eventType, payload),
    nativeProgress: Number.isFinite(Number(payload.progress)) ? Math.max(0, Math.min(1, Number(payload.progress))) : null,
    label: eventType,
    message: `LM Studio event: ${eventType}`,
    detail: nativeEventDetail(eventType, payload, streamState),
    eventType,
    source: 'lmstudio-sse',
  })
}

function handleNativeStreamEvent(eventType, payload, streamState, onStatus) {
  if (eventType === 'message.delta') {
    const delta = chatContentToText(payload.content)
    streamState.content += delta
    streamState.outputChars += delta.length
  }

  if (eventType === 'reasoning.delta') {
    streamState.reasoningChunks += 1
  }

  if (eventType === 'chat.end') {
    streamState.finalResult = payload.result || null
  }

  if (eventType === 'error') {
    streamState.error = payload.error || { message: 'LM Studio emitted a streaming error.' }
  }

  emitNativeEventStatus(onStatus, eventType, payload, streamState)
}

async function readNativeChatStream(response, onStatus) {
  if (!response.body?.getReader) {
    const payload = await response.json()
    const content = nativeChatOutputToText(payload)
    emitNativeEventStatus(onStatus, 'chat.end', { result: payload }, { outputChars: content.length })
    return content
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const streamState = {
    content: '',
    error: null,
    finalResult: null,
    outputChars: 0,
    reasoningChunks: 0,
  }
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() || ''

    for (const block of blocks) {
      if (!block.trim()) continue
      const { event, payload } = parseSseBlock(block)
      const eventType = payload?.type || event
      handleNativeStreamEvent(eventType, payload, streamState, onStatus)
    }

    if (done) break
  }

  if (buffer.trim()) {
    const { event, payload } = parseSseBlock(buffer)
    const eventType = payload?.type || event
    handleNativeStreamEvent(eventType, payload, streamState, onStatus)
  }

  if (streamState.error) {
    throw new Error(streamState.error.message || 'LM Studio emitted a streaming error.')
  }

  const content = streamState.content.trim() || nativeChatOutputToText(streamState.finalResult)
  return content
}

async function requestChatCompletion({
  endpoint,
  model,
  temperature,
  max_tokens,
  messages,
  onStatus,
  context_length,
}) {
  const chatEndpoint = nativeChatEndpoint(endpoint)
  const effectiveContextLength = Number.isFinite(Number(context_length))
    ? Number(context_length)
    : defaultContextLength()
  let response
  try {
    emitLlmStatus(onStatus, {
      phase: 'connecting',
      progress: 0.1,
      message: 'Opening LM Studio streaming request.',
      detail: `${model} · ${messages.length} prompt packets · ${max_tokens} output tokens · ${effectiveContextLength} context`,
    })
    response = await fetch(chatEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nativeChatPayload({
        model,
        temperature,
        max_tokens,
        messages,
        context_length: effectiveContextLength,
      })),
    })
  } catch (netError) {
    emitLlmStatus(onStatus, {
      phase: 'error',
      progress: 1,
      message: 'LM Studio connection failed.',
      detail: chatEndpoint,
    })
    throw new Error(`Could not connect to LM Studio at ${chatEndpoint}. Ensure the server is running and "Enable CORS" is on.`)
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'No error body')
    emitLlmStatus(onStatus, {
      phase: 'error',
      progress: 1,
      message: `LM Studio returned ${response.status}.`,
      detail: truncate(errorBody, 160),
    })
    throw new Error(`LM Studio error (${response.status}): ${errorBody}`)
  }

  const content = await readNativeChatStream(response, onStatus)

  if (!content.trim()) {
    emitLlmStatus(onStatus, {
      phase: 'error',
      progress: 1,
      message: 'The model returned an empty response.',
      detail: 'No message content was present in the native LM Studio stream.',
    })
    throw new ModelOutputError('The model returned an empty response.', 'empty')
  }

  return content
}

function seedFromPlan(plan, narrative) {
  const hint = String(plan?.jitter?.seedHint || plan?.title || narrative || 'narrative').trim()
  return `narrative-${hint.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'scenario'}`
}

export async function requestElectionNarrativePlan({
  narrative,
  data,
  endpoint = import.meta.env.VITE_LMSTUDIO_ENDPOINT || DEFAULT_ENDPOINT,
  model = import.meta.env.VITE_LMSTUDIO_MODEL || DEFAULT_MODEL,
  onStatus,
} = {}) {
  emitLlmStatus(onStatus, {
    phase: 'preparing',
    progress: 0.06,
    message: 'Building election narrative context.',
    detail: 'Packing world data, party legend, trend catalog, and custom trend grammar.',
  })
  const content = await requestChatCompletion({
    endpoint,
    model,
    temperature: 0.35,
    max_tokens: 1700,
    messages: [
      { role: 'system', content: plannerSystemPrompt() },
      { role: 'user', content: plannerUserPrompt(narrative, data) },
    ],
    onStatus,
  })
  emitLlmStatus(onStatus, {
    phase: 'parsing',
    progress: 0.82,
    message: 'Parsing narrative plan.',
    detail: 'Checking JSON, template selections, volatility, and generated custom trends.',
  })
  const plan = extractJsonObject(content)
  const seed = seedFromPlan(plan, narrative)
  emitLlmStatus(onStatus, {
    phase: 'compiling',
    progress: 0.92,
    message: 'Compiling election climate.',
    detail: 'Materializing selected templates and validating custom effects.',
  })
  const packageDef = generateTrendPackageFromSelections({
    id: `${seed}-${Date.now().toString(36)}`,
    title: plan.title || 'Election Narrative',
    summary: plan.summary || '',
    seed,
    jitterSeed: `${seed}-jitter`,
    source: 'llm-narrative',
    selections: Array.isArray(plan.selections) ? plan.selections : [],
    volatility: sanitizeVolatility(plan.jitter?.volatility),
  })
  const customTrends = compileCustomTrends(plan, seed)
  if (customTrends.length) {
    packageDef.trends = [...packageDef.trends, ...customTrends]
  }
  emitLlmStatus(onStatus, {
    phase: 'complete',
    progress: 1,
    message: 'Narrative climate ready.',
    detail: `${packageDef.trends.length} trend signals compiled.`,
  })

  return {
    plan,
    packageDef,
  }
}

export async function requestElectionClimateSummary({
  trends,
  seed,
  data,
  endpoint = import.meta.env.VITE_LMSTUDIO_ENDPOINT || DEFAULT_ENDPOINT,
  model = import.meta.env.VITE_LMSTUDIO_MODEL || DEFAULT_MODEL,
  onStatus,
} = {}) {
  emitLlmStatus(onStatus, {
    phase: 'preparing',
    progress: 0.12,
    message: 'Preparing climate naming packet.',
    detail: `${Array.isArray(trends) ? trends.length : 0} randomized trend signals ready for naming.`,
  })
  const messages = [
    { role: 'system', content: climateSummarySystemPrompt() },
    { role: 'user', content: climateSummaryUserPrompt({ trends, seed, data }) },
  ]
  let lastError = null

  for (const max_tokens of CLIMATE_SUMMARY_TOKEN_BUDGETS) {
    try {
      const content = await requestChatCompletion({
        endpoint,
        model,
        temperature: 0.25,
        max_tokens,
        messages,
        onStatus,
      })

      emitLlmStatus(onStatus, {
        phase: 'parsing',
        progress: 0.88,
        message: 'Reading scenario metadata.',
        detail: 'Extracting the scenario name and one-sentence description.',
      })
      const metadata = normalizeScenarioMetadata(extractJsonObject(content))
      emitLlmStatus(onStatus, {
        phase: 'complete',
        progress: 1,
        message: 'Election climate named.',
        detail: metadata.name,
      })
      return metadata
    } catch (error) {
      lastError = error
      if (error.code !== 'length' && error.code !== 'empty') throw error
    }
  }

  throw lastError || new Error('Election climate scenario could not be generated.')
}

export async function requestElectionBroadcast({
  results,
  baselineResults,
  scope = 'national',
  targetName = null,
  endpoint = import.meta.env.VITE_LMSTUDIO_ENDPOINT || DEFAULT_ENDPOINT,
  model = import.meta.env.VITE_LMSTUDIO_MODEL || DEFAULT_MODEL,
  onStatus,
} = {}) {
  emitLlmStatus(onStatus, {
    phase: 'preparing',
    progress: 0.08,
    message: 'Assembling newsroom packet.',
    detail: 'Collecting control calls, swings, active trends, and local focus data.',
  })
  const content = await requestChatCompletion({
    endpoint,
    model,
    temperature: 0.65,
    max_tokens: 2200,
    messages: [
      { role: 'system', content: broadcastSystemPrompt(scope, targetName) },
      { role: 'user', content: broadcastUserPrompt(results, baselineResults, scope, targetName) },
    ],
    onStatus,
  })
  emitLlmStatus(onStatus, {
    phase: 'complete',
    progress: 1,
    message: 'Broadcast script received.',
    detail: 'Formatting paragraphs for the transmission screen.',
  })

  return content
}

export async function requestElectionTicker({
  results,
  baselineResults,
  scope = 'national',
  targetName = null,
  endpoint = import.meta.env.VITE_LMSTUDIO_ENDPOINT || DEFAULT_ENDPOINT,
  model = import.meta.env.VITE_LMSTUDIO_MODEL || DEFAULT_MODEL,
  onStatus,
} = {}) {
  emitLlmStatus(onStatus, {
    phase: 'preparing',
    progress: 0.14,
    message: 'Preparing ticker brief.',
    detail: 'Compressing page-specific election data into one paragraph.',
  })
  const content = await requestChatCompletion({
    endpoint,
    model,
    temperature: 0.45,
    max_tokens: 420,
    messages: [
      { role: 'system', content: tickerSystemPrompt(scope, targetName) },
      { role: 'user', content: tickerUserPrompt(results, baselineResults, scope, targetName) },
    ],
    onStatus,
  })
  emitLlmStatus(onStatus, {
    phase: 'complete',
    progress: 1,
    message: 'Ticker copy received.',
    detail: 'Ready to type onto the election ticker.',
  })

  return content.replace(/\s+/g, ' ').trim()
}

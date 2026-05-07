import { DEFAULT_VOLATILITY } from './constants/apportionmentRules'
import { PARTIES, PARTY_META, partyMetaFromConfig } from './constants/parties'
import { RANDOM_TREND_TEMPLATES, generateTrendPackageFromSelections } from './trends/randomizeTrends'
import { lowerHouseLeaderTitle, upperHouseLeaderTitle } from './chambers/names'

const DEFAULT_ENDPOINT = 'http://localhost:1234/api/v1/chat'
const DEFAULT_MODEL = 'liquid/lfm2-24b-a2b'
const DEFAULT_CONTEXT_LENGTH = 131072
const MAX_TEMPLATE_DESCRIPTION = 160
const MAX_TEMPLATE_HOOK = 150
const MAX_TEMPLATE_BEAT = 90
const MAX_SCENARIO_NAME = 72
const MAX_SCENARIO_DESCRIPTION = 260
const MAX_WORLD_PROVINCES = 24
const MAX_GROUP_SUMMARIES = 16
const MAX_TOP_CONTEXT_VALUES = 8
const CLIMATE_SUMMARY_TOKEN_BUDGETS = [480, 900]
const NARRATIVE_PLAN_TOKEN_BUDGETS = [2500, 3500]
const REPRESENTATIVE_NAMING_TOKEN_BUDGET = 2000
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
  'imperial_origin_index',
  'foreign_origin_index',
  'imperial_core_index',
  'connectedness_index',
  'frontier_index',
  'adjacency_known_index',
  'nearest_province_distance',
  'average_closest_province_distance',
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
  // New features from normalization update
  'economic_diversity_index',
  'religious_homogeneity_index',
  'development_index',
  'provincial_power_index',
  'isolation_index',
  'yield_diversity_index',
  'improved_status_index',
  'resource_development_index',
  'cultural_output_index',
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
  // New feature shortcuts
  'minEconomicDiversityIndex',
  'minDevelopmentIndex',
  'minImprovedStatusIndex',
  'minCulturalOutputIndex',
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
  'minForeignOriginIndex',
  'minFrontierIndex',
  'minConnectednessIndex',
  'maxConnectednessIndex',
  'maxNearestProvinceDistance',
  'minNearestProvinceDistance',
  'maxAverageClosestProvinceDistance',
  'minAverageClosestProvinceDistance',
]

class ModelOutputError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'ModelOutputError'
    this.code = code
  }
}

function stripThinkBlocks(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/gi, '')
    .replace(/<\|tool_call\|>[\s\S]*?<\|\/tool_call\|>/gi, '')
    .trim()
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

function partyMetaForContext(source = null) {
  return partyMetaFromConfig(
    source?.config?.partyMeta ||
    source?.parties ||
    source?.partyMeta ||
    source?.election_parties
  )
}

function partyLegend(partyMeta = PARTY_META) {
  return PARTIES.map((id) => {
    const meta = partyMeta[id] || PARTY_META[id]
    const aliases = uniqueList([
      id,
      meta.name,
      meta.abbreviation,
      meta.colorName,
      meta.colorLabel,
      `${meta.colorName} Party`,
    ], 8)

    return {
      id,
      name: meta.name,
      abbreviation: meta.abbreviation,
      colorName: meta.colorName,
      colorLabel: meta.colorLabel,
      aliases,
      identityRule: `${meta.colorLabel || `${meta.colorName} Party`} = ${meta.name} = ${meta.abbreviation}; these are aliases for one party, not separate parties.`,
      ideology: meta.ideology,
    }
  })
}

function partyIdentityRules(partyMeta = PARTY_META) {
  return partyLegend(partyMeta).map((party) => ({
    id: party.id,
    canonicalName: party.name,
    abbreviation: party.abbreviation,
    colorName: party.colorName,
    colorLabel: party.colorLabel,
    aliases: party.aliases,
    rule: party.identityRule,
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
      originalCountry: province.original_country || null,
      population: integerOrNull(province.provincial_population ?? province.population),
      flags: provinceFlags(province),
      closestProvinces: (province.closest_provinces || [])
        .filter((entry) => entry?.province_name)
        .slice(0, 5)
        .map((entry) => compactObject({
          name: entry.province_name,
          distance: roundNumber(entry.distance, 1),
        })),
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
    'YOUR ENTIRE RESPONSE MUST BE A SINGLE RAW JSON OBJECT — nothing before the opening { and nothing after the closing }.',
    'DO NOT call any tools or functions. DO NOT use tool call syntax, XML tags, code fences, markdown, preamble, or reasoning blocks. Just the JSON object.',
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
  const partyMeta = partyMetaForContext(data)
  return JSON.stringify({
    task: 'Select trend templates and election jitter settings for the USER_NARRATIVE below. YOUR RESPONSE MUST BE ONLY a raw JSON object shaped exactly like exampleOutput — same field names, same structure, nothing else.',
    rules: [
      'Use only templateId values present in TREND_TEMPLATES.',
      'Keep reasons under 16 words each.',
      'Use seedHint as lowercase kebab-case with no dates.',
      'If unsure, choose lower intensity and default volatility.',
    ],
    exampleOutput: {
      title: 'Harvest Crisis',
      summary: 'Soaring bread prices fuel economic anxiety and incumbent backlash, benefiting opposition parties promising relief.',
      selections: [
        { templateId: 'bread-price-relief', intensity: 0.72, reason: 'Core driver — food prices dominate voter concern' },
        { templateId: 'tax-fatigue', intensity: 0.45, reason: 'Amplifies anti-incumbent fiscal resentment' },
      ],
      jitter: {
        seedHint: 'harvest-crisis',
        volatility: { national: 0.06, region: 0.1, province: 0.14, county: 0.22 },
      },
      customTrends: [],
    },
    requiredOutputFormat: {
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
    PARTY_LEGEND: partyLegend(partyMeta),
    DEFAULT_VOLATILITY,
    CUSTOM_TREND_GRAMMAR: customTrendGrammar(partyMeta),
    TREND_TEMPLATES: templateSummaries(),
  })
}

function climateSummarySystemPrompt() {
  return [
    'You are naming an election climate for a fictional Civilization-style simulator.',
    'YOUR ENTIRE RESPONSE MUST BE A SINGLE RAW JSON OBJECT — nothing before the opening { and nothing after the closing }.',
    'DO NOT call any tools or functions. DO NOT use tool call syntax, XML tags, code fences, markdown, preamble, or reasoning blocks. Just the JSON object.',
    'Provide the final scenario name and description immediately. Do not ask for more context or details.',
    'The application has already randomized the trend templates; do not add, remove, rename, or alter trends.',
    'Write a vivid but concise name and one grounded sentence explaining how the fixed trends combine.',
    'Use only the supplied randomized trends, party legend, and world context.',
  ].join(' ')
}

function broadcastSystemPrompt(scope = 'national', targetName = null) {
  const scopeMap = {
    overview: 'Empire-Wide Election Night Special',
    national: 'National Election Center',
    regional: `${targetName || 'Regional'} Regional News Network`,
    provincial: `${targetName || 'Provincial'} Local News Center`,
  }
  const stationName = scopeMap[scope] || 'Election Night Live'
  const scopeRules = {
    overview: 'SCOPE: This is the only full-election overview. Consolidate the national board, regions, and notable provinces into one empire-wide top-of-the-hour report, like a network election night special.',
    national: 'SCOPE: Stay focused on national results: imperial chambers, national popular vote, national control, and national trend effects. Use any supplied regional examples only as brief evidence for the national result, never as a region-by-region roundup. Think national network coverage.',
    regional: `SCOPE: Stay inside ${targetName || 'this region'}. Write like a regional affiliate covering local results for the network. Discuss only the regional assembly/council and provinces inside this region; do not turn the report into a national roundup.`,
    provincial: `SCOPE: Stay inside ${targetName || 'this province'}. Write like a local station reporting to regional affiliates. Discuss only provincial chambers and counties inside this province; do not turn the report into a regional or national roundup.`,
  }

  return [
    `You are the lead anchor for ${stationName}, delivering a top-of-the-hour election results breakdown.`,
    'PHASE: Election results are FINALIZED. Vote counting is complete. Use definitive past-tense language: won, secured, defeated, took control, held. Do NOT use uncertainty language.',
    'TONE: Professional broadcast journalism — CNN, BBC, major network election coverage. Authoritative but accessible, data-driven but human.',
    'KEY FIGURES — THIS IS MANDATORY: The keyFigures field lists the governing leader, opposition leader, and support leaders by exact title, party, and personal name. You MUST use their personal name whenever one is provided. Never refer to a party alone when you have the leader\'s name. Western broadcasters always mix name and party: "Prime Minister Noeurng Khean\'s majority," "Opposition Leader Vannak Chan of the Liberal Democrats," "the Chancellor\'s council bloc." Treat every named figure in keyFigures the way CNN treats a sitting president or BBC treats a Prime Minister — their name belongs in the coverage, not just their party.',
    'TASK: Deliver between 5 and 7 paragraphs as a polished television broadcast script. Weave the data into a compelling narrative. Numbers support the story; they are not the story. Use 6 or 7 paragraphs when the data is rich — multiple chamber changes, incumbent title shifts, strong polling surprises.',
    scopeRules[scope] || scopeRules.national,
    'BROADCAST STYLE: "The votes are in," "Tonight\'s results show," "A historic shift in," "In a stunning result," "Defying the polls," "Sweeping to victory," "The mandate is clear."',
    'STRUCTURE: Paragraph 1 — the lead. Name the winner. "Prime Minister [Name] has secured..." or "[Name]\'s [Party] swept to..." Hook the audience immediately.',
    'STRUCTURE: Paragraph 2 — hard numbers. Seats, chamber control, vote shares, majority thresholds. Frame as story, not data dump.',
    'STRUCTURE: Paragraphs 3 and 4 — drill down. Decisive provinces, demographic swings, trend impacts. Use representative names with exact titles throughout.',
    'STRUCTURE: Paragraph 5 — incumbent story. When incumbentChanges data is present, name who changed titles, who lost power, who secured a mandate. Reference the outgoing figure by name too: "[Former PM Name] steps aside as..." If isFirstElection or incumbentChanges is empty, use this for forward analysis.',
    'STRUCTURE: Paragraphs 6–7 (optional) — outlook and coalition analysis. Use only when data supports the depth.',
    'HISTORICAL CONTEXT: When isFirstElection is false, use swingPct and strongestSwing to frame shifts vs. the previous election. When isFirstElection is true, skip historical comparisons.',
    'INCUMBENT CHANGES: When incumbentChanges data is provided, this is the central human drama. Party-flip: name both the outgoing and incoming leader with exact titles. Minority-to-majority: mandate story. Majority-to-minority: rebuke story. Always use exact role titles: Prime Minister, Principal Chancellor, Premier, Head Chancellor, Governor, Chancellor.',
    'POLLING CONTEXT: When polling.aggregate is provided, compare final results to pre-election expectations. Highlight surprises.',
    'PARTY IDENTITY: Use partyIdentityRules to collapse color labels, IDs, abbreviations, and formal names into one party identity.',
    'Use only supplied facts and numbers; do not invent counties, parties, margins, quotes, or scenarios.',
    'Return ONLY the script as 5 to 7 plain-text paragraphs separated by blank lines. No markdown, headings, commentary, or <think> blocks.',
  ].filter(Boolean).join(' ')
}

function tickerSystemPrompt(scope = 'national', targetName = null) {
  const scopeName = scope === 'overview'
    ? 'Election Night Ticker'
    : scope === 'national'
      ? 'National Decision Desk'
      : targetName || scope
  const scopeRules = {
    overview: 'This is the only all-election ticker; consolidate the national, regional, and provincial picture like a network chyron.',
    national: 'Stay on national chambers, national vote movement, and national control. Do not summarize the whole regional/provincial map. Think national ticker.',
    regional: `Stay inside ${targetName || 'this region'} and write like a regional affiliate ticker feeding into the network.`,
    provincial: `Stay inside ${targetName || 'this province'} and write like a local station ticker.`,
  }

  return [
    `You are writing one election results ticker update for ${scopeName}, like a chyron running on CNN, BBC, or a major network.`,
    'PHASE: Results are FINAL. Use definitive past-tense language: won, took, secured, held. Do not use uncertainty language like "projected" or "too close to call."',
    'Return exactly one plain-text paragraph, 55 to 85 words.',
    scopeRules[scope] || scopeRules.national,
    'Lead with the most important result — the control call, the seat shift, the biggest story from this scope.',
    'KEY LEADERS: If topLeaders data is present, you may name the governing leader once (e.g., "Prime Minister Vannak Chan") when directly relevant to the lead. One name max — keep it tight.',
    'Follow with the key context using supplied trends and numbers. Keep it punchy and viewer-focused.',
    'Treat polling.aggregate as the pre-election benchmark; note surprises only when they are striking.',
    'Use hard data, but stay compact enough for an on-screen ticker. Think "bottom line" journalism.',
    'Use only supplied facts and numbers; do not invent counties, parties, margins, or quotes.',
    'No markdown, heading, bullets, preamble, hidden reasoning, or <think> blocks.',
  ].join(' ')
}

function pollBreakdownSystemPrompt() {
  return [
    'You are producing a pre-election polling segment for a mainstream political news network—think CNN, BBC, Fox News, or MSNBC election coverage.',
    'FORMAT: Write exactly 6 plain-text dialogue turns, each as one paragraph beginning with a speaker label such as "HOST:", "POLLING EDITOR:", "DATA ANALYST:", "FIELD ANALYST:", or "CAMPAIGN STRATEGIST:".',
    'STYLE: This is a polished roundtable of analysts talking through the poll board on live television. Sound like experienced network analysts—knowledgeable, conversational, data-driven but accessible. Not an election-night result call, not a state-media bulletin.',
    'TIMELINE: The election is upcoming. Treat currentScenario, preElectionStateOfPlay, polling, and allScopePolling as pre-election projections/state of play, never as completed results or incoming returns.',
    'PRIOR ELECTION: Treat priorElectionContext and any priorElection fields as the previous election/reference baseline. Use them only for comparison, not as the election currently happening.',
    'BASELINE SCENARIO: If scenarioContext.isBaselineScenario is true, the current scenario is the neutral baseline state of play for the upcoming election; do not make the segment mostly about the past or about absence of change.',
    'PARTY IDENTITY: Color labels, party IDs, abbreviations, and formal names in partyLegend/partyIdentityRules are aliases for the same parties. Never treat "Orange Party" and "United Workers Congress" as separate parties.',
    'TASK: Lead with the key takeaways at a high level as the "news of the nation," then turn to polls that may be surprising. Think "top of the hour" polling update.',
    'DATA FIRST: Use preElectionStateOfPlay and allScopePolling to explain the nationwide poll-of-polls picture. Use polling as the current detailed board for individual pollsters, margins of error, spread ranges, projected seats, and house effects.',
    'SURPRISES: Use surprisingPolls and allScopePolling to identify regional or provincial polls that break from the national story, show unusual swings, show close races, or show pollster disagreement.',
    'CONTEXT: Explicitly connect the polling picture to activeTrends, party legend, and scoped result context when explaining why the numbers might look this way.',
    'IMMERSION: Sound like a television panel already on air—natural interruptions, follow-up questions, analyst-to-analyst dialogue. No definitions of the simulator, no tutorial language, no prompt commentary.',
    'Use only supplied facts and numbers; do not invent counties, parties, pollsters, margins, or quotes.',
    'Return ONLY the six dialogue paragraphs separated by blank lines. No markdown, headings, bullets, hidden reasoning, or <think> blocks.',
  ].join(' ')
}

function pollingVotePctMap(values = {}) {
  const rawValues = Object.values(values || {}).map((value) => numberOrNull(value)).filter((value) => value !== null)
  const alreadyPct = rawValues.some((value) => value > 1)
  return compactObject(Object.fromEntries(PARTIES.map((party) => {
    const value = numberOrNull(values?.[party])
    if (value === null) return [party, undefined]
    return [party, roundNumber(alreadyPct ? value : value * 100, 1)]
  })))
}

function pollingContext(polling = null) {
  if (!polling) return undefined
  const aggregate = polling.aggregate || {}
  const projectedSeats = aggregate.projectedSeats || aggregate.seats || null
  const methodologyNotes = uniqueList(
    polling.methodologyNotes || (polling.pollsters || []).map((pollster) => `${pollster.name}: ${pollster.methodology}`),
    8
  )

  return compactObject({
    scope: polling.scope,
    scopeLabel: polling.scopeLabel,
    aggregate: compactObject({
      voteSharesPct: aggregate.voteSharesPct || pollingVotePctMap(aggregate.voteShares),
      projectedSeats,
      leader: aggregate.leader,
    }),
    spread: polling.spread || aggregate.spread,
    pollsterCount: polling.pollsterCount || (Array.isArray(polling.pollsters) ? polling.pollsters.length : undefined),
    methodologyNotes,
  })
}

function baselineScenarioFlag(results = {}) {
  const config = results?.config || {}
  return (
    config.trendPackageId === 'baseline' ||
    (config.seed === 'baseline' && config.jitterSeed === 'baseline')
  ) && (!Array.isArray(config.trends) || config.trends.length === 0)
}

function scenarioContext(results = {}, baselineResults = {}) {
  const isBaselineScenario = baselineScenarioFlag(results)
  const trendCount = Array.isArray(results?.config?.trends) ? results.config.trends.length : 0

  return compactObject({
    phase: 'pre_election',
    isBaselineScenario,
    currentScenarioMeaning: isBaselineScenario
      ? 'Neutral baseline state of play for the upcoming election; these are not completed election results.'
      : 'Current pre-election scenario state of play shaped by active trends; these are not completed election results.',
    priorElectionMeaning: 'Baseline Election Climate is the prior election/reference baseline used for comparison.',
    guidance: isBaselineScenario
      ? 'Because this is the baseline scenario, emphasize the upcoming election poll picture and use prior-election comparisons sparingly.'
      : 'Compare the current pre-election state of play against the prior election when it clarifies movement.',
    currentScenario: compactObject({
      name: results?.config?.scenarioName,
      description: results?.config?.scenarioDescription,
      trendPackageId: results?.config?.trendPackageId,
      trendCount,
    }),
    priorElectionScenario: compactObject({
      name: baselineResults?.config?.scenarioName || 'Baseline Election Climate',
      description: baselineResults?.config?.scenarioDescription || 'No randomized climate trends are active.',
      trendPackageId: baselineResults?.config?.trendPackageId || 'baseline',
    }),
  })
}

function pollingSeatContext(projectedSeats = null) {
  if (!projectedSeats) return undefined
  return compactObject({
    assembly: projectedSeats.assembly ? seatMap(projectedSeats.assembly) : undefined,
    prelates: projectedSeats.prelates ? seatMap(projectedSeats.prelates) : undefined,
  })
}

function strongestPollingSwing(voteSharesPct = {}, baselineVoteShares = {}, partyMeta = PARTY_META) {
  if (!baselineVoteShares || Object.keys(baselineVoteShares).length === 0) return null
  const strongest = PARTIES
    .map((party) => ({
      party,
      name: partyMeta[party]?.name || PARTY_META[party]?.name || party,
      points: roundNumber((numberOrNull(voteSharesPct?.[party]) ?? 0) - ((numberOrNull(baselineVoteShares?.[party]) ?? 0) * 100), 1),
    }))
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points) || PARTIES.indexOf(a.party) - PARTIES.indexOf(b.party))[0]

  return strongest || null
}

function priorElectionPollingContext(baselineUnit = null, partyMeta = PARTY_META) {
  if (!baselineUnit?.assembly && !baselineUnit?.prelates) return undefined
  const votePct = baselineUnit?.assembly?.vote_shares ? voteShareMap(baselineUnit.assembly.vote_shares) : null
  const leader = topPartyOrNull(votePct)

  return compactObject({
    leader,
    leaderName: leader ? partyMeta[leader]?.name || PARTY_META[leader]?.name || leader : undefined,
    assemblyVotePct: votePct,
    assemblySeats: seatMap(baselineUnit?.assembly?.seats),
    councilSeats: seatMap(baselineUnit?.prelates?.seats),
  })
}

function pollAggregateContext(polling = null, baselineUnit = null, partyMeta = PARTY_META) {
  if (!polling) return undefined
  const aggregate = polling.aggregate || {}
  const projectedSeats = aggregate.projectedSeats || aggregate.seats || null
  const voteSharesPct = aggregate.voteSharesPct || pollingVotePctMap(aggregate.voteShares)

  return compactObject({
    scope: polling.scope,
    scopeKey: polling.scopeKey,
    scopeLabel: polling.scopeLabel,
    aggregate: compactObject({
      voteSharesPct,
      projectedSeats: pollingSeatContext(projectedSeats),
      leader: aggregate.leader,
    }),
    priorElection: priorElectionPollingContext(baselineUnit, partyMeta),
    changeFromPriorElectionPct: baselineUnit?.assembly?.vote_shares ? getSwings(
      Object.fromEntries(PARTIES.map((party) => [party, (numberOrNull(voteSharesPct?.[party]) ?? 0) / 100])),
      baselineUnit.assembly.vote_shares
    ) : undefined,
    strongestChangeFromPriorElection: strongestPollingSwing(voteSharesPct, baselineUnit?.assembly?.vote_shares, partyMeta),
    spread: polling.spread || aggregate.spread,
    pollsterCount: polling.pollsterCount || (Array.isArray(polling.pollsters) ? polling.pollsters.length : undefined),
  })
}

function pollsterBreakdownContext(pollster = {}, partyMeta = PARTY_META) {
  return compactObject({
    id: pollster.id,
    name: pollster.name,
    tagline: pollster.tagline,
    methodology: pollster.methodology,
    leader: pollster.leader,
    leaderName: partyMeta[pollster.leader]?.name || PARTY_META[pollster.leader]?.name || pollster.leader,
    marginOfErrorPct: roundNumber((numberOrNull(pollster.marginOfError) ?? 0) * 100, 1),
    houseEffect: pollster.houseEffect ? compactObject({
      party: pollster.houseEffect.party,
      partyName: partyMeta[pollster.houseEffect.party]?.name || PARTY_META[pollster.houseEffect.party]?.name || pollster.houseEffect.party,
      points: roundNumber(pollster.houseEffect.points, 1),
    }) : undefined,
    voteSharesPct: pollingVotePctMap(pollster.voteShares),
    projectedSeats: pollster.seats ? {
      assembly: seatMap(pollster.seats.assembly),
      council: seatMap(pollster.seats.prelates),
    } : undefined,
  })
}

function pollBreakdownPollingContext(polling = null, partyMeta = PARTY_META, baselineUnit = null) {
  if (!polling) return undefined
  const aggregate = polling.aggregate || {}
  const voteSharesPct = aggregate.voteSharesPct || pollingVotePctMap(aggregate.voteShares)

  return compactObject({
    ...pollingContext(polling),
    priorElection: priorElectionPollingContext(baselineUnit, partyMeta),
    changeFromPriorElectionPct: baselineUnit?.assembly?.vote_shares ? getSwings(
      Object.fromEntries(PARTIES.map((party) => [party, (numberOrNull(voteSharesPct?.[party]) ?? 0) / 100])),
      baselineUnit.assembly.vote_shares
    ) : undefined,
    strongestChangeFromPriorElection: strongestPollingSwing(voteSharesPct, baselineUnit?.assembly?.vote_shares, partyMeta),
    pollsters: (polling.pollsters || []).map((pollster) => pollsterBreakdownContext(pollster, partyMeta)),
  })
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
      PARTIES.map((party) => [party, integerOrNull(seats?.[party]) ?? 0])
    )
  )
}

function voteShareMap(shares = {}) {
  return compactObject(
    Object.fromEntries(
      PARTIES.map((party) => [party, roundNumber((numberOrNull(shares?.[party]) ?? 0) * 100, 1)])
    )
  )
}

function topPartiesFromShares(shares = {}, max = 3, partyMeta = PARTY_META) {
  return PARTIES
    .map((party) => ({
      party,
      name: partyMeta[party]?.name || PARTY_META[party].name,
      votePct: roundNumber((numberOrNull(shares?.[party]) ?? 0) * 100, 1),
    }))
    .filter((row) => row.votePct > 0)
    .sort((a, b) => b.votePct - a.votePct)
    .slice(0, max)
}

function strongestSwing(current, baseline, partyMeta = PARTY_META) {
  const swings = getSwings(current, baseline)
  const strongest = Object.entries(swings)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]

  if (!strongest) return null
  const [party, points] = strongest
  return {
    party,
    name: partyMeta[party]?.name || PARTY_META[party]?.name || party,
    points,
  }
}

function incumbentLeadershipChanges(
  results = {},
  previousElectionResults = {},
  scope = 'national',
  targetName = null,
  partyMeta = PARTY_META,
  representativeNames = {},
) {
  if (!previousElectionResults || Object.keys(previousElectionResults).length === 0) return []

  const levelScope = scope === 'overview' ? 'national' : scope
  const displayScope = levelScope.charAt(0).toUpperCase() + levelScope.slice(1)

  let chamberPairs = []
  if (levelScope === 'national') {
    chamberPairs = [
      [results.national?.assembly, previousElectionResults.national?.assembly, 'assembly', 'national', 'Assembly'],
      [results.national?.prelates, previousElectionResults.national?.prelates, 'prelates', 'national', 'Council'],
    ]
  } else if (levelScope === 'regional') {
    const cur = results.regions?.[targetName] || {}
    const prev = previousElectionResults.regions?.[targetName] || {}
    chamberPairs = [
      [cur.assembly, prev.assembly, 'assembly', 'regional', 'Assembly'],
      [cur.prelates, prev.prelates, 'prelates', 'regional', 'Council'],
    ]
  } else if (levelScope === 'provincial') {
    const cur = (results.provinces || []).find((p) => p.name === targetName) || {}
    const prev = (previousElectionResults.provinces || []).find((p) => p.name === targetName) || {}
    chamberPairs = [
      [cur.assembly, prev.assembly, 'assembly', 'provincial', 'Assembly'],
      [cur.prelates, prev.prelates, 'prelates', 'provincial', 'Council'],
    ]
  }

  const changes = []

  for (const [cur, prev, chamberType, chamberLevel, chamberLabel] of chamberPairs) {
    if (!cur || !prev) continue
    const currentLeaderParty = cur.control?.leaderParty || null
    const previousLeaderParty = prev.control?.leaderParty || null
    if (!currentLeaderParty || !previousLeaderParty) continue

    const currentIsMinority = Array.isArray(cur.control?.supportParties) && cur.control.supportParties.length > 0
    const previousIsMinority = Array.isArray(prev.control?.supportParties) && prev.control.supportParties.length > 0
    const prevSupportSet = new Set(prev.control?.supportParties || [])
    const curSupportSet = new Set(cur.control?.supportParties || [])
    const supportChanged = prevSupportSet.size !== curSupportSet.size ||
      [...curSupportSet].some((p) => !prevSupportSet.has(p))

    let changeType = null
    if (currentLeaderParty !== previousLeaderParty) {
      changeType = 'party-flip'
    } else if (previousIsMinority && !currentIsMinority) {
      changeType = 'minority-to-majority'
    } else if (!previousIsMinority && currentIsMinority) {
      changeType = 'majority-to-minority'
    } else if (supportChanged) {
      changeType = 'status-change'
    }

    if (!changeType) continue

    const currentTitle = chamberType === 'assembly'
      ? lowerHouseLeaderTitle(chamberLevel)
      : upperHouseLeaderTitle(chamberLevel)
    const previousTitle = chamberType === 'assembly'
      ? lowerHouseLeaderTitle(chamberLevel)
      : upperHouseLeaderTitle(chamberLevel)

    const currentLeaderPartyName = partyMeta[currentLeaderParty]?.name || PARTY_META[currentLeaderParty]?.name || currentLeaderParty
    const previousLeaderPartyName = partyMeta[previousLeaderParty]?.name || PARTY_META[previousLeaderParty]?.name || previousLeaderParty

    const currentLeaderName = Object.entries(representativeNames || {})
      .find(([k]) => k.startsWith(`${currentLeaderParty}_`))?.[1] || null
    const previousLeaderName = Object.entries(representativeNames || {})
      .find(([k]) => k.startsWith(`${previousLeaderParty}_`))?.[1] || null

    let changeNarrative = ''
    if (changeType === 'party-flip') {
      const who = currentLeaderName || 'The new leader'
      changeNarrative = `${currentLeaderPartyName} has taken the ${chamberLabel} from ${previousLeaderPartyName}. ${who} becomes ${currentTitle}.`
    } else if (changeType === 'minority-to-majority') {
      const who = currentLeaderName || 'their leader'
      changeNarrative = `${currentLeaderPartyName} gained an outright majority in the ${chamberLabel}, securing ${who}'s mandate as ${currentTitle}.`
    } else if (changeType === 'majority-to-minority') {
      const who = currentLeaderName || 'their leader'
      changeNarrative = `${currentLeaderPartyName} retained the ${chamberLabel} but lost its majority, now governing as a minority ${currentTitle} under ${who}.`
    } else if (changeType === 'status-change') {
      changeNarrative = `${currentLeaderPartyName}'s ${chamberLabel} coalition has shifted since the previous election.`
    }

    changes.push(compactObject({
      chamber: chamberLabel,
      chamberType,
      scope: displayScope,
      previousLeaderParty,
      previousLeaderPartyName,
      previousTitle,
      previousIsMinority,
      previousLeaderName,
      currentLeaderParty,
      currentLeaderPartyName,
      currentTitle,
      currentIsMinority,
      currentLeaderName,
      changeType,
      changeNarrative,
    }))
  }

  return changes
}

function chamberContext(chamber = {}, baselineChamber = null, partyMeta = PARTY_META) {
  return compactObject({
    control: chamber?.control?.label,
    detail: chamber?.control?.detail,
    majority: integerOrNull(chamber?.control?.majority),
    seatCount: integerOrNull(chamber?.seat_count) ?? sumSeats(chamber?.seats),
    seats: seatMap(chamber?.seats),
    votePct: chamber?.vote_shares ? voteShareMap(chamber.vote_shares) : null,
    swingPct: baselineChamber?.vote_shares ? getSwings(chamber?.vote_shares, baselineChamber.vote_shares) : null,
    strongestSwing: baselineChamber?.vote_shares ? strongestSwing(chamber?.vote_shares, baselineChamber.vote_shares, partyMeta) : null,
    leaderParty: chamber?.control?.leaderParty || null,
    isMinority: Array.isArray(chamber?.control?.supportParties) && chamber.control.supportParties.length > 0,
    supportParties: chamber?.control?.supportParties || [],
  })
}

function regionContext(name, region = {}, baselineRegion = null, partyMeta = PARTY_META) {
  return compactObject({
    name,
    population: integerOrNull(region.population),
    provinceCount: integerOrNull(region.province_count),
    provinces: (region.provinces || []).slice(0, 10),
    assembly: chamberContext(region.assembly, baselineRegion?.assembly, partyMeta),
    council: chamberContext(region.prelates, baselineRegion?.prelates, partyMeta),
    topProvince: (region.provinces || []).length > 0 ? region.provinces[0] : null,
  })
}

function provinceResultContext(province = {}, baselineProvince = null, partyMeta = PARTY_META) {
  return compactObject({
    name: province.name,
    group: province.group,
    originalCountry: province.original_country || null,
    population: integerOrNull(province.provincial_population),
    flags: provinceFlags(province),
    assemblypeople: integerOrNull(province.assemblypeople),
    prelates: integerOrNull(province.prelates?.seat_count),
    countyCount: integerOrNull(province.counties?.length),
    featureSignals: compactObject({
      urbanization: roundNumber(province.political_features?.urbanization_index, 2),
      industrial: roundNumber(province.political_features?.industrial_index, 2),
      localist: roundNumber(province.political_features?.localist_index, 2),
      workerGrievance: roundNumber(province.political_features?.worker_grievance_index, 2),
      spiritual: roundNumber(province.political_features?.spiritual_index, 2),
      imperialCore: roundNumber(province.political_features?.imperial_core_index, 2),
      foreignOrigin: roundNumber(province.political_features?.foreign_origin_index, 2),
      frontier: roundNumber(province.political_features?.frontier_index, 2),
      connectedness: roundNumber(province.political_features?.connectedness_index, 2),
    }),
    assembly: chamberContext(province.assembly, baselineProvince?.assembly, partyMeta),
    council: chamberContext(province.prelates, baselineProvince?.prelates, partyMeta),
  })
}

function countyResultContext(county = {}, baselineCounty = null, partyMeta = PARTY_META) {
  return compactObject({
    name: county.name || county.tile_id || 'Unnamed county',
    population: integerOrNull(county.county_population),
    terrain: county.terrain || null,
    improvement: county.improvement_name || null,
    topParties: topPartiesFromShares(county.vote_shares, 2, partyMeta),
    strongestSwing: baselineCounty?.vote_shares ? strongestSwing(county.vote_shares, baselineCounty.vote_shares, partyMeta) : null,
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

function regionOverview(results = {}, baselineResults = {}, max = 14, partyMeta = PARTY_META) {
  return Object.entries(results.regions || {})
    .map(([name, region]) => regionContext(name, region, baselineResults?.regions?.[name], partyMeta))
    .sort((a, b) => (numberOrNull(b.population) || 0) - (numberOrNull(a.population) || 0))
    .slice(0, max)
}

function provinceHighlights(results = {}, baselineResults = {}, max = 10, partyMeta = PARTY_META) {
  return (results.provinces || [])
    .sort((a, b) => (
      (a.is_national_capital ? -1 : 0) - (b.is_national_capital ? -1 : 0) ||
      (numberOrNull(b.provincial_population) || 0) - (numberOrNull(a.provincial_population) || 0)
    ))
    .slice(0, max)
    .map((province) => provinceResultContext(province, findBaselineProvince(baselineResults, province), partyMeta))
}

function nationalFocusExamples(results = {}, baselineResults = {}, max = 4, partyMeta = PARTY_META) {
  return Object.entries(results.regions || {})
    .map(([name, region]) => regionContext(name, region, baselineResults?.regions?.[name], partyMeta))
    .filter((region) => region.assembly?.strongestSwing || region.council?.strongestSwing)
    .sort((a, b) => {
      const aSwing = Math.max(Math.abs(a.assembly?.strongestSwing?.points || 0), Math.abs(a.council?.strongestSwing?.points || 0))
      const bSwing = Math.max(Math.abs(b.assembly?.strongestSwing?.points || 0), Math.abs(b.council?.strongestSwing?.points || 0))
      return bSwing - aSwing || (numberOrNull(b.population) || 0) - (numberOrNull(a.population) || 0)
    })
    .slice(0, max)
}

function extractImportantRepresentatives(chamber, chamberType, scope, provinces = [], partyMeta = PARTY_META, targetName = null, seatDetails = [], representativeNames = {}) {
  if (!chamber?.control?.leaderParty) return null
  
  const leaderParty = chamber.control.leaderParty
  const supportParties = chamber.control.supportParties || []
  
  // Get proper leader title based on scope and chamber type
  const leaderTitle = chamberType === 'assembly' 
    ? lowerHouseLeaderTitle(scope) 
    : upperHouseLeaderTitle(scope)
  
  const representatives = []
  
  // Helper to get representative information from seat details
  const getRepresentativeInfo = (party, isLeader = false) => {
    const partySeats = seatDetails.filter((s) => s.party === party)
    if (partySeats.length === 0) return null
    
    // For leaders, get the seat with highest support metric
    const seat = isLeader 
      ? partySeats.sort((a, b) => (b.supportMetric || 0) - (a.supportMetric || 0))[0]
      : partySeats[0]
    
    if (!seat) return null
    
    const key = `${party}_${seat.seatIndex}`
    const personalName = representativeNames[key] || null
    
    return {
      name: personalName,
      jurisdiction: seat.jurisdiction,
      voteShare: seat.voteShare,
      supportMetric: seat.supportMetric,
      seatIndex: seat.seatIndex,
    }
  }
  
  // Add governing party leader with proper title and detailed information
  const leaderName = partyMeta[leaderParty]?.name || leaderParty
  const leaderInfo = getRepresentativeInfo(leaderParty, true)
  representatives.push({
    role: leaderTitle,
    party: leaderParty,
    partyName: leaderName,
    name: leaderInfo?.name || null,
    isGoverning: true,
    isLeader: true,
    jurisdiction: leaderInfo?.jurisdiction || (targetName || (scope === 'national' ? 'National' : scope === 'regional' ? 'Regional' : 'Provincial')),
    voteShare: leaderInfo?.voteShare || null,
    supportMetric: leaderInfo?.supportMetric || null,
  })
  
  // Add support party leaders for minority governments
  supportParties.forEach((party) => {
    const partyName = partyMeta[party]?.name || party
    const supportInfo = getRepresentativeInfo(party, true)
    representatives.push({
      role: 'Caucus Leader',
      party,
      partyName,
      name: supportInfo?.name || null,
      isGoverning: true,
      isSupport: true,
      jurisdiction: supportInfo?.jurisdiction || (targetName || (scope === 'national' ? 'National' : scope === 'regional' ? 'Regional' : 'Provincial')),
      voteShare: supportInfo?.voteShare || null,
      supportMetric: supportInfo?.supportMetric || null,
    })
  })
  
  // Add opposition leader (largest non-governing party)
  const allParties = Object.keys(chamber.seats || {})
  const oppositionParties = allParties.filter(p => p !== leaderParty && !supportParties.includes(p))
  if (oppositionParties.length > 0) {
    const sortedOpposition = oppositionParties.sort((a, b) => (chamber.seats[b] || 0) - (chamber.seats[a] || 0))
    const oppositionLeaderParty = sortedOpposition[0]
    const oppositionLeaderName = partyMeta[oppositionLeaderParty]?.name || oppositionLeaderParty
    const oppositionInfo = getRepresentativeInfo(oppositionLeaderParty, true)
    representatives.push({
      role: 'Opposition Leader',
      party: oppositionLeaderParty,
      partyName: oppositionLeaderName,
      name: oppositionInfo?.name || null,
      isGoverning: false,
      isOppositionLeader: true,
      jurisdiction: oppositionInfo?.jurisdiction || (targetName || (scope === 'national' ? 'National' : scope === 'regional' ? 'Regional' : 'Provincial')),
      voteShare: oppositionInfo?.voteShare || null,
      supportMetric: oppositionInfo?.supportMetric || null,
    })
  }
  
  return representatives.length > 0 ? representatives : null
}

function representativesContext(results = {}, scope = 'national', targetName = null, partyMeta = PARTY_META, seatDetails = [], representativeNames = {}) {
  const representatives = []
  
  if (scope === 'national' || scope === 'overview') {
    // National assembly representatives
    const nationalAssemblyReps = extractImportantRepresentatives(
      results.national?.assembly,
      'assembly',
      'national',
      results.provinces,
      partyMeta,
      targetName,
      seatDetails,
      representativeNames
    )
    if (nationalAssemblyReps) {
      nationalAssemblyReps.forEach(rep => representatives.push({ ...rep, chamber: 'Assembly', scope: 'National' }))
    }
    
    // National council representatives
    const nationalCouncilReps = extractImportantRepresentatives(
      results.national?.prelates,
      'council',
      'national',
      results.provinces,
      partyMeta,
      targetName,
      seatDetails,
      representativeNames
    )
    if (nationalCouncilReps) {
      nationalCouncilReps.forEach(rep => representatives.push({ ...rep, chamber: 'Council', scope: 'National' }))
    }
  }
  
  if (scope === 'regional') {
    const region = results.regions?.[targetName]
    if (region) {
      const regionalAssemblyReps = extractImportantRepresentatives(
        region.assembly,
        'assembly',
        'regional',
        results.provinces,
        partyMeta,
        targetName,
        seatDetails,
        representativeNames
      )
      if (regionalAssemblyReps) {
        regionalAssemblyReps.forEach(rep => representatives.push({ ...rep, chamber: 'Assembly', scope: 'Regional', region: targetName }))
      }
      
      const regionalCouncilReps = extractImportantRepresentatives(
        region.prelates,
        'council',
        'regional',
        results.provinces,
        partyMeta,
        targetName,
        seatDetails,
        representativeNames
      )
      if (regionalCouncilReps) {
        regionalCouncilReps.forEach(rep => representatives.push({ ...rep, chamber: 'Council', scope: 'Regional', region: targetName }))
      }
    }
  }
  
  if (scope === 'provincial') {
    const province = (results.provinces || []).find(p => p.name === targetName)
    if (province) {
      const provincialAssemblyReps = extractImportantRepresentatives(
        province.assembly,
        'assembly',
        'provincial',
        results.provinces,
        partyMeta,
        targetName,
        seatDetails,
        representativeNames
      )
      if (provincialAssemblyReps) {
        provincialAssemblyReps.forEach(rep => representatives.push({ ...rep, chamber: 'Assembly', scope: 'Provincial', province: targetName }))
      }
      
      const provincialCouncilReps = extractImportantRepresentatives(
        province.prelates,
        'council',
        'provincial',
        results.provinces,
        partyMeta,
        targetName,
        seatDetails,
        representativeNames
      )
      if (provincialCouncilReps) {
        provincialCouncilReps.forEach(rep => representatives.push({ ...rep, chamber: 'Council', scope: 'Provincial', province: targetName }))
      }
    }
  }
  
  return representatives.length > 0 ? representatives.slice(0, 6) : null
}

function broadcastFocusContext(results = {}, baselineResults = {}, scope = 'national', targetName = null, partyMeta = PARTY_META, seatDetails = [], representativeNames = {}) {
  const representatives = representativesContext(results, scope, targetName, partyMeta, seatDetails, representativeNames)
  
  if (scope === 'overview') {
    return {
      type: 'overview',
      national: compactObject({
        population: integerOrNull(results.national?.population),
        assembly: chamberContext(results.national?.assembly, baselineResults?.national?.assembly, partyMeta),
        council: chamberContext(results.national?.prelates, baselineResults?.national?.prelates, partyMeta),
      }),
      regionalOverview: regionOverview(results, baselineResults, 14, partyMeta),
      provinceHighlights: provinceHighlights(results, baselineResults, 10, partyMeta),
      representatives,
    }
  }

  if (scope === 'regional') {
    const region = results.regions?.[targetName] || {}
    const baselineRegion = baselineResults?.regions?.[targetName] || null
    const provinces = (results.provinces || [])
      .filter((province) => province.group === targetName)
      .sort((a, b) => (numberOrNull(b.provincial_population) || 0) - (numberOrNull(a.provincial_population) || 0))
      .slice(0, 12)
      .map((province) => provinceResultContext(province, findBaselineProvince(baselineResults, province), partyMeta))

    return {
      type: 'regional',
      region: regionContext(targetName, region, baselineRegion, partyMeta),
      provinces,
      representatives,
    }
  }

  if (scope === 'provincial') {
    const province = (results.provinces || []).find((candidate) => candidate.name === targetName) || {}
    const baselineProvince = findBaselineProvince(baselineResults, province)
    const counties = (province.counties || [])
      .sort((a, b) => (numberOrNull(b.county_population) || 0) - (numberOrNull(a.county_population) || 0))
      .slice(0, 12)
      .map((county) => countyResultContext(county, findBaselineCounty(baselineProvince, county), partyMeta))

    return {
      type: 'provincial',
      province: provinceResultContext(province, baselineProvince, partyMeta),
      counties,
      representatives,
    }
  }

  return {
    type: 'national',
    examples: nationalFocusExamples(results, baselineResults, 4, partyMeta),
    representatives,
  }
}

function unitForPollingScope(results = {}, polling = {}) {
  if (polling.scope === 'national') return results.national || null
  if (polling.scope === 'regional') {
    return results.regions?.[polling.scopeKey] || results.regions?.[polling.scopeLabel] || null
  }
  if (polling.scope === 'provincial') {
    const key = String(polling.scopeKey ?? '')
    return (results.provinces || []).find((province) => (
      String(province.provinceIndex) === key ||
      String(province.name || '') === String(polling.scopeLabel || '')
    )) || null
  }
  return null
}

function topPollingParties(voteSharesPct = {}, max = 2, partyMeta = PARTY_META) {
  return PARTIES
    .map((party) => ({
      party,
      name: partyMeta[party]?.name || PARTY_META[party]?.name || party,
      votePct: numberOrNull(voteSharesPct?.[party]) ?? 0,
    }))
    .sort((a, b) => b.votePct - a.votePct || PARTIES.indexOf(a.party) - PARTIES.indexOf(b.party))
    .slice(0, max)
}

function topPartyFromValues(values = {}) {
  return [...PARTIES].sort((a, b) => (
    (numberOrNull(values?.[b]) ?? 0) - (numberOrNull(values?.[a]) ?? 0) ||
    PARTIES.indexOf(a) - PARTIES.indexOf(b)
  ))[0]
}

function topPartyOrNull(values = {}) {
  const hasSignal = Object.values(values || {}).some((value) => (numberOrNull(value) ?? 0) > 0)
  return hasSignal ? topPartyFromValues(values) : null
}

function leaderSpreadWidth(spread = {}, leader = null) {
  const range = spread?.voteShareRangePct?.[leader]
  const min = numberOrNull(range?.min)
  const max = numberOrNull(range?.max)
  if (min === null || max === null) return null
  return roundNumber(max - min, 1)
}

function surprisingPollContexts(pollingScopes = [], results = {}, baselineResults = {}, partyMeta = PARTY_META) {
  const scopes = Array.isArray(pollingScopes) ? pollingScopes : []
  const nationalScope = scopes.find((scope) => scope.scope === 'national') || scopes[0] || null
  const nationalLeader = nationalScope
    ? nationalScope.aggregate?.leader || topPartyOrNull(nationalScope.aggregate?.voteShares)
    : null

  return scopes
    .map((scope) => {
      const unit = unitForPollingScope(results, scope)
      const baselineUnit = unitForPollingScope(baselineResults, scope)
      const context = pollAggregateContext(scope, baselineUnit, partyMeta)
      if (!context?.aggregate?.voteSharesPct) return null

      const topTwo = topPollingParties(context.aggregate.voteSharesPct, 2, partyMeta)
      const leader = topTwo[0]?.party || context.aggregate.leader
      const runnerUp = topTwo[1] || null
      const margin = runnerUp ? roundNumber((topTwo[0]?.votePct || 0) - runnerUp.votePct, 1) : null
      const resultLeader = topPartyOrNull(unit?.assembly?.vote_shares || unit?.assembly?.seats || {})
      const baselineLeader = topPartyOrNull(baselineUnit?.assembly?.vote_shares || {})
      const spreadWidth = leaderSpreadWidth(context.spread, leader)
      const strongestSwing = context.strongestChangeFromPriorElection
      const reasons = []
      let score = 0

      if (scope.scope !== 'national' && leader && nationalLeader && leader !== nationalLeader) {
        reasons.push(`Breaks from the national ${partyMeta[nationalLeader]?.name || nationalLeader} lead`)
        score += 4
      }
      if (resultLeader && leader && resultLeader !== leader) {
        reasons.push(`Poll leader differs from the projected local state-of-play leader`)
        score += 3
      }
      if (baselineLeader && leader && baselineLeader !== leader) {
        reasons.push(`Poll leader differs from the prior election leader`)
        score += 2
      }
      if (margin !== null && margin <= 2.5) {
        reasons.push(`Top two parties are within ${margin} points`)
        score += 2
      }
      if (spreadWidth !== null && spreadWidth >= 4) {
        reasons.push(`Pollster spread for the leader spans ${spreadWidth} points`)
        score += 2
      }
      if (strongestSwing && Math.abs(strongestSwing.points) >= 4) {
        reasons.push(`${strongestSwing.name} is ${strongestSwing.points > 0 ? 'up' : 'down'} ${Math.abs(strongestSwing.points)} points from the prior election`)
        score += 2
      }

      if (score <= 0) return null

      return compactObject({
        scope: context.scope,
        scopeKey: context.scopeKey,
        scopeLabel: context.scopeLabel,
        leader,
        leaderName: partyMeta[leader]?.name || PARTY_META[leader]?.name || leader,
        topTwo,
        marginPct: margin,
        projectedSeats: context.aggregate.projectedSeats,
        spread: context.spread,
        strongestSwing,
        reasons,
        score,
      })
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || String(a.scopeLabel || '').localeCompare(String(b.scopeLabel || '')))
    .slice(0, 10)
}

function allScopePollingContext(pollingScopes = [], baselineResults = {}, partyMeta = PARTY_META) {
  return (Array.isArray(pollingScopes) ? pollingScopes : [])
    .map((scope) => pollAggregateContext(scope, unitForPollingScope(baselineResults, scope), partyMeta))
    .filter(Boolean)
}

function broadcastUserPrompt(results = {}, baselineResults = {}, scope = 'national', targetName = null, polling = null, seatDetails = [], representativeNames = {}, incumbentRoster = {}, electionNumber = 0) {
  const target = targetName || (scope === 'overview' ? 'Election Overview' : 'National')
  const includeNational = scope === 'overview' || scope === 'national'
  const partyMeta = partyMetaForContext(results)
  const isFirstElection = (electionNumber || 0) === 0
  const keyFigures = representativesContext(results, scope, targetName, partyMeta, seatDetails, representativeNames)

  return JSON.stringify({
    task: 'Write 5 to 7 plain-text election broadcast paragraphs based only on this newsroom data. Results are FINALIZED.',
    keyFigures,
    keyFiguresInstruction: keyFigures?.length
      ? 'These are the named leaders for this broadcast. Use their personal names throughout — do not reduce them to party labels alone. Mix name and party the way broadcast journalists do: "Prime Minister [Name]\'s [Party]," "[Name] of the [Party]," "the [Title] [Name]."'
      : undefined,
    scope,
    target,
    phase: 'post_election',
    electionYear: 2026 + (electionNumber || 0) * 2,
    electionNumber: electionNumber || 0,
    isFirstElection,
    scopeBoundary: {
      overview: 'Full election board. This is the only request allowed to consolidate national, regional, provincial, and county-level context.',
      national: 'National page. Focus on national chambers, national popular vote, and national control. Regional items are examples only if present in focus.examples.',
      regional: `Regional page. Focus only on ${targetName || 'the selected region'} and its provinces.`,
      provincial: `Provincial page. Focus only on ${targetName || 'the selected province'} and its counties.`,
    }[scope] || 'National page.',
    interpretationRules: [
      'phase is post_election: results are FINAL and certified. Do not use uncertainty language.',
      isFirstElection
        ? 'isFirstElection is true: this is the first election. There is no prior election to compare against; omit all historical comparisons.'
        : 'baselineResults represents the PREVIOUS CONFIRMED ELECTION used for swingPct and seat-change comparisons.',
      'swingPct and strongestSwing fields show how current results compare to the previous election.',
      'incumbentChanges lists leadership transitions between the previous and current election; use these to tell the political story.',
      'polling.aggregate represents PRE-ELECTION EXPECTATIONS; compare with final results to highlight surprises.',
    ].filter(Boolean),
    partyLegend: partyLegend(partyMeta),
    partyIdentityRules: partyIdentityRules(partyMeta),
    activeTrends: trendSummaries(results.config?.trends || []),
    incumbentChanges: isFirstElection ? [] : incumbentLeadershipChanges(results, baselineResults, scope, targetName, partyMeta, representativeNames),
    national: includeNational ? compactObject({
      population: integerOrNull(results.national?.population),
      assembly: chamberContext(results.national?.assembly, baselineResults?.national?.assembly, partyMeta),
      council: chamberContext(results.national?.prelates, baselineResults?.national?.prelates, partyMeta),
    }) : undefined,
    polling: pollingContext(polling),
    focus: broadcastFocusContext(results, baselineResults, scope, targetName, partyMeta, seatDetails, representativeNames),
  })
}

function buildTickerTopLeaders(results, scope, targetName, partyMeta, representativeNames) {
  const levelScope = scope === 'overview' ? 'national' : scope
  let chamberPairs = []

  if (levelScope === 'national') {
    chamberPairs = [
      [results.national?.assembly, 'assembly', 'national', 'Assembly'],
      [results.national?.prelates, 'prelates', 'national', 'Council'],
    ]
  } else if (levelScope === 'regional') {
    const reg = results.regions?.[targetName] || {}
    chamberPairs = [
      [reg.assembly, 'assembly', 'regional', 'Assembly'],
      [reg.prelates, 'prelates', 'regional', 'Council'],
    ]
  } else if (levelScope === 'provincial') {
    const prov = (results.provinces || []).find((p) => p.name === targetName) || {}
    chamberPairs = [
      [prov.assembly, 'assembly', 'provincial', 'Assembly'],
      [prov.prelates, 'prelates', 'provincial', 'Council'],
    ]
  }

  const entries = []
  for (const [chamber, chamberType, chamberLevel, label] of chamberPairs) {
    if (!chamber?.control?.leaderParty) continue
    const party = chamber.control.leaderParty
    const title = chamberType === 'assembly'
      ? lowerHouseLeaderTitle(chamberLevel)
      : upperHouseLeaderTitle(chamberLevel)
    const name = Object.entries(representativeNames || {})
      .find(([k]) => k.startsWith(`${party}_`))?.[1] || null
    entries.push(compactObject({
      chamber: label,
      party,
      partyName: partyMeta[party]?.name || PARTY_META[party]?.name || party,
      title,
      name,
    }))
  }

  return entries.length ? entries : undefined
}

function tickerUserPrompt(results = {}, baselineResults = {}, scope = 'national', targetName = null, polling = null, representativeNames = {}, electionNumber = 0) {
  const target = targetName || (scope === 'overview' ? 'Election Overview' : 'National')
  const includeNational = scope === 'overview' || scope === 'national'
  const partyMeta = partyMetaForContext(results)

  return JSON.stringify({
    task: 'Write one concise election ticker paragraph based only on this page-specific data. Results are FINAL.',
    scope,
    target,
    phase: 'post_election',
    electionYear: 2026 + (electionNumber || 0) * 2,
    isFirstElection: (electionNumber || 0) === 0,
    scopeBoundary: {
      overview: 'Full election board. This is the only ticker allowed to consolidate the whole election.',
      national: 'National ticker. Focus on national chambers, national vote movement, and national control.',
      regional: `Regional ticker. Focus only on ${targetName || 'the selected region'} and its provinces.`,
      provincial: `Provincial ticker. Focus only on ${targetName || 'the selected province'} and its counties.`,
    }[scope] || 'National ticker.',
    topLeaders: buildTickerTopLeaders(results, scope, targetName, partyMeta, representativeNames),
    partyLegend: partyLegend(partyMeta),
    activeTrends: trendSummaries(results.config?.trends || []).slice(0, 8),
    climate: compactObject({
      name: results.config?.scenarioName,
      description: results.config?.scenarioDescription,
      trendCount: Array.isArray(results.config?.trends) ? results.config.trends.length : 0,
    }),
    national: includeNational ? compactObject({
      population: integerOrNull(results.national?.population),
      assembly: chamberContext(results.national?.assembly, baselineResults?.national?.assembly, partyMeta),
      council: chamberContext(results.national?.prelates, baselineResults?.national?.prelates, partyMeta),
    }) : undefined,
    polling: pollingContext(polling),
    focus: broadcastFocusContext(results, baselineResults, scope, targetName, partyMeta),
  })
}

function pollBreakdownUserPrompt(results = {}, baselineResults = {}, polling = null, pollingScopes = []) {
  const partyMeta = partyMetaForContext(results)
  const scope = polling?.scope || 'national'
  const targetName = polling?.scopeLabel || null
  const scopedPolls = Array.isArray(pollingScopes) && pollingScopes.length ? pollingScopes : (polling ? [polling] : [])
  const baselineUnit = unitForPollingScope(baselineResults, polling || { scope: 'national' })

  return JSON.stringify({
    task: 'Write exactly six plain-text analyst roundtable turns about the national pre-election poll picture, then the most surprising polls.',
    scope,
    target: targetName || 'National',
    scenarioContext: scenarioContext(results, baselineResults),
    interpretationRules: [
      'This is a pre-election polling broadcast. Do not report the current scenario as finished election results.',
      'Treat projected seats and projected vote shares as state-of-play projections for the upcoming election.',
      'Treat Baseline Election Climate and priorElection fields as the previous election/reference baseline.',
      'If scenarioContext.isBaselineScenario is true, keep prior-election comparisons light and focus on what the baseline polls imply for the upcoming election.',
      'Use partyIdentityRules to collapse color labels, abbreviations, ids, and formal names into one party identity.',
    ],
    format: [
      'HOST: open with the news of the nation from the national poll-of-polls and the dominant trend context.',
      'POLLING EDITOR: explain the national aggregate vote share, seat projection, and path to control.',
      'DATA ANALYST: compare allScopePolling and identify the first surprising poll or map pattern.',
      'FIELD ANALYST: tie the surprising polls to supplied active trends or local context.',
      'CAMPAIGN STRATEGIST: explain the risk for leading and trailing parties using the national board plus surprising scopes.',
      'HOST: close with the unresolved question the panel will watch next.',
    ],
    partyLegend: partyLegend(partyMeta),
    partyIdentityRules: partyIdentityRules(partyMeta),
    activeTrends: trendSummaries(results.config?.trends || []),
    currentScenario: compactObject({
      name: results.config?.scenarioName,
      description: results.config?.scenarioDescription,
      trendPackageId: results.config?.trendPackageId,
      trendCount: Array.isArray(results.config?.trends) ? results.config.trends.length : 0,
    }),
    priorElectionContext: compactObject({
      label: 'Prior election/reference baseline',
      scenarioName: baselineResults?.config?.scenarioName || 'Baseline Election Climate',
      scenarioDescription: baselineResults?.config?.scenarioDescription || 'No randomized climate trends are active.',
      nationalAssembly: chamberContext(baselineResults.national?.assembly, null, partyMeta),
      nationalCouncil: chamberContext(baselineResults.national?.prelates, null, partyMeta),
    }),
    preElectionStateOfPlay: compactObject({
      label: 'Current pre-election projection/state of play',
      population: integerOrNull(results.national?.population),
      assembly: chamberContext(results.national?.assembly, baselineResults?.national?.assembly, partyMeta),
      council: chamberContext(results.national?.prelates, baselineResults?.national?.prelates, partyMeta),
    }),
    nationalContext: compactObject({
      meaning: 'Current pre-election national projection/state of play, retained for compatibility with existing broadcast packets.',
      population: integerOrNull(results.national?.population),
      assembly: chamberContext(results.national?.assembly, baselineResults?.national?.assembly, partyMeta),
      council: chamberContext(results.national?.prelates, baselineResults?.national?.prelates, partyMeta),
    }),
    allScopePolling: allScopePollingContext(scopedPolls, baselineResults, partyMeta),
    surprisingPolls: surprisingPollContexts(scopedPolls, results, baselineResults, partyMeta),
    polling: pollBreakdownPollingContext(polling, partyMeta, baselineUnit),
    stateOfPlayContext: broadcastFocusContext(results, baselineResults, scope, targetName, partyMeta),
  })
}

function climateSummaryUserPrompt({ trends, seed, data }) {
  const partyMeta = partyMetaForContext(data)
  return JSON.stringify({
    task: 'Create a scenario name and description for this randomized election climate. Respond with ONLY a raw JSON object — no tool calls, no function calls, no extra text.',
    requiredOutputFormat: {
      scenarioName: 'short scenario name, 3 to 7 words',
      scenarioDescription: 'one sentence describing how the randomized trends combine into an election climate',
    },
    RANDOM_SEED: seed || null,
    CURRENT_WORLD: data ? worldContext(data, { includeProvinces: false }) : null,
    PARTY_LEGEND: partyLegend(partyMeta),
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

  const text = stripThinkBlocks(chatContentToText(rawText)).trim()
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
    
    if (import.meta.env.DEV) console.warn('[narrativePlanner] no-json model output:', text)
    throw new ModelOutputError(
      `Could not find a valid JSON object in model output. Output started: ${text.slice(0, 120)}`,
      'no-json',
    )
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

function customTrendGrammar(partyMeta = PARTY_META) {
  return {
    useWhen: 'Prefer TREND_TEMPLATES. Add customTrends only for a narrative element that no existing template covers well.',
    limits: {
      maxCustomTrends: MAX_CUSTOM_TRENDS,
      maxEffectsPerTrend: MAX_CUSTOM_EFFECTS,
      effectLevels: CUSTOM_EFFECT_LEVELS,
      maxMagnitudeByLevel: CUSTOM_MAGNITUDE_LIMITS,
    },
    allowedParties: partyLegend(partyMeta),
    allowedModes: CUSTOM_MODES,
    allowedSelectorShortcuts: SELECTOR_SHORTCUTS,
    allowedFeatureNames: FEATURE_ALLOWLIST,
    selectorNotes: [
      'There is no direct region effect level; affect a region with province/county effects plus selector.groupIncludes.',
      'Use minFeatures/maxFeatures for feature names in allowedFeatureNames.',
      'Use groupIncludes, groupEquals, nameIncludes, terrains, resources, improvementIncludes, isConquered, isNationalCapital, isRegionalCapital, isFounded, or isJoined for targeted effects.',
      'Use originalCountryIncludes/originalCountryEquals plus foreign_origin_index/frontier_index/connectedness_index to target annexed, frontier, or well-connected provinces.',
      'Use adjacency only on province-level effects when a signal should spill from matching provinces into their closest provinces by distance.',
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
          adjacency: 'optional for province effects: { maxDistance, minMultiplier, maxMultiplier, cap, sourceSelector, targetSelector } to spill a province effect into nearby provinces',
        },
      ],
    },
  }
}

function partyIdFromValue(value, partyMeta = PARTY_META) {
  const text = String(value || '').trim()
  if (Object.prototype.hasOwnProperty.call(PARTY_META, text)) return text

  const normalized = normalizedKey(text)
  const match = PARTIES.map((id) => [id, partyMeta[id] || PARTY_META[id]]).find(([id, meta]) => (
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

function sanitizeAdjacency(adjacency = null) {
  if (adjacency === true) {
    return {
      maxDistance: 10,
      minMultiplier: 0.08,
      maxMultiplier: 0.35,
      cap: 0.35,
    }
  }
  if (!adjacency || typeof adjacency !== 'object') return null

  const maxDistance = roundNumber(clampNumber(adjacency.maxDistance, 1, 40, 10), 1)
  const minMultiplier = roundNumber(clampNumber(adjacency.minMultiplier, 0, 0.5, 0.08), 2)
  const maxMultiplier = roundNumber(clampNumber(adjacency.maxMultiplier, minMultiplier, 0.75, 0.35), 2)
  const cap = roundNumber(clampNumber(adjacency.cap, minMultiplier, 0.85, maxMultiplier), 2)

  return compactObject({
    maxDistance,
    minMultiplier,
    maxMultiplier,
    cap,
    sourceSelector: sanitizeSelector(adjacency.sourceSelector || adjacency.selector || {}),
    targetSelector: sanitizeSelector(adjacency.targetSelector || {}),
  })
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
    if (normalized === 'originalcountryincludes') result.originalCountryIncludes = sanitizeTextList(value, 6)
    if (normalized === 'originalcountryequals') result.originalCountryEquals = sanitizeTextList(value, 6)
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
      isimperialorigin: 'isImperialOrigin',
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

function sanitizeCustomEffect(effect = {}, trendId, index, partyMeta = PARTY_META) {
  if (!effect || typeof effect !== 'object') return null
  const levels = normalizeEffectLevels(effect.level || effect.levels)
  const party = partyIdFromValue(effect.party, partyMeta)
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
    adjacency: primaryLevel === 'province' ? sanitizeAdjacency(effect.adjacency) : null,
  })
}

function compileCustomTrends(plan = {}, seed = 'narrative', partyMeta = PARTY_META) {
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
        .map((effect, effectIndex) => sanitizeCustomEffect(effect, trendId, effectIndex, partyMeta))
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
  let payload = {}
  if (data) {
    try {
      payload = JSON.parse(data)
    } catch {
      payload = { _raw: data }
    }
  }
  return { event, payload }
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
  const partyMeta = partyMetaForContext(data)
  emitLlmStatus(onStatus, {
    phase: 'preparing',
    progress: 0.06,
    message: 'Building election narrative context.',
    detail: 'Packing world data, party legend, trend catalog, and custom trend grammar.',
  })

  const messages = [
    { role: 'system', content: plannerSystemPrompt() },
    { role: 'user', content: plannerUserPrompt(narrative, data) },
  ]

  if (import.meta.env.DEV) {
    console.log('=== ELECTION NARRATIVE PLANNER LLM CONTEXT ===')
    console.log('System Prompt:', messages[0].content)
    console.log('User Prompt:', messages[1].content)
    console.log('===============================================')
  }

  let lastError = null
  let content = null

  for (const max_tokens of NARRATIVE_PLAN_TOKEN_BUDGETS) {
    try {
      content = await requestChatCompletion({
        endpoint,
        model,
        temperature: 0.35,
        max_tokens,
        messages,
        onStatus,
      })

      if (import.meta.env.DEV) {
        console.log('=== NARRATIVE PLANNER RAW OUTPUT ===')
        console.log(content)
        console.log('====================================')
      }

      emitLlmStatus(onStatus, {
        phase: 'parsing',
        progress: 0.82,
        message: 'Parsing narrative plan.',
        detail: 'Checking JSON, template selections, volatility, and generated custom trends.',
      })

      break
    } catch (error) {
      lastError = error
      const retryable = ['length', 'empty']
      if (!retryable.includes(error.code)) throw error
    }
  }

  if (!content) throw lastError || new Error('Narrative plan could not be generated.')

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
  const customTrends = compileCustomTrends(plan, seed, partyMeta)
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
      const metadata = normalizeScenarioMetadata(extractJsonObject(stripThinkBlocks(content)))
      emitLlmStatus(onStatus, {
        phase: 'complete',
        progress: 1,
        message: 'Election climate named.',
        detail: metadata.name,
      })
      return metadata
    } catch (error) {
      lastError = error
      const retryable = ['length', 'empty', 'invalid-json', 'no-json']
      if (!retryable.includes(error.code)) throw error
    }
  }

  throw lastError || new Error('Election climate scenario could not be generated.')
}

export async function requestElectionBroadcast({
  results,
  baselineResults,
  scope = 'national',
  targetName = null,
  polling = null,
  seatDetails = [],
  representativeNames = {},
  incumbentRoster = {},
  electionNumber = 0,
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

  const systemPrompt = broadcastSystemPrompt(scope, targetName)
  const userPrompt = broadcastUserPrompt(results, baselineResults, scope, targetName, polling, seatDetails, representativeNames, incumbentRoster, electionNumber)

  if (import.meta.env.DEV) {
    console.log('=== ELECTION BROADCAST LLM CONTEXT ===')
    console.log('Scope:', scope, 'Target:', targetName, 'Election:', electionNumber)
    console.log('System Prompt:', systemPrompt)
    console.log('User Prompt:', userPrompt)
    console.log('=====================================')
  }

  const content = await requestChatCompletion({
    endpoint,
    model,
    temperature: 0.65,
    max_tokens: 3500,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    onStatus,
  })
  emitLlmStatus(onStatus, {
    phase: 'complete',
    progress: 1,
    message: 'Broadcast script received.',
    detail: 'Formatting paragraphs for the transmission screen.',
  })

  return stripThinkBlocks(content)
}

export async function requestPollBreakdown({
  results,
  baselineResults,
  polling = null,
  pollingScopes = [],
  endpoint = import.meta.env.VITE_LMSTUDIO_ENDPOINT || DEFAULT_ENDPOINT,
  model = import.meta.env.VITE_LMSTUDIO_MODEL || DEFAULT_MODEL,
  onStatus,
} = {}) {
  emitLlmStatus(onStatus, {
    phase: 'preparing',
    progress: 0.1,
    message: 'Assembling poll roundtable packet.',
    detail: 'Collecting national takeaways, prior-election baselines, all-scope poll-of-polls, pollster splits, surprises, and campaign climate.',
  })
  const content = await requestChatCompletion({
    endpoint,
    model,
    temperature: 0.58,
    max_tokens: 1800,
    messages: [
      { role: 'system', content: pollBreakdownSystemPrompt() },
      { role: 'user', content: pollBreakdownUserPrompt(results, baselineResults, polling, pollingScopes) },
    ],
    onStatus,
  })
  emitLlmStatus(onStatus, {
    phase: 'complete',
    progress: 1,
    message: 'Poll roundtable script received.',
    detail: 'Formatting analyst turns for the breakdown screen.',
  })

  return stripThinkBlocks(content)
}

export async function requestElectionTicker({
  results,
  baselineResults,
  scope = 'national',
  targetName = null,
  polling = null,
  representativeNames = {},
  electionNumber = 0,
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
      { role: 'user', content: tickerUserPrompt(results, baselineResults, scope, targetName, polling, representativeNames, electionNumber) },
    ],
    onStatus,
  })
  emitLlmStatus(onStatus, {
    phase: 'complete',
    progress: 1,
    message: 'Ticker copy received.',
    detail: 'Ready to type onto the election ticker.',
  })

  return stripThinkBlocks(content).replace(/\s+/g, ' ').trim()
}

function calculateProvinceDemographics(province, allProvinces, countryData) {
  if (!province || !allProvinces?.length) return {}

  // Calculate demographic percentages based on province features
  const features = province.features || {}
  const originIndex = features.imperial_origin_index || 0
  const foreignIndex = features.foreign_origin_index || 0
  const americanIdentity = features.american_identity_index || 0
  const romanIdentity = features.roman_identity_index || 0
  const connectedness = features.connectedness_index || 0.5
  const urbanization = features.urbanization_index || 0.5
  const frontier = features.frontier_index || 0

  // Core Khmer population (native to province)
  const coreKhmer = Math.max(0, 1 - originIndex - foreignIndex)

  // Diaspora from other provinces (internal migration)
  const internalDiaspora = originIndex * (1 - connectedness * 0.5)

  // Foreign diaspora (globalization effect)
  const foreignDiaspora = foreignIndex * connectedness

  // Cultural influences
  const americanInfluence = americanIdentity * 0.3
  const romanInfluence = romanIdentity * 0.2
  const frontierWilderness = frontier * 0.4

  return {
    coreKhmerPercent: Math.round(coreKhmer * 100),
    internalDiasporaPercent: Math.round(internalDiaspora * 100),
    foreignDiasporaPercent: Math.round(foreignDiaspora * 100),
    americanInfluence: Math.round(americanInfluence * 100),
    romanInfluence: Math.round(romanInfluence * 100),
    frontierCharacter: Math.round(frontierWilderness * 100),
    urbanization: Math.round(urbanization * 100),
    connectedness: Math.round(connectedness * 100),
    originalCountry: countryData?.basic_info?.name || 'Khmer Empire',
    provinceName: province.name,
    provincePopulation: province.provincial_population,
  }
}

function buildSeatNamingContext(seatDetails, provinces, countryData) {
  // Create compact seat info with only necessary demographic data
  const seats = []

  for (const seat of seatDetails || []) {
    // Find the province for this seat's jurisdiction
    const province = provinces?.find((p) =>
      p.name === seat.jurisdiction ||
      p.counties?.some((c) => c.name === seat.jurisdiction)
    )

    const features = province?.features || {}
    const originIndex = features.imperial_origin_index || 0
    const foreignIndex = features.foreign_origin_index || 0

    seats.push({
      key: `${seat.party}_${seat.seatIndex}`,
      party: seat.party,
      idx: seat.seatIndex,
      place: seat.jurisdiction,
      core: Math.round(Math.max(0, 1 - originIndex - foreignIndex) * 100),
      am: Math.round((features.american_identity_index || 0) * 100),
      ro: Math.round((features.roman_identity_index || 0) * 100),
      fr: Math.round((features.frontier_index || 0) * 100),
      ur: Math.round((features.urbanization_index || 0) * 100),
      sup: Math.round(seat.supportMetric || 0),
    })
  }

  return seats
}

function representativeNamingUserPrompt({ seatDetails, provinces, countryData, scope = 'national' }) {
  const context = buildSeatNamingContext(seatDetails, provinces, countryData)

  // Compact province info - only what's needed for naming
  const provinceInfo = provinces?.map((p) => ({
    name: p.name,
    pop: p.provincial_population,
    region: p.group,
    coreKhmer: Math.round((1 - (p.features?.imperial_origin_index || 0) - (p.features?.foreign_origin_index || 0)) * 100),
    american: Math.round((p.features?.american_identity_index || 0) * 100),
    roman: Math.round((p.features?.roman_identity_index || 0) * 100),
    frontier: Math.round((p.features?.frontier_index || 0) * 100),
    urban: Math.round((p.features?.urbanization_index || 0) * 100),
  })) || []

  const promptParts = [
    'Generate personal names for elected representatives of the Khmer Empire.',
    '',
    'EMPIRE:',
    `- Country: ${countryData?.basic_info?.name || 'Khmer Empire'}`,
    `- Scope: ${scope}`,
    `- Provinces: ${provinces?.length || 0}`,
    `- Population: ${countryData?.population?.total?.toLocaleString() || 'Unknown'}`,
    '',
    'NAMING TRADITIONS:',
    '- Khmer names: Given name + surname (Sokha Prak, Bopha Chan)',
    '- Given names: Sokha, Sopheap, Vannak, Dara, Bopha, Srey, Chhaya, Rithy, Sopheap',
    '- Surnames: Prak, Chan, Sim, Kim, Lim, Oum, Nhem, Sun, Mao, Khun, San, Khem, Tep',
    '- Western names (for diaspora areas): David, John, Maria, Sarah, Marcus, Julia',
    '',
    'RULES BY DEMOGRAPHICS:',
    '- Core Khmer >70%: Traditional Khmer names (Sokha Prak)',
    '- American >20%: Western given + Khmer surname (David Kim)',
    '- Roman >15%: Latin given + Khmer surname (Marcus Sim)',
    '- Frontier >30%: Rugged, nature-connected names (Rithy Nhem)',
    '- Urban >70%: Modern, cosmopolitan acceptable (Maria Lim)',
    '- Mixed influences: Blend styles appropriately',
    '',
    'PROVINCES:',
    JSON.stringify(provinceInfo),
    '',
    'SEATS TO NAME:',
    JSON.stringify(context),
    '',
    'INSTRUCTIONS:',
    '1. Generate ONE unique name per seat',
    '2. Match name style to province demographics',
    '3. Higher support = more traditional/prestigious names',
    '4. Mix male/female names for balance',
    '',
    'OUTPUT: JSON object {"party_seatIndex": "Full Name"}',
    'Example: {"yellow_0": "Sokha Prak", "green_0": "David Kim", "red_0": "Marcus Lim"}',
    '',
    'Generate names:',
  ]

  return promptParts.join('\n')
}

export async function requestRepresentativeNames({
  seatDetails,
  provinces,
  countryData,
  scope = 'national',
  endpoint = import.meta.env.VITE_LMSTUDIO_ENDPOINT || DEFAULT_ENDPOINT,
  model = import.meta.env.VITE_LMSTUDIO_MODEL || DEFAULT_MODEL,
  onStatus,
} = {}) {
  emitLlmStatus(onStatus, {
    phase: 'preparing',
    progress: 0.1,
    message: 'Preparing representative naming brief.',
    detail: `Compiling ${seatDetails?.length || 0} seats with demographic context.`,
  })

  const messages = [
    { role: 'system', content: representativeNamingSystemPrompt() },
    { role: 'user', content: representativeNamingUserPrompt({ seatDetails, provinces, countryData, scope }) },
  ]

  emitLlmStatus(onStatus, {
    phase: 'connecting',
    progress: 0.25,
    message: 'Connecting to naming historian.',
    detail: 'Sending demographic data and seat jurisdictions.',
  })

  const content = await requestChatCompletion({
    endpoint,
    model,
    temperature: 0.7,
    max_tokens: REPRESENTATIVE_NAMING_TOKEN_BUDGET,
    messages,
    onStatus,
  })

  emitLlmStatus(onStatus, {
    phase: 'parsing',
    progress: 0.8,
    message: 'Parsing representative names.',
    detail: 'Extracting names from historian response.',
  })

  const parsed = extractJsonObject(stripThinkBlocks(content))

  emitLlmStatus(onStatus, {
    phase: 'complete',
    progress: 1,
    message: 'Representatives named.',
    detail: `Generated ${Object.keys(parsed || {}).length} representative names.`,
  })

  return parsed || {}
}

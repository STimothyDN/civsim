import { DEFAULT_VOLATILITY } from './constants/apportionmentRules'
import { PARTY_META } from './constants/parties'
import { RANDOM_TREND_TEMPLATES, generateTrendPackageFromSelections } from './trends/randomizeTrends'

const DEFAULT_ENDPOINT = 'http://localhost:1234/v1/chat/completions'
const DEFAULT_MODEL = 'qwen/qwen3.5-9b'
const MAX_TEMPLATE_DESCRIPTION = 220
const MAX_SCENARIO_NAME = 72
const MAX_SCENARIO_DESCRIPTION = 260
const CLIMATE_SUMMARY_TOKEN_BUDGETS = [2200, 4200]

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

function templateSummaries() {
  return RANDOM_TREND_TEMPLATES.map((template) => ({
    id: template.id,
    label: template.label,
    description: truncate(template.description),
    complexity: template.complexity,
    family: template.family,
    scope: template.scope,
    tags: template.tags,
    promptTags: template.narrative?.promptTags || [],
    hook: template.narrative?.hook || '',
  }))
}

function trendSummaries(trends = []) {
  return trends.map((trend) => {
    const magnitude = Number(trend?.magnitude)
    return {
      id: trend?.id,
      templateId: trend?.templateId,
      label: trend?.label,
      description: truncate(trend?.description),
      party: trend?.party,
      scope: trend?.scope,
      tags: trend?.tags,
      hook: trend?.narrative?.hook || '',
      reason: trend?.narrative?.reason || '',
      magnitude: Number.isFinite(magnitude) ? Number(magnitude.toFixed(3)) : null,
    }
  })
}

function provinceSummaries(data) {
  return (data?.provinces || []).slice(0, 15).map((province) => ({
    name: province.name || 'Unnamed province',
    group: province.group || 'Unassigned',
  }))
}

function appContext(data) {
  return {
    countryName: data?.country?.basic_info?.name || 'Untitled Civilization',
    stateReligion: data?.country?.state_religion || null,
    provinceGroups: data?.province_groups || [],
    majorProvinces: provinceSummaries(data),
  }
}

function climateContext(data) {
  return {
    countryName: data?.country?.basic_info?.name || 'Untitled Civilization',
    stateReligion: data?.country?.state_religion || null,
    provinceGroups: data?.province_groups || [],
  }
}

function plannerSystemPrompt() {
  return [
    'You are an election narrative planner for a fictional Civilization-style simulator.',
    'Pick existing trend templates that best express the user narrative.',
    'Return ONLY the final JSON object. Do not use markdown, no preamble, and no conversational filler.',
    'CRITICAL: Do not prompt the user for more information or ask for confirmation. Make all final decisions based on the context provided.',
    'Use 3 to 7 trend selections. Include at least one simple trend and at least one compound or storyline trend when possible.',
    'Use intensity from 0.15 to 1.0, where 0.5 is normal strength.',
    'Tune volatility only when the narrative implies chaos, stability, landslide, or local uncertainty.',
    'Do not invent template IDs. Use only IDs from TREND_TEMPLATES.',
  ].join(' ')
}

function plannerUserPrompt(narrative, data) {
  return JSON.stringify({
    task: 'Select trend templates and election jitter settings for this desired election narrative.',
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
    },
    USER_NARRATIVE: narrative,
    CURRENT_WORLD: appContext(data),
    TREND_TEMPLATES: templateSummaries(),
  })
}

function climateSummarySystemPrompt() {
  return [
    'You are naming an election climate for a fictional Civilization-style simulator.',
    'Return ONLY the final JSON object. No markdown, no preamble, and no conversational filler.',
    'CRITICAL: Provide the final scenario name and description immediately. Do not ask for more context or details.',
    'The application has already randomized the trend templates; do not add, remove, or alter trends.',
    'Write a short scenario name and a concise description that explains the combined political climate.',
    'Use grounded language based only on the supplied randomized trends and world context.',
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
    'TONE: Professional, authoritative, and analytically sharp—emulate the style of a high-end Western election night broadcast.',
    'TASK: Deliver a 5-paragraph script that prioritizes "hard data" while maintaining a sense of historical consequence.',
    'PROJECTIONS: Use the language of a decision desk (e.g., "We are projecting," "Too close to call," "Seismic shifts in the battlegrounds," "The path to power").',
    'DATA FIRST: Lead with the numbers. Seat counts, control shifts, and popular vote margins must be the foundation of the report.',
    'JOURNALISTIC ANALYSIS: Beyond the numbers, explain *why* these shifts are occurring based on the provided trends and demographics.',
    scope === 'national' ? 'Provide a comprehensive national breakdown: House control, the struggle for the Imperial center, and the emerging national mandate.' : '',
    scope === 'regional' ? `Focus on the regional mechanics of ${targetName}. Detail the local assembly shifts and how this region is influencing the national balance of power.` : '',
    scope === 'provincial' ? `Deliver a localized deep-dive for ${targetName}. Analyze the county-level data, the council control, and the specific local swings that defined the night.` : '',
    'Paragraph 1: The Lead. The top-line projection and the overall mood of the electorate.',
    'Paragraph 2: The Math. A disciplined breakdown of the seats, the control of the houses, and the popular vote margins.',
    'Paragraph 3-4: The Analysis. Identify specific battleground swings or surprising trend impacts. What specific demographic or regional shift changed the math?',
    'Paragraph 5: The Outlook. The political reality for the coming term and what this "new math" means for the Empire.',
    'Return ONLY the script. No markdown. No conversational filler.',
  ].filter(Boolean).join(' ')
}

function getSwings(current, baseline) {
  if (!current || !baseline) return {}
  return Object.fromEntries(
    Object.entries(current).map(([party, share]) => {
      const diff = share - (baseline[party] || 0)
      return [party, Number(diff.toFixed(4))]
    })
  )
}

function broadcastUserPrompt(results, baselineResults, scope = 'national', targetName = null) {
  const trends = trendSummaries(results.config?.trends || [])
  const parties = Object.values(PARTY_META).map(m => `${m.name} (${m.ideology})`).join('\n')
  
  const nationalSummary = `
    NATIONAL RESULTS:
    - Assembly Control: ${results.national.assembly.control.label} (${results.national.assembly.control.detail})
    - Council Control: ${results.national.prelates.control.label} (${results.national.prelates.control.detail})
    - National Population: ${results.national.population}
  `.trim()

  let localContext = ''

  if (scope === 'national') {
    const regionHighlights = Object.entries(results.regions).map(([name, r]) => {
      const swing = getSwings(r.assembly.vote_shares, baselineResults?.regions?.[name]?.assembly?.vote_shares)
      const topSwing = Object.entries(swing).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]
      return `- ${name}: Assembly ${r.assembly.control.label}. Major swing: ${topSwing ? `${topSwing[0]} ${topSwing[1] > 0 ? '+' : ''}${(topSwing[1] * 100).toFixed(2)}%` : 'None'}`
    }).join('\n')
    
    localContext = `REGIONAL OVERVIEW:\n${regionHighlights}`
  } else if (scope === 'regional') {
    const region = results.regions[targetName] || {}
    const baselineRegion = baselineResults?.regions?.[targetName] || {}
    const provinces = results.provinces
      .filter(p => p.group === targetName)
      .sort((a, b) => b.provincial_population - a.provincial_population)
      .map(p => `- ${p.name}: ${p.assembly.control.label}.`)
      .join('\n')

    localContext = `
      REGIONAL FOCUS: ${targetName}
      - Assembly: ${region.assembly.control.label}
      - Council: ${region.prelates.control.label}
      - Population: ${region.population}
      - Province Breakdown:
      ${provinces}
    `.trim()
  } else if (scope === 'provincial') {
    const province = results.provinces.find(p => p.name === targetName) || {}
    const counties = (province.counties || [])
      .sort((a, b) => b.county_population - a.county_population)
      .slice(0, 10)
      .map(c => `- ${c.name}: Top party is ${PARTY_META[Object.entries(c.vote_shares).sort((a, b) => b[1] - a[1])[0][0]].name}`)
      .join('\n')

    localContext = `
      PROVINCIAL FOCUS: ${targetName}
      - Assembly: ${province.assembly.control.label}
      - Council: ${province.prelates.control.label}
      - Population: ${province.provincial_population}
      - Major County Results:
      ${counties}
    `.trim()
  }

  return `
    ELECTION NEWSROOM DATA
    =======================
    SCOPE: ${(scope || 'national').toString().toUpperCase()}
    TARGET: ${targetName || 'NATIONAL'}

    PARTY PLATFORMS:
    ${parties}

    ACTIVE TRENDS/CLIMATE:
    ${trends.length ? trends.join('\n') : 'No major trends reported.'}

    ${nationalSummary}

    ${localContext}

    TASK: Write a 5-paragraph captivating news broadcast script based on the data above.
  `.trim()
}

function climateSummaryUserPrompt({ trends, seed, data }) {
  return JSON.stringify({
    task: 'Create a scenario name and description for this randomized election climate.',
    outputSchema: {
      scenarioName: 'short scenario name, 3 to 7 words',
      scenarioDescription: 'one sentence describing how the randomized trends combine into an election climate',
    },
    RANDOM_SEED: seed || null,
    CURRENT_WORLD: data ? climateContext(data) : null,
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

function sanitizeVolatility(volatility = {}) {
  return Object.fromEntries(
    Object.entries(DEFAULT_VOLATILITY).map(([level, fallback]) => {
      const value = Number(volatility?.[level])
      if (!Number.isFinite(value)) return [level, fallback]
      return [level, Math.max(0, Math.min(0.4, value))]
    })
  )
}

async function requestChatCompletion({
  endpoint,
  model,
  temperature,
  max_tokens,
  messages,
}) {
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens,
        messages,
      }),
    })
  } catch (netError) {
    throw new Error(`Could not connect to LM Studio at ${endpoint}. Ensure the server is running and "Enable CORS" is on.`)
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'No error body')
    throw new Error(`LM Studio error (${response.status}): ${errorBody}`)
  }

  const payload = await response.json()
  const choice = payload?.choices?.[0] || {}
  const content = chatContentToText(choice?.message?.content ?? choice?.text ?? '')

  if (!content.trim()) {
    if (choice.finish_reason === 'length') {
      throw new ModelOutputError('LM Studio used its output budget before returning response.', 'length')
    }
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
} = {}) {
  const content = await requestChatCompletion({
    endpoint,
    model,
    temperature: 0.35,
    max_tokens: 1600,
    messages: [
      { role: 'system', content: plannerSystemPrompt() },
      { role: 'user', content: plannerUserPrompt(narrative, data) },
    ],
  })
  const plan = extractJsonObject(content)
  const seed = seedFromPlan(plan, narrative)

  return {
    plan,
    packageDef: generateTrendPackageFromSelections({
      id: `${seed}-${Date.now().toString(36)}`,
      title: plan.title || 'Election Narrative',
      summary: plan.summary || '',
      seed,
      jitterSeed: `${seed}-jitter`,
      source: 'llm-narrative',
      selections: Array.isArray(plan.selections) ? plan.selections : [],
      volatility: sanitizeVolatility(plan.jitter?.volatility),
    }),
  }
}

export async function requestElectionClimateSummary({
  trends,
  seed,
  data,
  endpoint = import.meta.env.VITE_LMSTUDIO_ENDPOINT || DEFAULT_ENDPOINT,
  model = import.meta.env.VITE_LMSTUDIO_MODEL || DEFAULT_MODEL,
} = {}) {
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
      })

      return normalizeScenarioMetadata(extractJsonObject(content))
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
} = {}) {
  const content = await requestChatCompletion({
    endpoint,
    model,
    temperature: 0.8,
    max_tokens: 3000,
    messages: [
      { role: 'system', content: broadcastSystemPrompt(scope, targetName) },
      { role: 'user', content: broadcastUserPrompt(results, baselineResults, scope, targetName) },
    ],
  })

  return content
}

import { DEFAULT_VOLATILITY } from './constants/apportionmentRules'
import { RANDOM_TREND_TEMPLATES, generateTrendPackageFromSelections } from './trends/randomizeTrends'

const DEFAULT_ENDPOINT = 'http://localhost:1234/v1/chat/completions'
const DEFAULT_MODEL = 'google/gemma-4-e4b'
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
  return (data?.provinces || []).slice(0, 40).map((province) => ({
    name: province.name || 'Unnamed province',
    group: province.group || 'Unassigned',
    isNationalCapital: !!province.is_national_capital,
    isRegionalCapital: !!province.is_regional_capital,
    isConquered: !!province.is_conquered,
    loyalty: province.loyalty ?? null,
    population: province.population ?? null,
    countyCount: Array.isArray(province.counties) ? province.counties.length : 0,
  }))
}

function appContext(data) {
  return {
    countryName: data?.country?.basic_info?.name || 'Untitled Civilization',
    stateReligion: data?.country?.state_religion || null,
    provinceGroups: data?.province_groups || [],
    globalReligions: data?.global_religions || [],
    provinces: provinceSummaries(data),
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
    'Return JSON only. Do not use markdown.',
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
    'The application has already randomized the trend templates; do not add, remove, or alter trends.',
    'Return JSON only. Do not use markdown or explanatory text.',
    'Do not think out loud. Start immediately with { and end with }.',
    'Write a short scenario name and a concise description that explains the combined political climate.',
    'Use grounded language based only on the supplied randomized trends and world context.',
  ].join(' ')
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

  try {
    return JSON.parse(text)
  } catch (error) {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) throw error
    return JSON.parse(text.slice(start, end + 1))
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
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens,
      messages,
    }),
  })

  if (!response.ok) {
    throw new Error(`LM Studio request failed with ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()
  const choice = payload?.choices?.[0] || {}
  const content = chatContentToText(choice?.message?.content ?? choice?.text ?? '')

  if (!content.trim()) {
    if (choice.finish_reason === 'length') {
      throw new ModelOutputError('LM Studio used its output budget before returning scenario JSON.', 'length')
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

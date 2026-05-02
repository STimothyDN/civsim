import { createSeededRng, randomFloat, randomInt, shortId } from '../randomness/seededRandom'
import { RANDOM_TREND_TEMPLATES, COMPOUND, SIMPLE, STORYLINE } from './templates'

export { RANDOM_TREND_TEMPLATES }

function templateWeight(template) {
  return Number.isFinite(Number(template.selectionWeight)) ? Number(template.selectionWeight) : 1
}

function weightedPick(rng, items) {
  const totalWeight = items.reduce((sum, item) => sum + templateWeight(item), 0)
  let threshold = randomFloat(rng, 0, totalWeight)

  for (const item of items) {
    threshold -= templateWeight(item)
    if (threshold <= 0) return item
  }

  return items[items.length - 1]
}

function removeSelected(pool, selected) {
  const index = pool.indexOf(selected)
  if (index >= 0) pool.splice(index, 1)
}

function selectTrendTemplates(rng, templates, count) {
  const pool = [...templates]
  const selected = []

  function pickWhere(predicate) {
    const candidates = pool.filter(predicate)
    if (!candidates.length) return null
    const picked = weightedPick(rng, candidates)
    selected.push(picked)
    removeSelected(pool, picked)
    return picked
  }

  if (count >= 2) pickWhere((template) => template.complexity === SIMPLE)
  if (count >= 3) pickWhere((template) => template.complexity === COMPOUND || template.complexity === STORYLINE)

  while (selected.length < count && pool.length) {
    const picked = weightedPick(rng, pool)
    selected.push(picked)
    removeSelected(pool, picked)
  }

  return selected
}

function resolveEffectMagnitude(effect, baseMagnitude, rng) {
  if (effect.magnitude !== undefined) return effect.magnitude
  if (Array.isArray(effect.magnitudeRange)) {
    return randomFloat(rng, effect.magnitudeRange[0], effect.magnitudeRange[1])
  }

  const factor = Number.isFinite(Number(effect.magnitudeFactor)) ? Number(effect.magnitudeFactor) : 1
  const jitter = Array.isArray(effect.jitterRange)
    ? randomFloat(rng, effect.jitterRange[0], effect.jitterRange[1])
    : 1
  return baseMagnitude * factor * jitter
}

function materializeEffects(template, baseMagnitude, rng) {
  const sourceEffects = Array.isArray(template.effects) && template.effects.length
    ? template.effects
    : [{ level: template.level, party: template.party, selector: template.selector }]

  return sourceEffects.map((effect, index) => ({
    ...effect,
    id: effect.id || `${template.id}-effect-${index}`,
    level: effect.level || template.level,
    party: effect.party || template.party,
    selector: effect.selector || template.selector || {},
    magnitude: resolveEffectMagnitude(effect, baseMagnitude, rng),
  }))
}

export function generateRandomTrendPackage({ seed, minTrends = 4, maxTrends = 8, templates = RANDOM_TREND_TEMPLATES } = {}) {
  const rng = createSeededRng(seed || 'random-election')
  const count = randomInt(rng, minTrends, maxTrends)
  const selectedTemplates = selectTrendTemplates(rng, templates, count)

  return selectedTemplates.map((template) => {
    const [minMagnitude, maxMagnitude] = template.magnitudeRange
    const magnitude = randomFloat(rng, minMagnitude, maxMagnitude)
    const effects = materializeEffects(template, magnitude, rng)
    const primaryEffect = effects.find((effect) => effect.mode !== 'suppress') || effects[0]

    return {
      id: `${template.id}-${shortId(rng)}`,
      templateId: template.id,
      label: template.label,
      description: template.description || '',
      complexity: template.complexity || SIMPLE,
      family: template.family || 'general',
      scope: template.scope || [template.level],
      tags: template.tags || [],
      narrative: template.narrative || null,
      level: primaryEffect.level,
      party: primaryEffect.party,
      selector: primaryEffect.selector || {},
      magnitude,
      effects,
      interactions: template.interactions || [],
      source: 'random',
    }
  })
}

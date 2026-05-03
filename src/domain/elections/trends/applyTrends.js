import { trendEffect } from './matchTrend'
import { normalRandom } from '../randomness/seededRandom'

const TREND_MULTIPLIER_MEAN = 9
const TREND_MULTIPLIER_STD = 2.25
const TREND_MULTIPLIER_MIN = 1.5
const TREND_MULTIPLIER_MAX = 15

function trendMultiplier(unit, party) {
  const seed = `trend-multiplier:${unit?.id ?? unit?.name ?? 'unit'}:${party}`
  const z = normalRandom(seed)
  const raw = TREND_MULTIPLIER_MEAN + z * TREND_MULTIPLIER_STD
  return Math.max(TREND_MULTIPLIER_MIN, Math.min(TREND_MULTIPLIER_MAX, raw))
}

export function applyTrends(scores, unit, level, trends = []) {
  return Object.fromEntries(
    Object.entries(scores).map(([party, score]) => [
      party,
      score * Math.exp(trendEffect(unit, party, level, trends) * trendMultiplier(unit, party)),
    ])
  )
}


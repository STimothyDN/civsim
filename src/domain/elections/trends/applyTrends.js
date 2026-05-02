import { trendEffect } from './matchTrend'

export function applyTrends(scores, unit, level, trends = []) {
  return Object.fromEntries(
    Object.entries(scores).map(([party, score]) => [
      party,
      score * Math.exp(trendEffect(unit, party, level, trends)),
    ])
  )
}


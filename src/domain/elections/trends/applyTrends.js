import { trendEffect } from './matchTrend'

export function applyTrends(scores, unit, level, trends = []) {
  return Object.fromEntries(
    Object.entries(scores).map(([party, score]) => [
      party,
      // Trend effect DOUBLED AGAIN for seismic shifts (6 -> 12)
      // Total 4x increase from original (3 -> 12)
      score * Math.exp(trendEffect(unit, party, level, trends) * 12),
    ])
  )
}


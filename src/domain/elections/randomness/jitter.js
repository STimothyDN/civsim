import { DEFAULT_VOLATILITY } from '../constants/apportionmentRules'
import { clamp, num } from '../normalization/numbers'
import { normalRandom } from './seededRandom'

export function jitterForParty({ jitterSeed = 'baseline', level, unitId, party, volatility = DEFAULT_VOLATILITY }) {
  const levelVolatility = num(volatility?.[level], DEFAULT_VOLATILITY[level] ?? 0.05)
  const raw = normalRandom(`${jitterSeed}:${level}:${unitId}:${party}`) * levelVolatility
  return clamp(raw, -3 * levelVolatility, 3 * levelVolatility)
}

export function applyJitter(scores, contextMap, electionConfig = {}) {
  return Object.fromEntries(
    Object.entries(scores).map(([party, score]) => {
      let totalJitter = 0
      for (const [level, unitId] of Object.entries(contextMap)) {
        if (unitId != null) {
          totalJitter += jitterForParty({
            jitterSeed: electionConfig.jitterSeed,
            level,
            unitId,
            party,
            volatility: electionConfig.volatility,
          })
        }
      }
      return [
        party,
        score * Math.exp(totalJitter)
      ]
    })
  )
}


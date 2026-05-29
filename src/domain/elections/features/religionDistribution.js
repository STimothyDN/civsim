import { clamp01, num } from '../normalization/numbers'
import { calcScaledFollowers } from '../../../utils/calculatedFields'

const LISTED_RELIGION_FOLLOWER_FLOOR = 0.25
const SPREAD_RATE = 0.0015

function scaledFollowerForListing(religion, provinceIndex, calculations) {
  const raw = num(religion?.followers)
  const rawWithFloor = raw > 0 ? raw : LISTED_RELIGION_FOLLOWER_FLOOR
  return calcScaledFollowers(rawWithFloor, provinceIndex, calculations)
}

export function buildScaledFollowerMap(province, provinceIndex, calculations) {
  if (!Array.isArray(province?.religions)) return {}
  return province.religions.reduce((acc, religion) => {
    const name = String(religion?.name || '').trim()
    if (!name) return acc
    acc[name] = num(acc[name]) + scaledFollowerForListing(religion, provinceIndex, calculations)
    return acc
  }, {})
}

/**
 * Aggregate scaled followers per religion across the empire. Pass `data` from
 * the form store (must contain `provinces` with `religions` and `population`).
 * Returns a plain `{ religionName: totalScaledFollowers }` map.
 */
export function buildEmpireReligionTotals(data, calculations) {
  const provinces = Array.isArray(data?.provinces) ? data.provinces : []
  const totals = {}
  provinces.forEach((province, index) => {
    const followersByReligion = buildScaledFollowerMap(province, index, calculations)
    for (const [name, scaled] of Object.entries(followersByReligion)) {
      totals[name] = num(totals[name]) + scaled
    }
  })
  return totals
}

/**
 * Provincial receptiveness to "imported" followers. Mirrors the diaspora
 * factor pattern used by white/purple parties — religions diffuse along the
 * same axes (trade, urbanization, faith yield, foreignness).
 *
 * Inputs are normalized 0..1 indices already computed elsewhere in the
 * province feature pass. Caller passes them in directly so this module stays
 * decoupled from feature-build order.
 */
export function provinceReligionAffinity({
  connectednessIndex = 0,
  faithIndex = 0,
  foreignOriginIndex = 0,
} = {}) {
  return clamp01(
    0.45 * num(connectednessIndex) +
    0.30 * num(faithIndex) +
    0.25 * num(foreignOriginIndex)
  )
}

/**
 * Add an empire-wide ambient floor for every religion that exists somewhere
 * in the empire. Listed followers stay dominant — globalization only matters
 * where the religion is otherwise absent. Mutates and returns the map.
 */
export function applyReligionGlobalization(followersByReligion, empireTotals, affinity) {
  const aff = clamp01(affinity)
  if (!empireTotals || aff <= 0) return followersByReligion
  for (const [name, total] of Object.entries(empireTotals)) {
    const ambient = SPREAD_RATE * num(total) * aff
    if (ambient <= 0) continue
    followersByReligion[name] = num(followersByReligion[name]) + ambient
  }
  return followersByReligion
}

export const RELIGION_DISTRIBUTION_CONSTANTS = Object.freeze({
  LISTED_RELIGION_FOLLOWER_FLOOR,
  SPREAD_RATE,
})

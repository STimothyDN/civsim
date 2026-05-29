import { PARTIES } from '../constants/parties'
import { num } from '../normalization/numbers'

/**
 * Convert raw party scores to vote shares (summing to 1). When `parties` is
 * omitted the party set is derived from the input keys, so arbitrary,
 * user-defined party sets flow through without threading an explicit list.
 */
export function scoresToVoteShares(scores, parties) {
  const list = parties || Object.keys(scores || {})
  const safeScores = Object.fromEntries(
    list.map((party) => [party, Math.max(num(scores?.[party]), 0.0001)])
  )
  const total = Object.values(safeScores).reduce((sum, value) => sum + value, 0)

  return Object.fromEntries(
    list.map((party) => [party, total ? safeScores[party] / total : 1 / (list.length || 1)])
  )
}

export function emptyPartyMap(value = 0, parties = PARTIES) {
  return Object.fromEntries(parties.map((party) => [party, value]))
}

function unionPartyKeys(maps) {
  const set = new Set()
  maps.forEach((map) => Object.keys(map || {}).forEach((key) => set.add(key)))
  return [...set]
}

export function sumPartyMaps(maps, parties) {
  const list = parties || unionPartyKeys(maps)
  const result = emptyPartyMap(0, list)
  maps.forEach((map) => {
    list.forEach((party) => {
      result[party] += num(map?.[party])
    })
  })
  return result
}

export function weightedVoteShares(items, weightForItem, sharesForItem, parties) {
  const list = parties || (items.length ? Object.keys(sharesForItem(items[0]) || {}) : PARTIES)
  const totals = emptyPartyMap(0, list)
  let totalWeight = 0

  items.forEach((item) => {
    const weight = Math.max(0, num(weightForItem(item)))
    totalWeight += weight
    list.forEach((party) => {
      totals[party] += num(sharesForItem(item)?.[party]) * weight
    })
  })

  if (totalWeight <= 0) {
    return scoresToVoteShares(totals, list)
  }

  return Object.fromEntries(list.map((party) => [party, totals[party] / totalWeight]))
}

import { PARTIES } from '../constants/parties'
import { num } from '../normalization/numbers'

export function scoresToVoteShares(scores, parties = PARTIES) {
  const safeScores = Object.fromEntries(
    parties.map((party) => [party, Math.max(num(scores?.[party]), 0.0001)])
  )
  const total = Object.values(safeScores).reduce((sum, value) => sum + value, 0)

  return Object.fromEntries(
    parties.map((party) => [party, total ? safeScores[party] / total : 1 / parties.length])
  )
}

export function emptyPartyMap(value = 0, parties = PARTIES) {
  return Object.fromEntries(parties.map((party) => [party, value]))
}

export function sumPartyMaps(maps, parties = PARTIES) {
  const result = emptyPartyMap(0, parties)
  maps.forEach((map) => {
    parties.forEach((party) => {
      result[party] += num(map?.[party])
    })
  })
  return result
}

export function weightedVoteShares(items, weightForItem, sharesForItem, parties = PARTIES) {
  const totals = emptyPartyMap(0, parties)
  let totalWeight = 0

  items.forEach((item) => {
    const weight = Math.max(0, num(weightForItem(item)))
    totalWeight += weight
    parties.forEach((party) => {
      totals[party] += num(sharesForItem(item)?.[party]) * weight
    })
  })

  if (totalWeight <= 0) {
    const fallbackShares = scoresToVoteShares(totals, parties)
    return fallbackShares
  }

  return Object.fromEntries(parties.map((party) => [party, totals[party] / totalWeight]))
}


import { calculateProvincePartyScores } from './provinceScores'
import { scoresToVoteShares } from './normalizeScores'
import { num } from '../normalization/numbers'

const MAX_NEIGHBORS = 5
const MAX_PULL_WEIGHT = 0.18
const DISTANCE_SCALE = 12
const LARGE_PROVINCE_RESISTANCE_SCALE = 80
const SMALL_PROVINCE_AMPLIFY_SCALE = 20

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

function neighborInfluenceWeight(neighbor, targetPopulation) {
  const distance = num(neighbor.distance)
  if (!distance || distance <= 0) return 0

  const neighborPop = Math.max(1, num(neighbor.provincial_population))
  const targetPop = Math.max(1, targetPopulation)

  const distanceWeight = 1 / (1 + distance / DISTANCE_SCALE)
  const sizeRatio = neighborPop / targetPop

  const largeOnSmall = clamp01(sizeRatio / LARGE_PROVINCE_RESISTANCE_SCALE)
  const smallOnLarge = clamp01(1 / (sizeRatio * SMALL_PROVINCE_AMPLIFY_SCALE))
  const directionWeight = sizeRatio >= 1 ? largeOnSmall : smallOnLarge * 0.4

  return distanceWeight * directionWeight
}

export function applyNeighborInfluence(rawScores, province) {
  const adjacent = Array.isArray(province.adjacent_provinces)
    ? province.adjacent_provinces.slice(0, MAX_NEIGHBORS)
    : []

  if (!adjacent.length) return rawScores

  const targetPop = Math.max(1, num(province.provincial_population))
  const parties = Object.keys(rawScores)

  let totalWeight = 0
  const pullScores = Object.fromEntries(parties.map((p) => [p, 0]))

  for (const neighbor of adjacent) {
    if (!neighbor.political_features) continue

    const weight = neighborInfluenceWeight(neighbor, targetPop)
    if (weight <= 0) continue

    const neighborScores = calculateProvincePartyScores(neighbor)
    const neighborShares = scoresToVoteShares(neighborScores)

    for (const party of parties) {
      pullScores[party] += weight * (neighborShares[party] ?? 0)
    }
    totalWeight += weight
  }

  if (totalWeight <= 0) return rawScores

  const normalizedPull = Object.fromEntries(
    parties.map((p) => [p, pullScores[p] / totalWeight])
  )

  const pullWeight = clamp01(totalWeight * MAX_PULL_WEIGHT)
  const selfWeight = 1 - pullWeight

  const selfShares = scoresToVoteShares(rawScores)
  const blended = Object.fromEntries(
    parties.map((p) => [p, selfWeight * selfShares[p] + pullWeight * normalizedPull[p]])
  )

  const total = Object.values(blended).reduce((s, v) => s + v, 0)
  const blendedShares = Object.fromEntries(
    parties.map((p) => [p, total ? blended[p] / total : 1 / parties.length])
  )

  return Object.fromEntries(
    parties.map((p) => [p, rawScores[p] * (blendedShares[p] / (selfShares[p] || 0.0001))])
  )
}

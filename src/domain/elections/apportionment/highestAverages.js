import { PARTIES } from '../constants/parties'
import { num } from '../normalization/numbers'

export function dhondtDivisor(currentSeats) {
  return currentSeats + 1
}

export function sainteLagueDivisor(currentSeats) {
  return 2 * currentSeats + 1
}

export function modifiedSainteLagueDivisor(currentSeats) {
  if (currentSeats === 0) return 1.4
  return 2 * currentSeats + 1
}

export function createEmptySeats(parties = PARTIES) {
  return Object.fromEntries(parties.map((party) => [party, 0]))
}

export function apportionHighestAverages(voteShares, seatCount, divisorFn, options = {}) {
  const parties = options.parties || Object.keys(voteShares || {}) || PARTIES
  const threshold = num(options.threshold)
  const rawScores = options.rawScores || {}
  const seats = createEmptySeats(parties)
  const totalSeats = Math.max(0, Math.round(num(seatCount)))
  const eligibleParties = parties.filter((party) => num(voteShares?.[party]) >= threshold)

  for (let i = 0; i < totalSeats; i += 1) {
    let bestParty = null
    let bestQuotient = -Infinity

    for (const party of eligibleParties) {
      const quotient = num(voteShares?.[party]) / divisorFn(seats[party])
      const bestShare = bestParty ? num(voteShares?.[bestParty]) : -Infinity
      const bestRaw = bestParty ? num(rawScores?.[bestParty]) : -Infinity
      const partyOrderWins = bestParty ? parties.indexOf(party) < parties.indexOf(bestParty) : true
      const isBetter =
        quotient > bestQuotient ||
        (quotient === bestQuotient && num(voteShares?.[party]) > bestShare) ||
        (quotient === bestQuotient && num(voteShares?.[party]) === bestShare && num(rawScores?.[party]) > bestRaw) ||
        (quotient === bestQuotient && num(voteShares?.[party]) === bestShare && num(rawScores?.[party]) === bestRaw && partyOrderWins)

      if (isBetter) {
        bestQuotient = quotient
        bestParty = party
      }
    }

    if (bestParty === null) break
    seats[bestParty] += 1
  }

  return seats
}

export function apportionDHondt(voteShares, seatCount, options = {}) {
  return apportionHighestAverages(voteShares, seatCount, dhondtDivisor, options)
}

export function apportionSainteLague(voteShares, seatCount, options = {}) {
  return apportionHighestAverages(voteShares, seatCount, sainteLagueDivisor, options)
}

export function apportionModifiedSainteLague(voteShares, seatCount, options = {}) {
  return apportionHighestAverages(voteShares, seatCount, modifiedSainteLagueDivisor, options)
}

/**
 * Largest-remainder (Hamilton) apportionment of a fixed seat total across a set
 * of keyed weights (e.g. distribute national lower-house seats across provinces
 * by population). Each key is first floored to `minSeats`; the remaining seats
 * are distributed by Hare quota with leftover seats going to the largest
 * fractional remainders. Ties break deterministically by original key order.
 *
 * If the total can't satisfy the per-key minimum it is raised to the minimum
 * feasible total (keys × minSeats) so the floor is always honored.
 *
 * @param {Object<string, number>} weights  key → weight (e.g. population)
 * @param {number} totalSeats               seats to distribute
 * @param {{ keys?: string[], minSeats?: number }} options
 * @returns {Object<string, number>}        key → seat count
 */
export function apportionLargestRemainder(weights, totalSeats, options = {}) {
  const keys = options.keys || Object.keys(weights || {})
  const minSeats = Math.max(0, Math.round(num(options.minSeats)))
  const seats = Object.fromEntries(keys.map((key) => [key, minSeats]))
  if (!keys.length) return seats

  let total = Math.max(0, Math.round(num(totalSeats)))
  if (total < keys.length * minSeats) total = keys.length * minSeats

  let remaining = total - keys.length * minSeats
  if (remaining <= 0) return seats

  const totalWeight = keys.reduce((sum, key) => sum + Math.max(0, num(weights[key])), 0)
  if (totalWeight <= 0) {
    for (let i = 0; remaining > 0; i += 1, remaining -= 1) seats[keys[i % keys.length]] += 1
    return seats
  }

  const quotas = keys.map((key, index) => {
    const exact = (Math.max(0, num(weights[key])) / totalWeight) * remaining
    const floorVal = Math.floor(exact)
    return { key, index, floorVal, remainder: exact - floorVal }
  })
  quotas.forEach((quota) => {
    seats[quota.key] += quota.floorVal
    remaining -= quota.floorVal
  })

  quotas.sort((a, b) => (b.remainder - a.remainder) || (a.index - b.index))
  for (let i = 0; i < quotas.length && remaining > 0; i += 1, remaining -= 1) {
    seats[quotas[i].key] += 1
  }

  return seats
}


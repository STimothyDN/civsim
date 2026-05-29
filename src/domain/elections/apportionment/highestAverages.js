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


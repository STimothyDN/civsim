import { PARTIES, PARTY_NAMES } from '../constants/parties'
import { num, sumObjectValues } from '../normalization/numbers'

export const NATURAL_PARTNERS = {
  yellow: ['red', 'blue', 'purple', 'orange', 'white'],
  orange: ['blue', 'red', 'white', 'yellow', 'purple'],
  red: ['yellow', 'purple', 'white', 'orange', 'blue'],
  blue: ['orange', 'yellow', 'purple', 'white', 'red'],
  white: ['blue', 'orange', 'red', 'yellow', 'purple'],
  purple: ['red', 'yellow', 'blue', 'white', 'orange'],
}

function trendClimateScore(party, trends = []) {
  return trends
    .filter((trend) => trend.party === party)
    .reduce((sum, trend) => sum + num(trend.magnitude), 0)
}

function dominantParty(seats = {}) {
  return [...PARTIES].sort((a, b) => {
    const seatDiff = num(seats[b]) - num(seats[a])
    return seatDiff || PARTIES.indexOf(a) - PARTIES.indexOf(b)
  })[0]
}

function coalitionPartnerScore(leaderParty, partnerParty, seats = {}, trends = []) {
  const naturalOrder = NATURAL_PARTNERS[leaderParty] || []
  const naturalRank = naturalOrder.indexOf(partnerParty)
  const naturalScore = naturalRank >= 0 ? (naturalOrder.length - naturalRank) / naturalOrder.length : 0
  const totalSeats = Math.max(1, sumObjectValues(seats))
  const seatScore = num(seats[partnerParty]) / totalSeats
  const climateScore = trendClimateScore(partnerParty, trends)

  return naturalScore * 1.35 + seatScore * 1.1 + climateScore * 0.8
}

export function determineHouseControl(seats = {}, trends = []) {
  const totalSeats = sumObjectValues(seats)
  const majority = Math.floor(totalSeats / 2) + 1
  const leaderParty = dominantParty(seats)
  const leaderSeats = num(seats[leaderParty])

  if (!totalSeats) {
    return {
      status: 'empty',
      leaderParty,
      supportParties: [],
      parties: [],
      seats: 0,
      majority: 0,
      label: 'No chamber',
      detail: 'No seats allocated',
    }
  }

  if (leaderSeats >= majority) {
    return {
      status: 'majority',
      leaderParty,
      supportParties: [],
      parties: [leaderParty],
      seats: leaderSeats,
      majority,
      label: `${PARTY_NAMES[leaderParty]} majority`,
      detail: `${leaderSeats} of ${totalSeats} seats`,
    }
  }

  const partners = PARTIES
    .filter((party) => party !== leaderParty && num(seats[party]) > 0)
    .sort((a, b) => {
      const scoreDiff = coalitionPartnerScore(leaderParty, b, seats, trends) - coalitionPartnerScore(leaderParty, a, seats, trends)
      return scoreDiff || num(seats[b]) - num(seats[a]) || PARTIES.indexOf(a) - PARTIES.indexOf(b)
    })

  const supportParties = []
  let coalitionSeats = leaderSeats
  for (const partner of partners) {
    if (coalitionSeats >= majority) break
    supportParties.push(partner)
    coalitionSeats += num(seats[partner])
  }

  if (coalitionSeats >= majority) {
    return {
      status: 'minority-government',
      leaderParty,
      supportParties,
      parties: [leaderParty, ...supportParties],
      seats: coalitionSeats,
      majority,
      label: `${PARTY_NAMES[leaderParty]} minority government`,
      detail: `${coalitionSeats} of ${totalSeats} seats with support from ${supportParties.map((party) => PARTY_NAMES[party]).join(', ')}`,
    }
  }

  return {
    status: 'no-control',
    leaderParty,
    supportParties,
    parties: [leaderParty, ...supportParties],
    seats: coalitionSeats,
    majority,
    label: 'No working majority',
    detail: `${coalitionSeats} of ${totalSeats} seats assembled`,
  }
}

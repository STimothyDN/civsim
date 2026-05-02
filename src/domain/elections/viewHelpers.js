import { PARTIES } from './constants/parties'
import { winnerControlStyle } from './chambers/controlStyles'

export function sumSeats(seats) {
  return Object.values(seats || {}).reduce((sum, value) => sum + Number(value || 0), 0)
}

export function topParty(values) {
  return [...PARTIES].sort((a, b) => Number(values?.[b] || 0) - Number(values?.[a] || 0))[0]
}

export function popularVoteCount(population, shares, party) {
  return Math.round(Number(population || 0) * Number(shares?.[party] || 0))
}

export function partyWinnerStyle(party) {
  return winnerControlStyle({ leaderParty: party })
}

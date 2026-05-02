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

export function partyWinnerStyle(party, partyMeta) {
  return winnerControlStyle({ leaderParty: party }, partyMeta)
}

export function orderRegionsByReference(regions = [], provinceGroups = []) {
  const orderMap = new Map((provinceGroups || []).map((group, index) => [group, index]))
  return [...regions].sort((a, b) => {
    const aOrder = orderMap.has(a.name) ? orderMap.get(a.name) : Number.POSITIVE_INFINITY
    const bOrder = orderMap.has(b.name) ? orderMap.get(b.name) : Number.POSITIVE_INFINITY
    return aOrder - bOrder || a.name.localeCompare(b.name)
  })
}

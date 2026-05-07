import { num } from '../normalization/numbers'
import { PARTIES } from '../constants/parties'

/**
 * Generates jurisdiction labels for council/prelates seats based on apportionment scope.
 *
 * Council seats have geographic responsibilities:
 * - National Council: Each seat represents a province (from national_prelate_delegation)
 * - Provincial Council (>20 counties): Each seat represents one county (winner-take-all)
 * - Provincial Council (≤20 counties): Seats apportioned by county population (modified Sainte-Laguë)
 * - Regional Council: Aggregated from provincial councils
 *
 * Assembly seats are proportional/at-large and don't have specific jurisdictions.
 *
 * @param {Object} params
 * @param {Object} params.seats - Party -> seat count mapping
 * @param {string} params.chamberType - 'assembly' | 'prelates'
 * @param {string} params.scope - 'national' | 'regional' | 'provincial'
 * @param {Array} params.provinces - All province results (for national/regional scope)
 * @param {Object} params.selectedProvince - Specific province (for provincial scope)
 * @param {string} params.selectedRegionName - Region name (for regional scope)
 * @returns {Array<string>|null} Jurisdiction label for each seat, or null if not applicable
 */
export function generateJurisdictionLabels({
  seats = {},
  chamberType,
  scope,
  provinces = [],
  selectedProvince = null,
  selectedRegionName = null,
}) {
  if (chamberType === 'assembly') {
    return generateAssemblyLabels({ scope, seats, provinces, selectedProvince, selectedRegionName })
  }

  if (chamberType === 'prelates') {
    return generateCouncilLabels({
      scope,
      seats,
      provinces,
      selectedProvince,
      selectedRegionName,
    })
  }

  return null
}

/**
 * Assembly seats are proportional/at-large.
 * Label each seat with the strongest vote share contributor for that party.
 */
function generateAssemblyLabels({ scope, seats, provinces = [], selectedProvince = null, selectedRegionName = null }) {
  switch (scope) {
    case 'national':
      return generateNationalAssemblyLabels(provinces, seats)
    case 'regional':
      return generateRegionalAssemblyLabels(provinces, selectedRegionName, seats)
    case 'provincial':
      return generateProvincialAssemblyLabels(selectedProvince, seats)
    default:
      return null
  }
}

/**
 * National Assembly: For each party's seats, find their strongest supporting provinces.
 * Label seats with provinces weighted by contribution to that party's national vote.
 */
function generateNationalAssemblyLabels(provinces, seats) {
  const seatAssignments = []

  // For each party, calculate their vote share in each province weighted by population
  for (const party of PARTIES) {
    const partySeatCount = num(seats[party])
    if (partySeatCount === 0) continue

    // Calculate province contributions to this party's national vote
    const provinceContributions = provinces.map((province) => {
      const voteShare = num(province.assembly?.vote_shares?.[party])
      const population = num(province.provincial_population)
      const contribution = voteShare * population
      return {
        province,
        contribution,
        voteShare,
      }
    }).sort((a, b) => b.contribution - a.contribution)

    // Distribute seats across provinces proportionally to their contribution
    const totalContribution = provinceContributions.reduce((sum, pc) => sum + pc.contribution, 0)

    if (totalContribution === 0) {
      // Fallback: just use province names in order
      for (let i = 0; i < partySeatCount; i++) {
        const provinceIndex = i % provinces.length
        seatAssignments.push({
          provinceName: provinces[provinceIndex]?.name || 'Unknown',
          party,
        })
      }
    } else {
      // Allocate seats proportionally by contribution
      let seatsAllocated = 0
      const provinceSeatAllocations = provinceContributions.map((pc) => ({
        ...pc,
        allocatedSeats: 0,
        targetSeats: Math.round((pc.contribution / totalContribution) * partySeatCount),
      }))

      // First pass: allocate target seats (capped)
      for (const psc of provinceSeatAllocations) {
        psc.allocatedSeats = Math.min(psc.targetSeats, partySeatCount - seatsAllocated)
        seatsAllocated += psc.allocatedSeats
      }

      // Second pass: distribute any remaining seats to strongest provinces
      let remainingIndex = 0
      while (seatsAllocated < partySeatCount) {
        const psc = provinceSeatAllocations[remainingIndex % provinceSeatAllocations.length]
        psc.allocatedSeats += 1
        seatsAllocated += 1
        remainingIndex += 1
      }

      // Create seat assignments
      for (const psc of provinceSeatAllocations) {
        for (let i = 0; i < psc.allocatedSeats; i++) {
          seatAssignments.push({
            provinceName: psc.province.name || 'Unknown',
            party,
          })
        }
      }
    }
  }

  return reorderAssignmentsByPartyGrouping(seatAssignments, seats)
}

/**
 * Regional Assembly: For each party's seats, find their strongest supporting provinces within the region.
 */
function generateRegionalAssemblyLabels(provinces, regionName, seats) {
  const regionProvinces = provinces.filter((p) => p.group === regionName)
  const seatAssignments = []

  for (const party of PARTIES) {
    const partySeatCount = num(seats[party])
    if (partySeatCount === 0) continue

    // Calculate province contributions within this region
    const provinceContributions = regionProvinces.map((province) => {
      const voteShare = num(province.assembly?.vote_shares?.[party])
      const population = num(province.provincial_population)
      return {
        province,
        contribution: voteShare * population,
        voteShare,
      }
    }).sort((a, b) => b.contribution - a.contribution)

    const totalContribution = provinceContributions.reduce((sum, pc) => sum + pc.contribution, 0)

    if (totalContribution === 0 || provinceContributions.length === 0) {
      for (let i = 0; i < partySeatCount; i++) {
        const provinceIndex = i % Math.max(1, regionProvinces.length)
        seatAssignments.push({
          provinceName: regionProvinces[provinceIndex]?.name || 'Unknown',
          party,
        })
      }
    } else {
      // Allocate proportionally
      let seatsAllocated = 0
      const provinceSeatAllocations = provinceContributions.map((pc) => ({
        ...pc,
        allocatedSeats: 0,
        targetSeats: Math.round((pc.contribution / totalContribution) * partySeatCount),
      }))

      for (const psc of provinceSeatAllocations) {
        psc.allocatedSeats = Math.min(psc.targetSeats, partySeatCount - seatsAllocated)
        seatsAllocated += psc.allocatedSeats
      }

      let remainingIndex = 0
      while (seatsAllocated < partySeatCount) {
        const psc = provinceSeatAllocations[remainingIndex % provinceSeatAllocations.length]
        psc.allocatedSeats += 1
        seatsAllocated += 1
        remainingIndex += 1
      }

      for (const psc of provinceSeatAllocations) {
        for (let i = 0; i < psc.allocatedSeats; i++) {
          seatAssignments.push({
            provinceName: psc.province.name || 'Unknown',
            party,
          })
        }
      }
    }
  }

  return reorderAssignmentsByPartyGrouping(seatAssignments, seats)
}

/**
 * Provincial Assembly: For each party's seats, find their strongest supporting counties.
 */
function generateProvincialAssemblyLabels(province, seats) {
  if (!province) return null

  const counties = province.counties || []
  const seatAssignments = []

  for (const party of PARTIES) {
    const partySeatCount = num(seats[party])
    if (partySeatCount === 0) continue

    // Calculate county contributions to this party's provincial vote
    const countyContributions = counties.map((county) => {
      const voteShare = num(county.vote_shares?.[party])
      const population = num(county.county_population)
      return {
        county,
        contribution: voteShare * population,
        voteShare,
      }
    }).sort((a, b) => b.contribution - a.contribution)

    const totalContribution = countyContributions.reduce((sum, cc) => sum + cc.contribution, 0)

    if (totalContribution === 0 || countyContributions.length === 0) {
      for (let i = 0; i < partySeatCount; i++) {
        const countyIndex = i % Math.max(1, counties.length)
        seatAssignments.push({
          countyName: counties[countyIndex]?.name || 'Unknown',
          party,
        })
      }
    } else {
      // Allocate proportionally
      let seatsAllocated = 0
      const countySeatAllocations = countyContributions.map((cc) => ({
        ...cc,
        allocatedSeats: 0,
        targetSeats: Math.round((cc.contribution / totalContribution) * partySeatCount),
      }))

      for (const csc of countySeatAllocations) {
        csc.allocatedSeats = Math.min(csc.targetSeats, partySeatCount - seatsAllocated)
        seatsAllocated += csc.allocatedSeats
      }

      let remainingIndex = 0
      while (seatsAllocated < partySeatCount) {
        const csc = countySeatAllocations[remainingIndex % countySeatAllocations.length]
        csc.allocatedSeats += 1
        seatsAllocated += 1
        remainingIndex += 1
      }

      for (const csc of countySeatAllocations) {
        for (let i = 0; i < csc.allocatedSeats; i++) {
          seatAssignments.push({
            countyName: csc.county.name || 'Unknown',
            party,
          })
        }
      }
    }
  }

  return reorderAssignmentsByPartyGrouping(seatAssignments, seats)
}

/**
 * Council seats have specific geographic responsibilities.
 */
function generateCouncilLabels({
  scope,
  seats,
  provinces,
  selectedProvince,
  selectedRegionName,
}) {
  switch (scope) {
    case 'national':
      return generateNationalCouncilLabels(provinces, seats)
    case 'regional':
      return generateRegionalCouncilLabels(provinces, selectedRegionName, seats)
    case 'provincial':
      return generateProvincialCouncilLabels(selectedProvince, seats)
    default:
      return null
  }
}

/**
 * National Council: Each seat represents a province.
 * We use national_prelate_delegation from each province to determine
 * how many seats each party gets from each province.
 */
function generateNationalCouncilLabels(provinces, seats) {
  // Build a flat list of [provinceName, party] for each national council seat
  const seatAssignments = []

  // Process provinces in a consistent order
  const sortedProvinces = [...provinces].sort((a, b) => {
    // National capitals first, then regional capitals, then alphabetical
    if (a.is_national_capital && !b.is_national_capital) return -1
    if (!a.is_national_capital && b.is_national_capital) return 1
    if (a.is_regional_capital && !b.is_regional_capital) return -1
    if (!a.is_regional_capital && b.is_regional_capital) return 1
    return (a.name || '').localeCompare(b.name || '')
  })

  for (const province of sortedProvinces) {
    const delegation = province.national_prelate_delegation || {}
    const provinceName = province.name || 'Unknown Province'

    // For each party, add their delegated seats from this province
    for (const party of PARTIES) {
      const partySeatsFromProvince = num(delegation[party])
      for (let i = 0; i < partySeatsFromProvince; i++) {
        seatAssignments.push({ provinceName, party })
      }
    }
  }

  // Now we need to reorder to match the party grouping in the visualization
  // The seats are ordered by party (coalition first, then by seat count)
  return reorderAssignmentsByPartyGrouping(seatAssignments, seats)
}

/**
 * Regional Council: Aggregated from provincial councils.
 * Each seat represents a province within the region.
 */
function generateRegionalCouncilLabels(provinces, regionName, seats) {
  // Filter to provinces in this region
  const regionProvinces = provinces
    .filter((p) => p.group === regionName)
    .sort((a, b) => {
      if (a.is_regional_capital && !b.is_regional_capital) return -1
      if (!a.is_regional_capital && b.is_regional_capital) return 1
      return (a.name || '').localeCompare(b.name || '')
    })

  const seatAssignments = []

  for (const province of regionProvinces) {
    const prelates = province.prelates || {}
    const provinceSeats = prelates.seats || {}
    const provinceName = province.name || 'Unknown Province'

    for (const party of PARTIES) {
      const count = num(provinceSeats[party])
      for (let i = 0; i < count; i++) {
        seatAssignments.push({ provinceName, party })
      }
    }
  }

  return reorderAssignmentsByPartyGrouping(seatAssignments, seats)
}

/**
 * Provincial Council: Seats represent counties.
 * - >20 counties: Winner-take-all per county
 * - ≤20 counties: Modified Sainte-Laguë (proportional but county-weighted)
 */
function generateProvincialCouncilLabels(province, seats) {
  if (!province) return null

  const counties = province.counties || []
  const provinceName = province.name || 'Unknown Province'

  if (counties.length === 0) return null

  // Determine if this uses county council (winner-take-all per county)
  const usesCountyCouncil = counties.length > 20

  const seatAssignments = []

  if (usesCountyCouncil) {
    // Each populated county gets exactly one seat
    const populatedCounties = counties
      .filter((c) => num(c.county_population) > 0)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

    for (const county of populatedCounties) {
      const countyWinner = findCountyWinner(county.vote_shares)
      seatAssignments.push({
        countyName: county.name || 'Unknown County',
        party: countyWinner,
      })
    }
  } else {
    // Modified Sainte-Laguë - seats are apportioned by county population
    // We assign responsibility to counties proportionally by population
    const sortedCounties = [...counties].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    )

    // Build list of county responsibilities based on population
    const countyResponsibilities = []
    for (const county of sortedCounties) {
      const pop = num(county.county_population)
      const responsibility = Math.max(1, Math.round(pop / 1000)) // Scale factor for representation
      for (let i = 0; i < responsibility; i++) {
        countyResponsibilities.push(county.name || 'Unknown County')
      }
    }

    // Now assign seats to counties round-robin based on party apportionment
    const totalSeats = Object.values(seats).reduce((sum, count) => sum + num(count), 0)

    // Create party-ordered seat list to match visualization
    const partyOrderedSeats = []
    for (const party of PARTIES) {
      const count = num(seats[party])
      for (let i = 0; i < count; i++) {
        partyOrderedSeats.push(party)
      }
    }

    // Assign counties round-robin from responsibilities list
    for (let i = 0; i < totalSeats; i++) {
      const countyIndex = i % countyResponsibilities.length
      seatAssignments.push({
        countyName: countyResponsibilities[countyIndex],
        party: partyOrderedSeats[i],
      })
    }
  }

  return reorderAssignmentsByPartyGrouping(seatAssignments, seats)
}

/**
 * Find the winning party in a county (for winner-take-all councils).
 */
function findCountyWinner(voteShares = {}) {
  let winner = null
  let maxShare = -Infinity

  for (const [party, share] of Object.entries(voteShares)) {
    if (num(share) > maxShare) {
      maxShare = num(share)
      winner = party
    }
  }

  return winner || PARTIES[0]
}

/**
 * Reorder seat assignments to match the party grouping used in visualization.
 * The ChamberComposition orders seats: coalition parties first, then by seat count.
 */
function reorderAssignmentsByPartyGrouping(assignments, seats) {
  // Group assignments by party
  const byParty = {}
  for (const party of PARTIES) {
    byParty[party] = []
  }

  for (const assignment of assignments) {
    const party = assignment.party
    if (byParty[party]) {
      byParty[party].push(assignment)
    }
  }

  // Reconstruct in the same party order used by generateSeatDetails:
  // seat-count descending, with PARTIES index as a stable tiebreaker.
  // This ensures labels[seatIndex] corresponds to the correct party at
  // that seatIndex, making jurisdiction lookups accurate.
  const orderedParties = PARTIES.filter((p) => num(seats[p]) > 0)
    .sort((a, b) => num(seats[b]) - num(seats[a]) || PARTIES.indexOf(a) - PARTIES.indexOf(b))

  const orderedLabels = []
  for (const party of orderedParties) {
    const count = num(seats[party])
    const partyAssignments = byParty[party] || []

    for (let i = 0; i < count; i++) {
      if (i < partyAssignments.length) {
        const assignment = partyAssignments[i]
        if (assignment.countyName) {
          orderedLabels.push(assignment.countyName)
        } else if (assignment.provinceName) {
          orderedLabels.push(assignment.provinceName)
        } else {
          orderedLabels.push('Unknown')
        }
      } else {
        orderedLabels.push('Unknown')
      }
    }
  }

  return orderedLabels.length > 0 ? orderedLabels : null
}

/**
 * Format a tooltip string for a seat.
 *
 * @param {string} partyName - Display name of the party
 * @param {string} jurisdiction - Jurisdiction label for the seat
 * @param {string} chamberType - 'assembly' | 'prelates'
 * @returns {string} Formatted tooltip
 */
export function formatSeatTooltip(partyName, jurisdiction, chamberType) {
  if (!jurisdiction) {
    return partyName
  }

  if (chamberType === 'prelates') {
    return `${partyName} — Responsible for: ${jurisdiction}`
  }

  // For assembly, show jurisdiction but indicate it's at-large
  return `${partyName} — ${jurisdiction}`
}

/**
 * Generates detailed seat information including jurisdiction and vote metrics.
 * Returns an array of seat objects ordered to match the visualization.
 *
 * @param {Object} params
 * @param {Object} params.seats - Party -> seat count mapping
 * @param {string} params.chamberType - 'assembly' | 'prelates'
 * @param {string} params.scope - 'national' | 'regional' | 'provincial'
 * @param {Array} params.provinces - All province results
 * @param {Object} params.selectedProvince - Specific province
 * @param {string} params.selectedRegionName - Region name
 * @returns {Array<Object>} Seat details with jurisdiction, voteShare, supportMetric per seat
 */
export function generateSeatDetails({
  seats = {},
  chamberType,
  scope,
  provinces = [],
  selectedProvince = null,
  selectedRegionName = null,
}) {
  const labels = generateJurisdictionLabels({
    seats,
    chamberType,
    scope,
    provinces,
    selectedProvince,
    selectedRegionName,
  })

  if (!labels) return []

  // Build ordered parties (same logic as ChamberComposition)
  const orderedParties = PARTIES.filter((p) => num(seats[p]) > 0)
    .sort((a, b) => num(seats[b]) - num(seats[a]) || PARTIES.indexOf(a) - PARTIES.indexOf(b))

  const seatDetails = []
  let seatIndex = 0

  for (const party of orderedParties) {
    const partySeatCount = num(seats[party])
    if (partySeatCount === 0) continue

    for (let i = 0; i < partySeatCount; i++) {
      const jurisdiction = labels[seatIndex]
      const { voteShare, supportMetric } = calculateSeatMetrics({
        party,
        jurisdiction,
        chamberType,
        scope,
        provinces,
        selectedProvince,
        selectedRegionName,
        seatIndex,
      })

      seatDetails.push({
        party,
        jurisdiction,
        voteShare,
        supportMetric,
        seatIndex,
        withinPartyIndex: i,
      })

      seatIndex += 1
    }
  }

  return seatDetails
}

/**
 * Calculate vote share and support metric for a specific seat.
 *
 * Support Metric (0-100 scale):
 * - 100 = Completely safe (unopposed or massive margin)
 * - 0 = Seat would change hands with smallest swing (redo with same parameters)
 *
 * For winner-take-all: Based on margin from runner-up
 * For proportional: Based on quotient margin from next party
 */
function calculateSeatMetrics({
  party,
  jurisdiction,
  chamberType,
  scope,
  provinces,
  selectedProvince,
  selectedRegionName,
  seatIndex,
}) {
  let voteShare = 0
  let supportMetric = 0
  let allVoteShares = {}

  if (chamberType === 'assembly') {
    // For assembly, get vote share from the jurisdiction that "supports" this seat
    const result = getAssemblyVoteShareWithAllParties(party, jurisdiction, scope, provinces, selectedProvince, selectedRegionName)
    voteShare = result.partyShare
    allVoteShares = result.allShares
  } else {
    // For council, get the vote share from the jurisdiction this seat represents
    const result = getCouncilVoteShareWithAllParties(party, jurisdiction, scope, provinces, selectedProvince, selectedRegionName)
    voteShare = result.partyShare
    allVoteShares = result.allShares
  }

  // Calculate support metric based on seat safety
  supportMetric = calculateSeatSafety(party, voteShare, allVoteShares, chamberType, scope, selectedProvince)

  // Add small deterministic jitter (-1.5 to +1.5) to break ties in ranking
  // Use a simple hash of party, jurisdiction, and seat index so each seat gets unique jitter
  const hash = (party?.charCodeAt(0) || 0) + (party?.charCodeAt(party.length - 1) || 0) + (jurisdiction?.length || 0) + seatIndex
  const seededJitter = ((hash % 100) / 100 - 0.5) * 3 // Range: -1.5 to +1.5
  supportMetric = Math.min(100, Math.max(0, supportMetric + seededJitter))

  return { voteShare, supportMetric }
}

/**
 * Calculate seat safety metric (0-100).
 * 100 = seat is completely safe
 * 0 = seat would flip on smallest swing
 * 
 * Re-normalized to spread values better across the range:
 * - Competitive races (small margins) get mid-range values
 * - Landslide victories get high values
 */
function calculateSeatSafety(party, partyShare, allShares, chamberType, scope, selectedProvince) {
  // Ensure partyShare is a valid number
  const safePartyShare = num(partyShare)
  if (safePartyShare <= 0 || !isFinite(safePartyShare)) return 0

  // Get runner-up vote share
  const runnerUpShare = getRunnerUpShare(party, allShares)
  const safeRunnerUp = num(runnerUpShare)

  // Unopposed = 100% safe
  if (safeRunnerUp <= 0 || !isFinite(safeRunnerUp)) return 100

  // For winner-take-all situations (county council with >20 counties)
  if (chamberType === 'prelates' && scope === 'provincial' && selectedProvince?.counties?.length > 20) {
    // Winner-take-all: use logarithmic curve for better distribution
    const margin = safePartyShare - safeRunnerUp
    if (margin <= 0 || !isFinite(margin)) return 0
    
    // Log scale: amplifies small margins, compresses large ones
    // Formula: 100 * log10(1 + margin * 20) / log10(5)
    const inputValue = 1 + margin * 20
    if (inputValue <= 0 || !isFinite(inputValue)) return 0
    
    const safety = 100 * Math.log10(inputValue) / Math.log10(5)
    return Math.min(100, Math.max(0, safety))
  }

  // For proportional systems
  const ratio = safePartyShare / safeRunnerUp
  if (ratio <= 0 || !isFinite(ratio)) return 0

  // Use logarithmic curve on the ratio
  // ratio 1.05 (51% vs 48.5%) → ~25% safety
  // ratio 1.15 (53% vs 46%) → ~50% safety
  // ratio 1.3 (57% vs 44%) → ~75% safety
  // ratio 2.0 (67% vs 33%) → ~100% safety
  const safety = 100 * Math.log10(ratio) / Math.log10(2)
  return Math.min(100, Math.max(0, safety))
}

function getRunnerUpShare(party, allShares) {
  let maxRunnerUp = 0
  for (const [p, share] of Object.entries(allShares)) {
    if (p !== party && share > maxRunnerUp) {
      maxRunnerUp = share
    }
  }
  return maxRunnerUp
}

function getAssemblyVoteShareWithAllParties(party, jurisdiction, scope, provinces, selectedProvince, selectedRegionName) {
  let allShares = {}
  let partyShare = 0

  switch (scope) {
    case 'national': {
      const province = provinces.find((p) => p.name === jurisdiction)
      allShares = province?.assembly?.vote_shares || {}
      partyShare = allShares[party] || 0
      break
    }
    case 'regional': {
      const province = provinces.find((p) => p.name === jurisdiction)
      // Only use if it's in the correct region
      if (province && province.group === selectedRegionName) {
        allShares = province?.assembly?.vote_shares || {}
        partyShare = allShares[party] || 0
      }
      break
    }
    case 'provincial': {
      if (!selectedProvince) break
      const county = selectedProvince.counties?.find((c) => c.name === jurisdiction)
      allShares = county?.vote_shares || {}
      partyShare = allShares[party] || 0
      break
    }
  }

  return { partyShare, allShares }
}

function getCouncilVoteShareWithAllParties(party, jurisdiction, scope, provinces, selectedProvince, selectedRegionName) {
  let allShares = {}
  let partyShare = 0

  switch (scope) {
    case 'national': {
      const province = provinces.find((p) => p.name === jurisdiction)
      allShares = province?.prelates?.vote_shares || province?.assembly?.vote_shares || {}
      partyShare = allShares[party] || 0
      break
    }
    case 'regional': {
      const province = provinces.find((p) => p.name === jurisdiction)
      // Only use if it's in the correct region
      if (province && province.group === selectedRegionName) {
        allShares = province?.prelates?.vote_shares || {}
        partyShare = allShares[party] || 0
      }
      break
    }
    case 'provincial': {
      if (!selectedProvince) break
      const county = selectedProvince.counties?.find((c) => c.name === jurisdiction)
      allShares = county?.vote_shares || {}
      partyShare = allShares[party] || 0
      break
    }
  }

  return { partyShare, allShares }
}

import { computed } from 'vue'

/**
 * Shared composable for computing chamber leader, control info, and support
 * leaders from seat detail arrays. Eliminates ~60 lines of duplicated
 * computed properties per chamber across the 4 election pages.
 *
 * @param {Object} options
 * @param {import('vue').Ref|import('vue').ComputedRef} options.control
 *   Reactive reference to the chamber's control object (e.g. `results.national.assembly.control`).
 * @param {import('vue').Ref|import('vue').ComputedRef} options.seatDetails
 *   Reactive reference to the array returned by `generateSeatDetails(...)`.
 * @param {Object} options.store - The formStore instance (for `partyMeta`).
 * @param {Object} options.electionStore - The electionStore instance (for representative names).
 * @param {number} [options.seatIndexOffset=0]
 *   Offset added to `seatIndex` when calling `electionStore.getRepresentativeName`.
 *   Each scope uses a different offset to avoid name collisions (0, 2500, 5000, etc.).
 * @param {import('vue').Ref|import('vue').ComputedRef} [options.seatCount]
 *   Reactive reference to the total seat count for the chamber (e.g. `results.national.assembly.seat_count`).
 */
export function useElectionLeaders({
  control,
  seatDetails,
  store,
  electionStore,
  seatIndexOffset = 0,
  seatCount = null,
}) {
  /** The top-ranked seat holder from the leader party. */
  const leader = computed(() => {
    const leaderParty = control.value?.leaderParty
    if (!leaderParty) return null
    const partySeats = seatDetails.value.filter((s) => s.party === leaderParty)
    if (partySeats.length === 0) return null
    return partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
  })

  /** Seat count and support-party breakdown for the governing party. */
  const controlInfo = computed(() => {
    const ctrl = control.value
    const leaderParty = ctrl?.leaderParty
    if (!leaderParty) return null

    const partySeats = seatDetails.value.filter((s) => s.party === leaderParty)
    const leaderPartySeatCount = partySeats.length
    const totalSeats = seatCount?.value ?? ctrl?.totalSeats ?? 0

    const supportParties = ctrl?.supportParties || []
    const supportInfo = supportParties.map((party) => {
      const seats = seatDetails.value.filter((s) => s.party === party).length
      return {
        party,
        name: store.partyMeta[party]?.abbreviation || party,
        color: store.partyMeta[party]?.color || '#d4a843',
        seatCount: seats,
      }
    })

    const totalGovernmentSeats =
      leaderPartySeatCount + supportInfo.reduce((sum, p) => sum + p.seatCount, 0)

    return {
      leaderPartySeatCount,
      supportInfo,
      totalGovernmentSeats,
      totalSeats,
      isMinority: supportParties.length > 0,
    }
  })

  /** Caucus leaders from support parties in a minority government. */
  const supportLeaders = computed(() => {
    const ctrl = control.value
    const leaderParty = ctrl?.leaderParty
    if (!leaderParty) return []

    const leaders = []
    const supportParties = ctrl?.supportParties || []
    supportParties.forEach((party) => {
      const partySeats = seatDetails.value.filter((s) => s.party === party)
      if (partySeats.length === 0) return
      const topSeat = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
      const name = electionStore.getRepresentativeName(party, topSeat.seatIndex + seatIndexOffset)
      leaders.push({
        party,
        name: name || store.partyMeta[party]?.abbreviation || party,
        title: 'Caucus Leader',
        jurisdiction: topSeat.jurisdiction,
      })
    })

    return leaders
  })

  return { leader, controlInfo, supportLeaders }
}

<template>
  <section class="efficiency-panel election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Representation</p>
        <h3>Seat Efficiency</h3>
      </div>
    </div>
    <div class="election-table-wrap">
      <table class="election-table">
        <thead>
          <tr>
            <th>Party</th>
            <th>Vote %</th>
            <th>Seat %</th>
            <th>Advantage</th>
            <th>Votes/Seat</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.party">
            <td><PartyBadge :party="row.party" short /></td>
            <td>{{ row.voteShareLabel }}</td>
            <td>{{ row.seatShareLabel }}</td>
            <td :class="row.advantageClass">{{ row.advantageLabel }}</td>
            <td>{{ row.votesPerSeat }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script>
import { computed } from 'vue'
import PartyBadge from './PartyBadge.vue'
import { PARTIES, formatShare } from '../../domain/elections'
import { formatCompactNumber } from '../../domain/formatting'

export default {
  name: 'SeatEfficiencyTable',
  components: { PartyBadge },
  props: {
    results: { type: Object, required: true },
    partyMeta: { type: Object, required: true },
  },
  setup(props) {
    const rows = computed(() => {
      const assembly = props.results.national.assembly
      const totalSeats = Math.max(1, assembly.seat_count)
      const pop = props.results.national.population

      return PARTIES
        .map((party) => {
          const voteShare = Number(assembly.vote_shares[party] || 0)
          const seats = assembly.seats[party] || 0
          const seatShare = seats / totalSeats
          const advantage = seatShare - voteShare
          const votes = Math.round(pop * voteShare)
          const vps = seats > 0 ? Math.round(votes / seats) : null

          return {
            party,
            voteShare,
            seatShare,
            seats,
            voteShareLabel: formatShare(voteShare),
            seatShareLabel: formatShare(seatShare),
            advantage,
            advantageLabel: `${advantage > 0 ? '+' : ''}${(advantage * 100).toFixed(1)}%`,
            advantageClass: advantage > 0.005 ? 'delta-positive' : advantage < -0.005 ? 'delta-negative' : 'delta-neutral',
            votesPerSeat: vps !== null ? formatCompactNumber(vps) : '-',
          }
        })
        .filter(r => r.seats > 0 || r.voteShare > 0.01)
        .sort((a, b) => b.seats - a.seats || b.voteShare - a.voteShare)
    })

    return { rows }
  },
}
</script>

<template>
  <div class="popular-vote-board">
    <div class="popular-vote-board-header">
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h3>{{ title }}</h3>
      </div>
      <div class="popular-vote-total">
        <span>Total popular vote</span>
        <strong>{{ formatCompactNumber(totalVotes) }}</strong>
      </div>
    </div>

    <div class="popular-vote-bars" role="img" :aria-label="`${title} popular vote shares`">
      <div
        v-for="row in sortedRows"
        :key="row.party"
        class="popular-vote-bar-row"
        :style="partyStyle(row.party)"
      >
        <div class="popular-vote-party">
          <PartyBadge :party="row.party" short />
          <span>{{ formatShare(row.voteShare) }}</span>
        </div>
        <div class="popular-vote-track">
          <i :style="{ width: `${barWidth(row)}%`, backgroundColor: partyColor(row.party) }"></i>
        </div>
        <strong>{{ formatNumber(row.voteCount) }}</strong>
      </div>
    </div>

    <div class="election-table-wrap">
      <table class="election-table election-table--popular">
        <thead>
          <tr>
            <th>Party</th>
            <th>Share</th>
            <th>Popular Vote</th>
            <th v-for="column in seatColumns" :key="column.key">{{ column.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in sortedRows" :key="`${row.party}-table`">
            <td><PartyBadge :party="row.party" /></td>
            <td>{{ formatShare(row.voteShare) }}</td>
            <td>{{ formatNumber(row.voteCount) }}</td>
            <td v-for="column in seatColumns" :key="`${row.party}-${column.key}`">
              {{ formatNumber(row[column.key]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { PARTIES, formatShare } from '../../domain/elections'
import { formatCompactNumber, formatNumber } from '../../domain/provinceVisualizations'
import { useFormStore } from '../../stores/formStore'
import PartyBadge from './PartyBadge.vue'

export default {
  name: 'PopularVoteBoard',
  components: { PartyBadge },
  props: {
    eyebrow: { type: String, default: 'Popular Vote' },
    title: { type: String, required: true },
    rows: { type: Array, default: () => [] },
    totalVotes: { type: Number, default: 0 },
    seatColumns: { type: Array, default: () => [] },
  },
  setup(props) {
    const store = useFormStore()
    const sortedRows = computed(() => [...props.rows].sort((a, b) => {
      return Number(b.voteCount || 0) - Number(a.voteCount || 0) || PARTIES.indexOf(a.party) - PARTIES.indexOf(b.party)
    }))
    const maxVote = computed(() => Math.max(1, ...sortedRows.value.map((row) => Number(row.voteCount || 0))))

    function partyColor(party) {
      return store.partyMeta[party]?.color || '#9b9a97'
    }

    function partyStyle(party) {
      const color = partyColor(party)
      return {
        '--vote-color': color,
        '--vote-bg': `${color}14`,
        '--vote-border': `${color}38`,
      }
    }

    function barWidth(row) {
      return Math.max(2, (Number(row.voteCount || 0) / maxVote.value) * 100)
    }

    return {
      barWidth,
      formatCompactNumber,
      formatNumber,
      formatShare,
      partyColor,
      partyStyle,
      sortedRows,
    }
  },
}
</script>

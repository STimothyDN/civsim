<template>
  <div v-if="county" class="baseline-cards-section">
    <div class="baseline-cards-heading">Baseline Vote Share</div>
    <BaselineVoteShareGrid :vote-shares="county.vote_shares" />

    <div class="baseline-cards-heading baseline-cards-heading--gap">Projected Prelate</div>
    <div class="baseline-leader-grid">
      <div
        v-if="winningParty"
        class="overview-hero-call winner-control-card baseline-leader-card"
        :style="prelateCardStyle"
      >
        <span>County Prelate</span>
        <strong>
          <template v-if="prelateName">Prelate {{ prelateName }}</template>
          <template v-else>{{ partyMeta[winningParty]?.name || winningParty }}</template>
        </strong>
        <small class="leader-line">
          {{ partyMeta[winningParty]?.abbreviation || winningParty }}
          · {{ formatShareValue(county.vote_shares?.[winningParty]) }} of county vote
        </small>
        <small class="leader-support-line">
          {{ usesCountyCouncil
            ? 'Wins this county’s seat outright (winner-take-all council).'
            : 'Top vote share — would win if this council used winner-take-all.' }}
        </small>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import BaselineVoteShareGrid from './BaselineVoteShareGrid.vue'
import { useElectionResults } from '../../composables/useElectionResults'
import { useElectionFormatters } from '../../composables/useElectionFormatters'
import { topParty, partyWinnerStyle } from '../../domain/elections/viewHelpers'
import { formatShare } from '../../domain/elections'
import { generateSeatDetails } from '../../domain/elections/chambers/jurisdictionLabels'
import { SEAT_OFFSETS } from '../../domain/elections/constants/seatOffsets'

export default {
  name: 'BaselineCountyCards',
  components: { BaselineVoteShareGrid },
  props: {
    provinceIndex: { type: Number, required: true },
    countyIndex: { type: Number, required: true },
  },
  setup(props) {
    const { baselineResults, store, electionStore, partyMeta } = useElectionResults()
    const { controlCardStyle } = useElectionFormatters(store)

    const province = computed(() =>
      baselineResults.value?.provinces?.find((p) => p.provinceIndex === props.provinceIndex) || null
    )
    const county = computed(() => province.value?.counties?.[props.countyIndex] || null)

    const winningParty = computed(() => {
      const shares = county.value?.vote_shares
      if (!shares) return null
      return topParty(shares)
    })

    const usesCountyCouncil = computed(() => (province.value?.counties?.length || 0) > 20)

    const prelateCardStyle = computed(() =>
      winningParty.value ? partyWinnerStyle(winningParty.value, partyMeta.value) : {}
    )

    const councilSeatDetails = computed(() =>
      generateSeatDetails({
        seats: province.value?.prelates?.seats,
        chamberType: 'prelates',
        scope: 'provincial',
        selectedProvince: province.value,
      })
    )

    const prelateSeat = computed(() => {
      if (!county.value || !winningParty.value) return null
      const matches = councilSeatDetails.value.filter(
        (seat) => seat.jurisdiction === county.value.name && seat.party === winningParty.value
      )
      if (matches.length === 0) return null
      return matches.sort((a, b) => b.supportMetric - a.supportMetric)[0]
    })

    const prelateName = computed(() => {
      const seat = prelateSeat.value
      if (!seat) return ''
      return (
        electionStore.getRepresentativeName(
          seat.party,
          seat.seatIndex + SEAT_OFFSETS.provincial.prelates
        ) || ''
      )
    })

    function formatShareValue(value) {
      const num = Number(value)
      if (!Number.isFinite(num)) return '—'
      return formatShare(num)
    }

    return {
      county,
      winningParty,
      usesCountyCouncil,
      prelateCardStyle,
      prelateName,
      partyMeta,
      controlCardStyle,
      formatShareValue,
    }
  },
}
</script>

<style scoped>
.baseline-cards-section {
  display: block;
  margin-top: 16px;
  margin-bottom: 28px;
  padding-top: 12px;
  padding-bottom: 20px;
  border-top: 1px dashed var(--border-subtle);
  border-bottom: 1px dashed var(--border-subtle);
}

.baseline-cards-heading {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.baseline-cards-heading--gap {
  margin-top: 16px;
}

.baseline-leader-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 8px;
}

.baseline-leader-card {
  padding: 12px 14px;
}
</style>

<template>
  <div v-if="province" class="baseline-cards-section">
    <div class="baseline-cards-heading">Baseline Vote Share</div>
    <BaselineVoteShareGrid :vote-shares="province.assembly?.vote_shares" />

    <div v-if="hasLeaders" class="baseline-cards-heading baseline-cards-heading--gap">Provincial Leadership</div>
    <div v-if="hasLeaders" class="baseline-leader-grid">
      <div
        v-if="governor"
        class="overview-hero-call winner-control-card baseline-leader-card"
        :style="controlCardStyle(province.assembly?.control)"
      >
        <span>Governor</span>
        <strong>{{ governorTitle }} {{ governorName }}</strong>
        <small class="leader-line">
          from {{ governor.jurisdiction || province.name }}
          ({{ partyMeta[governor.party]?.abbreviation || governor.party }})
        </small>
        <small v-if="governorSupportLeaders.length" class="leader-support-line">
          with support from
          <span v-html="formatListWithOxfordComma(governorSupportLeaders.map(formatSupportLeaderWithColor))"></span>
        </small>
      </div>
      <div
        v-if="chancellor"
        class="overview-hero-call winner-control-card baseline-leader-card"
        :style="controlCardStyle(province.prelates?.control)"
      >
        <span>Chancellor</span>
        <strong>{{ chancellorTitle }} {{ chancellorName }}</strong>
        <small class="leader-line">
          from {{ chancellor.jurisdiction || province.name }}
          ({{ partyMeta[chancellor.party]?.abbreviation || chancellor.party }})
        </small>
        <small v-if="chancellorSupportLeaders.length" class="leader-support-line">
          with support from
          <span v-html="formatListWithOxfordComma(chancellorSupportLeaders.map(formatSupportLeaderWithColor))"></span>
        </small>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import BaselineVoteShareGrid from './BaselineVoteShareGrid.vue'
import { useElectionResults } from '../../composables/useElectionResults'
import { useElectionLeaders } from '../../composables/useElectionLeaders'
import { useElectionFormatters } from '../../composables/useElectionFormatters'
import { generateSeatDetails } from '../../domain/elections/chambers/jurisdictionLabels'
import { SEAT_OFFSETS } from '../../domain/elections/constants/seatOffsets'
import { lowerHouseLeaderTitle, upperHouseLeaderTitle } from '../../domain/elections'

export default {
  name: 'BaselineProvinceCards',
  components: { BaselineVoteShareGrid },
  props: {
    provinceIndex: { type: Number, required: true },
  },
  setup(props) {
    const { baselineResults, store, electionStore, partyMeta } = useElectionResults()
    const {
      controlCardStyle,
      formatListWithOxfordComma,
      formatSupportLeaderWithColor,
    } = useElectionFormatters(store)

    const province = computed(() =>
      baselineResults.value?.provinces?.find((p) => p.provinceIndex === props.provinceIndex) || null
    )

    const assemblySeatDetails = computed(() =>
      generateSeatDetails({
        seats: province.value?.assembly?.seats,
        chamberType: 'assembly',
        scope: 'provincial',
        selectedProvince: province.value,
      })
    )
    const councilSeatDetails = computed(() =>
      generateSeatDetails({
        seats: province.value?.prelates?.seats,
        chamberType: 'prelates',
        scope: 'provincial',
        selectedProvince: province.value,
      })
    )

    const {
      leader: governor,
      supportLeaders: governorSupportLeaders,
    } = useElectionLeaders({
      control: computed(() => province.value?.assembly?.control),
      seatDetails: assemblySeatDetails,
      store,
      electionStore,
      seatIndexOffset: SEAT_OFFSETS.provincial.assembly,
      seatCount: computed(() => province.value?.assembly?.seat_count || 0),
    })

    const {
      leader: chancellor,
      supportLeaders: chancellorSupportLeaders,
    } = useElectionLeaders({
      control: computed(() => province.value?.prelates?.control),
      seatDetails: councilSeatDetails,
      store,
      electionStore,
      seatIndexOffset: SEAT_OFFSETS.provincial.prelates,
      seatCount: computed(() => province.value?.prelates?.seat_count || 0),
    })

    const governorTitle = lowerHouseLeaderTitle('provincial')
    const chancellorTitle = upperHouseLeaderTitle('provincial')

    const governorName = computed(() => {
      if (!governor.value) return ''
      return (
        electionStore.getRepresentativeName(
          governor.value.party,
          governor.value.seatIndex + SEAT_OFFSETS.provincial.assembly
        ) || ''
      )
    })

    const chancellorName = computed(() => {
      if (!chancellor.value) return ''
      return (
        electionStore.getRepresentativeName(
          chancellor.value.party,
          chancellor.value.seatIndex + SEAT_OFFSETS.provincial.prelates
        ) || ''
      )
    })

    const hasLeaders = computed(() => !!(governor.value || chancellor.value))

    return {
      province,
      governor,
      chancellor,
      governorTitle,
      chancellorTitle,
      governorName,
      chancellorName,
      governorSupportLeaders,
      chancellorSupportLeaders,
      hasLeaders,
      partyMeta,
      controlCardStyle,
      formatListWithOxfordComma,
      formatSupportLeaderWithColor,
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

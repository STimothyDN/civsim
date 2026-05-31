<template>
  <ElectionPageShell
    :icon="Vote"
    eyebrow="National Elections"
    :title="`National Returns Desk`"
    :subtitle="`${countryName} · ${formatCompactNumber(results?.national?.population || 0)} subjects · ${regionRows.length} regions`"
    scope="national"
  >
    <template #hero-calls>
      <div class="overview-hero-call winner-control-card" :style="controlCardStyle(results.national.assembly.control)">
        <span>Assembly Control</span>
        <strong>{{ results.national.assembly.control.label }}</strong>
        <small class="control-detail">{{ assemblyControlInfo?.leaderPartySeatCount }}/{{ assemblyControlInfo?.totalSeats || results.national.assembly.control.detail }} seats won</small>
        <small v-if="assemblyControlInfo?.isMinority" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(assemblyControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
        </small>
      </div>
      <div class="overview-hero-call winner-control-card" :style="controlCardStyle(results.national.prelates.control)">
        <span>Council Control</span>
        <strong>{{ results.national.prelates.control.label }}</strong>
        <small class="control-detail">{{ councilControlInfo?.leaderPartySeatCount }}/{{ councilControlInfo?.totalSeats || results.national.prelates.control.detail }} seats won</small>
        <small v-if="councilControlInfo?.isMinority" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(councilControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
        </small>
      </div>
      <div v-if="assemblyLeader" class="overview-hero-call winner-control-card" :style="controlCardStyle(results.national.assembly.control)">
        <span>Assembly Leader</span>
        <strong>
          {{ lowerHouseLeaderTitle('national') }} {{ electionStore.getRepresentativeName(assemblyLeader.party, assemblyLeader.seatIndex) || '' }}
          <IncumbencyBadge :party="assemblyLeader.party" :seat-index="assemblyLeader.seatIndex" />
        </strong>
        <small class="leader-line">from {{ assemblyLeader.jurisdiction }} ({{ partyMeta[assemblyLeader.party]?.abbreviation || assemblyLeader.party }})</small>
        <small v-if="assemblySupportLeaders?.length" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(assemblySupportLeaders.map(formatSupportLeaderWithColor))"></span>
        </small>
      </div>
      <div v-if="councilLeader" class="overview-hero-call winner-control-card" :style="controlCardStyle(results.national.prelates.control)">
        <span>Council Leader</span>
        <strong>
          {{ upperHouseLeaderTitle('national') }} {{ electionStore.getRepresentativeName(councilLeader.party, councilLeader.seatIndex + SEAT_OFFSETS.national.prelates) || '' }}
          <IncumbencyBadge :party="councilLeader.party" :seat-index="councilLeader.seatIndex + SEAT_OFFSETS.national.prelates" />
        </strong>
        <small class="leader-line">from {{ councilLeader.jurisdiction }} ({{ partyMeta[councilLeader.party]?.abbreviation || councilLeader.party }})</small>
        <small v-if="councilSupportLeaders?.length" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(councilSupportLeaders.map(formatSupportLeaderWithColor))"></span>
        </small>
      </div>
    </template>

    <ElectionTickerCard
      :request-id="tickerRequestId"
      :scope="tickerScope"
      :target-name="tickerTargetName"
      :ticker-key="tickerKey"
    />

    <section class="election-panel">
      <div class="election-panel-heading">
        <div>
          <p class="eyebrow">National Swing</p>
          <h3>Party Shifts from Baseline</h3>
        </div>
      </div>
      <PartySwingCards
        :current-shares="results.national.assembly.vote_shares"
        :baseline-shares="electionStore.electionNumber > 0 ? previousElectionResults.national.assembly.vote_shares : baselineResults.national.assembly.vote_shares"
      />
    </section>

    <div class="election-data-grid">
      <ChamberComposition
        :title="nationalLowerHouseName"
        eyebrow="Lower House"
        :seats="results.national.assembly.seats"
        :control="results.national.assembly.control"
        chamber-type="assembly"
        scope="national"
        :provinces="results.provinces"
        :jurisdiction-labels="nationalAssemblyJurisdictionLabels"
      />
      <ChamberComposition
        :title="nationalUpperHouseName"
        eyebrow="Upper House"
        :seats="results.national.prelates.seats"
        :control="results.national.prelates.control"
        chamber-type="prelates"
        scope="national"
        :provinces="results.provinces"
        :jurisdiction-labels="nationalCouncilJurisdictionLabels"
      />
    </div>

    <section class="election-panel">
      <PopularVoteBoard
        eyebrow="Party Results"
        title="National Vote And Seats"
        :rows="popularVoteRows"
        :total-votes="results.national.population"
        :seat-columns="nationalSeatColumns"
      />
    </section>

    <ProvinceCallBoard :provinces="results.provinces" :party-meta="partyMeta" />

    <VoteDecompositionPanel :results="results" :party-meta="partyMeta" />

    <div class="election-data-grid">
      <SeatEfficiencyTable :results="results" :party-meta="partyMeta" />
      <CoalitionArithmeticPanel :results="results" :party-meta="partyMeta" />
    </div>

    <div class="election-data-grid">
      <CaucusListCard
        title="Assembly Caucuses"
        eyebrow="Lower House Breakdown"
        :seats="results.national.assembly.seats"
        :control="results.national.assembly.control"
        chamber-type="assembly"
        scope="national"
        :provinces="results.provinces"
        :jurisdiction-labels="nationalAssemblyJurisdictionLabels"
      />
      <CaucusListCard
        title="Council Caucuses"
        eyebrow="Upper House Breakdown"
        :seats="results.national.prelates.seats"
        :control="results.national.prelates.control"
        chamber-type="prelates"
        scope="national"
        :provinces="results.provinces"
        :jurisdiction-labels="nationalCouncilJurisdictionLabels"
      />
    </div>

    <section class="election-panel">
      <div class="election-panel-heading">
        <div>
          <p class="eyebrow">National Detail</p>
          <h3>Vote, Seats, And Thresholds</h3>
        </div>
      </div>
      <div class="election-table-wrap">
        <table class="election-table">
          <thead>
            <tr>
              <th>Party</th>
              <th>Vote Share</th>
              <th>Vs Baseline</th>
              <th>Assembly Seats</th>
              <th>Council Seats</th>
              <th>Threshold</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in nationalDetailRows" :key="`national-detail-${row.party}`">
              <td><PartyBadge :party="row.party" /></td>
              <td>{{ formatShare(row.voteShare) }}</td>
              <td :class="deltaClass(row.voteDelta)">{{ formatSignedPct(row.voteDelta) }}</td>
              <td>{{ formatNumber(row.assemblySeats) }} <small :class="deltaClass(row.assemblyDelta)">({{ formatSignedNumber(row.assemblyDelta) }})</small></td>
              <td>{{ formatNumber(row.prelateSeats) }} <small :class="deltaClass(row.prelateDelta)">({{ formatSignedNumber(row.prelateDelta) }})</small></td>
              <td>
                <span class="threshold-chip" :class="{ 'threshold-chip--clear': row.clearedThreshold }">
                  {{ row.clearedThreshold ? 'Cleared' : 'Below' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="election-panel">
      <div class="election-panel-heading">
        <div>
          <p class="eyebrow">Council Sources</p>
          <h3>Prelate Delegation By Province</h3>
        </div>
      </div>
      <details class="election-details" :open="prelateDelegationRows.length <= 12">
        <summary>{{ prelateDelegationRows.length }} provinces contributing {{ formatNumber(results.national.prelates.seat_count) }} prelates</summary>
        <div class="election-table-wrap">
          <table class="election-table election-table--wide">
            <thead>
              <tr>
                <th>Province</th>
                <th>Region</th>
                <th>Total</th>
                <th v-for="party in parties" :key="`delegation-${party}`">{{ partyColumnLabel(party) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in prelateDelegationRows" :key="`delegation-${row.provinceIndex}`">
                <td>{{ row.name }}</td>
                <td>{{ row.group }}</td>
                <td>{{ formatNumber(row.total) }}</td>
                <td v-for="party in parties" :key="`${row.provinceIndex}-${party}`">{{ formatNumber(row.seats[party] || 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </section>

    <section class="election-panel national-diagnostics-panel">
      <div class="election-panel-heading">
        <div>
          <p class="eyebrow">Diagnostics</p>
          <h3>Thresholds And Apportionment</h3>
        </div>
      </div>
      <div class="diagnostics-grid">
        <article>
          <span>Vote Blend</span>
          <strong>{{ localBlendPct }} local / {{ climateBlendPct }} climate</strong>
          <small>National Assembly popular vote model</small>
        </article>
        <article>
          <span>Apportionment</span>
          <strong>{{ apportionmentLabel }}</strong>
          <small>National chamber formulas</small>
        </article>
        <article>
          <span>Assembly Threshold</span>
          <strong>{{ formatShare(nationalThreshold) }}</strong>
          <small>Minimum national vote share</small>
        </article>
      </div>
      <div v-if="warnings.length" class="election-diagnostics election-diagnostics--embedded">
        <TriangleAlert :size="16" />
        <div>
          <strong>Warnings</strong>
          <span>{{ warnings.join(' · ') }}</span>
        </div>
      </div>
      <div v-else class="election-diagnostics election-diagnostics--ok">
        <div>
          <strong>No diagnostics warnings</strong>
          <span>Seat totals and vote shares are internally consistent.</span>
        </div>
      </div>
    </section>
  </ElectionPageShell>
</template>

<script>
import { computed } from 'vue'
import { TriangleAlert, Vote } from 'lucide-vue-next'
import ElectionPageShell from '../components/elections/ElectionPageShell.vue'
import ChamberComposition from '../components/elections/ChamberComposition.vue'
import CaucusListCard from '../components/elections/CaucusListCard.vue'
import ElectionTickerCard from '../components/elections/ElectionTickerCard.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import IncumbencyBadge from '../components/elections/IncumbencyBadge.vue'
import PartySwingCards from '../components/elections/PartySwingCards.vue'
import PopularVoteBoard from '../components/elections/PopularVoteBoard.vue'
import ProvinceCallBoard from '../components/elections/ProvinceCallBoard.vue'
import VoteDecompositionPanel from '../components/elections/VoteDecompositionPanel.vue'
import SeatEfficiencyTable from '../components/elections/SeatEfficiencyTable.vue'
import CoalitionArithmeticPanel from '../components/elections/CoalitionArithmeticPanel.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useElectionLeaders } from '../composables/useElectionLeaders'
import { useElectionFormatters } from '../composables/useElectionFormatters'
import { useElectionTicker } from '../composables/useElectionTicker'
import { formatCompactNumber, formatNumber } from '../domain/formatting'
import { APPORTIONMENT, PARTIES, THRESHOLDS, formatShare } from '../domain/elections'
import { useChamberLabels } from '../composables/useChamberLabels'
import { SEAT_OFFSETS } from '../domain/elections/constants/seatOffsets'
import { generateJurisdictionLabels, generateSeatDetails } from '../domain/elections/chambers/jurisdictionLabels'
import { orderRegionsByReference, popularVoteCount, sumSeats } from '../domain/elections/viewHelpers'

export default {
  name: 'NationalElectionResults',
  components: {
    ChamberComposition,
    CaucusListCard,
    CoalitionArithmeticPanel,
    ElectionPageShell,
    ElectionTickerCard,
    PartyBadge,
    IncumbencyBadge,
    PartySwingCards,
    PopularVoteBoard,
    ProvinceCallBoard,
    SeatEfficiencyTable,
    TriangleAlert,
    VoteDecompositionPanel,
  },
  setup() {
    const { lowerHouseName, upperHouseName, lowerHouseLeaderTitle, upperHouseLeaderTitle } = useChamberLabels()
    const { baselineResults, previousElectionResults, electionStore, hasData, partyMeta, results, store } = useElectionResults()
    const {
      controlCardStyle,
      formatListWithOxfordComma,
      formatSupportLeaderWithColor,
      formatSupportPartyWithColor,
      partyStyle,
    } = useElectionFormatters(store)

    const countryName = computed(() => store.currentData?.country?.basic_info?.name || 'Unnamed Realm')
    const nationalLowerHouseName = lowerHouseName('national')
    const nationalUpperHouseName = upperHouseName('national')
    const regionOrder = computed(() => store.currentData?.province_groups || [])
    const regionRows = computed(() => orderRegionsByReference(Object.values(results.value.regions), regionOrder.value))

    const nationalAssemblyJurisdictionLabels = computed(() => generateJurisdictionLabels({
      seats: results.value.national.assembly.seats,
      chamberType: 'assembly',
      scope: 'national',
      provinces: results.value.provinces,
    }))
    const nationalCouncilJurisdictionLabels = computed(() => generateJurisdictionLabels({
      seats: results.value.national.prelates.seats,
      chamberType: 'prelates',
      scope: 'national',
      provinces: results.value.provinces,
    }))

    const nationalAssemblySeatDetails = computed(() => generateSeatDetails({
      seats: results.value.national.assembly.seats,
      chamberType: 'assembly',
      scope: 'national',
      provinces: results.value.provinces,
    }))
    const nationalCouncilSeatDetails = computed(() => generateSeatDetails({
      seats: results.value.national.prelates.seats,
      chamberType: 'prelates',
      scope: 'national',
      provinces: results.value.provinces,
    }))

    const {
      leader: assemblyLeader,
      controlInfo: assemblyControlInfo,
      supportLeaders: assemblySupportLeaders,
    } = useElectionLeaders({
      control: computed(() => results.value.national.assembly.control),
      seatDetails: nationalAssemblySeatDetails,
      store,
      electionStore,
      seatIndexOffset: SEAT_OFFSETS.national.assembly,
      seatCount: computed(() => results.value.national.assembly.seat_count),
    })

    const {
      leader: councilLeader,
      controlInfo: councilControlInfo,
      supportLeaders: councilSupportLeaders,
    } = useElectionLeaders({
      control: computed(() => results.value.national.prelates.control),
      seatDetails: nationalCouncilSeatDetails,
      store,
      electionStore,
      seatIndexOffset: SEAT_OFFSETS.national.prelates,
      seatCount: computed(() => results.value.national.prelates.seat_count),
    })

    const { showElectionTicker, tickerKey, tickerRequestId, tickerScope, tickerTargetName } =
      useElectionTicker({ results, defaultScope: 'national' })

    const nationalSeatColumns = [
      { key: 'assemblySeats', label: 'Assembly Seats' },
      { key: 'prelateSeats', label: 'Council Seats' },
    ]

    const popularVoteRows = computed(() => PARTIES.map((party) => ({
      party,
      voteShare: results.value.national.assembly.vote_shares[party],
      voteCount: popularVoteCount(results.value.national.population, results.value.national.assembly.vote_shares, party),
      assemblySeats: results.value.national.assembly.seats[party],
      prelateSeats: results.value.national.prelates.seats[party],
    })))

    const nationalDetailRows = computed(() => PARTIES.map((party) => {
      const voteShare = Number(results.value.national.assembly.vote_shares?.[party] || 0)
      const baselineVoteShare = Number(baselineResults.value.national.assembly.vote_shares?.[party] || 0)
      const assemblySeats = Number(results.value.national.assembly.seats?.[party] || 0)
      const baselineAssemblySeats = Number(baselineResults.value.national.assembly.seats?.[party] || 0)
      const prelateSeats = Number(results.value.national.prelates.seats?.[party] || 0)
      const baselinePrelateSeats = Number(baselineResults.value.national.prelates.seats?.[party] || 0)
      return {
        party,
        voteShare,
        voteDelta: voteShare - baselineVoteShare,
        assemblySeats,
        assemblyDelta: assemblySeats - baselineAssemblySeats,
        prelateSeats,
        prelateDelta: prelateSeats - baselinePrelateSeats,
        clearedThreshold: voteShare >= THRESHOLDS.nationalAssembly,
      }
    }).sort((a, b) => b.assemblySeats - a.assemblySeats || b.voteShare - a.voteShare))

    const prelateDelegationRows = computed(() => [...results.value.provinces].map((province) => ({
      provinceIndex: province.provinceIndex,
      name: province.name,
      group: province.group,
      seats: province.national_prelate_delegation || {},
      total: sumSeats(province.national_prelate_delegation || {}),
    })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)))

    const warnings = computed(() => results.value.diagnostics.warnings.slice(0, 5))
    const localBlendPct = computed(() => formatShare(results.value.national.assembly.vote_blend?.local_weight || 0))
    const climateBlendPct = computed(() => formatShare(results.value.national.assembly.vote_blend?.climate_weight || 0))
    const apportionmentLabel = computed(() => `${APPORTIONMENT.nationalAssembly} assembly / ${APPORTIONMENT.nationalPrelates} council`)
    const nationalThreshold = THRESHOLDS.nationalAssembly

    return {
      baselineResults,
      previousElectionResults,
      controlCardStyle,
      partyStyle,
      countryName,
      formatCompactNumber,
      formatNumber,
      formatShare,
      formatListWithOxfordComma,
      formatSupportLeaderWithColor,
      formatSupportPartyWithColor,
      formatSignedNumber: (value) => `${Number(value) > 0 ? '+' : ''}${formatNumber(value)}`,
      formatSignedPct: (value) => `${Number(value) > 0 ? '+' : ''}${(Number(value || 0) * 100).toFixed(1)}%`,
      hasData,
      apportionmentLabel,
      climateBlendPct,
      deltaClass: (value) => Number(value) > 0 ? 'delta-positive' : Number(value) < 0 ? 'delta-negative' : 'delta-neutral',
      localBlendPct,
      nationalDetailRows,
      nationalLowerHouseName,
      nationalUpperHouseName,
      nationalSeatColumns,
      nationalThreshold,
      SEAT_OFFSETS,
      partyMeta,
      parties: PARTIES,
      partyColumnLabel: (party) => partyMeta.value[party]?.abbreviation || partyMeta.value[party]?.colorLabel || party,
      popularVoteRows,
      prelateDelegationRows,
      regionRows,
      results,
      store,
      showElectionTicker,
      tickerKey,
      tickerRequestId,
      tickerScope,
      tickerTargetName,
      Vote,
      warnings,
      nationalAssemblyJurisdictionLabels,
      nationalCouncilJurisdictionLabels,
      assemblyLeader,
      councilLeader,
      assemblySupportLeaders,
      councilSupportLeaders,
      assemblyControlInfo,
      councilControlInfo,
      electionStore,
      lowerHouseLeaderTitle,
      upperHouseLeaderTitle,
    }
  },
}
</script>

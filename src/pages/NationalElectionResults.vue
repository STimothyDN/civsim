<template>
  <section class="election-page">
    <div v-if="!hasData" class="empty-workspace">
      <Vote :size="52" class="text-[var(--accent)]" />
      <div>
        <h2>No Election Data</h2>
        <p>Load or create a template to simulate national results.</p>
      </div>
      <button type="button" class="btn-primary" @click="store.loadDefault">
        <FilePlus2 :size="16" />
        New Template
      </button>
    </div>

    <template v-else>
      <header class="overview-hero election-decision-hero">
        <div class="election-decision-hero-main">
          <div class="election-page-icon-wrap"><Vote :size="26" /></div>
          <div>
            <p class="eyebrow">National Elections</p>
            <h2>National Decision Desk</h2>
            <p>{{ countryName }} · {{ formatCompactNumber(results.national.population) }} people · {{ regionRows.length }} regions</p>
            <div class="overview-hero-actions">
              <button type="button" class="btn-broadcast-start" @click="uiStore.openElectionBroadcastModal('national')">
                <Radio :size="16" />
                Start National Broadcast
              </button>
              <button type="button" class="btn-broadcast-start" @click="showElectionTicker('national')">
                <Radio :size="16" />
                Show Election Ticker
              </button>
            </div>
          </div>
        </div>
        <div class="overview-hero-calls">
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(results.national.assembly.control)">
            <span>Assembly Control</span>
            <strong>{{ results.national.assembly.control.label }}</strong>
            <small>{{ results.national.assembly.control.detail }}</small>
          </div>
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(results.national.prelates.control)">
            <span>Council Control</span>
            <strong>{{ results.national.prelates.control.label }}</strong>
            <small>{{ results.national.prelates.control.detail }}</small>
          </div>
        </div>
      </header>

      <ElectionTickerCard
        :request-id="tickerRequestId"
        :scope="tickerScope"
        :target-name="tickerTargetName"
        :ticker-key="tickerKey"
      />

      <ElectionScenarioControls
        :current-shares="results.national.assembly.vote_shares"
        :baseline-shares="baselineResults.national.assembly.vote_shares"
      />

      <section class="election-summary-grid">
        <article
          v-for="card in summaryCards"
          :key="card.label"
          class="election-summary-card"
          :class="{ 'election-summary-card--winner winner-control-card': card.control }"
          :style="card.control ? controlCardStyle(card.control) : null"
        >
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <small>{{ card.detail }}</small>
        </article>
      </section>

      <div class="election-dashboard-grid">
        <ChamberComposition
          :title="nationalLowerHouseName"
          eyebrow="Lower House"
          :seats="results.national.assembly.seats"
          :control="results.national.assembly.control"
        />

        <ChamberComposition
          :title="nationalUpperHouseName"
          eyebrow="Upper House"
          :seats="results.national.prelates.seats"
          :control="results.national.prelates.control"
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

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Regional Geography</p>
            <h3>Party Strength By Region</h3>
          </div>
        </div>
        <div class="election-chart-shell">
          <ProvinceChart :option="regionalChartOption" aria-label="Regional Assembly seats by party" />
        </div>
        <div class="election-table-wrap">
          <table class="election-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>Assembly Control</th>
                <th>Popular Vote Leader</th>
                <th>Population</th>
                <th>Leader Vote</th>
                <th>Assemblypersons</th>
                <th>Prelates</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="region in regionRows" :key="region.name" class="winner-table-row" :style="controlCardStyle(region.assemblyControl)">
                <td>{{ region.name }}</td>
                <td>{{ region.assemblyControl.label }}</td>
                <td><PartyBadge :party="region.topParty" short /></td>
                <td>{{ formatNumber(region.population) }}</td>
                <td>{{ region.topVoteShare }} · {{ region.topVoteCount }}</td>
                <td>{{ region.assemblySeats }}</td>
                <td>{{ region.prelateSeats }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="warnings.length" class="election-diagnostics">
        <TriangleAlert :size="16" />
        <div>
          <strong>Diagnostics</strong>
          <span>{{ warnings.join(' · ') }}</span>
        </div>
      </section>
    </template>
  </section>
</template>

<script>
import { computed, ref } from 'vue'
import { FilePlus2, Radio, TriangleAlert, Vote } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import ChamberComposition from '../components/elections/ChamberComposition.vue'
import ElectionScenarioControls from '../components/elections/ElectionScenarioControls.vue'
import ElectionTickerCard from '../components/elections/ElectionTickerCard.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import PopularVoteBoard from '../components/elections/PopularVoteBoard.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useUiStore } from '../stores/uiStore'
import { formatCompactNumber, formatNumber } from '../domain/provinceVisualizations'
import { PARTIES, formatShare, lowerHouseName, upperHouseName, winnerControlStyle } from '../domain/elections'
import { regionalStackedSeatOption } from '../domain/elections/charts/electionChartOptions'
import { orderRegionsByReference, popularVoteCount, sumSeats, topParty } from '../domain/elections/viewHelpers'

export default {
  name: 'NationalElectionResults',
  components: { ChamberComposition, ElectionScenarioControls, ElectionTickerCard, FilePlus2, PartyBadge, PopularVoteBoard, ProvinceChart, Radio, TriangleAlert, Vote },
  setup() {
    const uiStore = useUiStore()
    const { baselineResults, hasData, results, store } = useElectionResults()
    const tickerRequestId = ref(0)
    const tickerScope = ref('national')
    const tickerTargetName = ref(null)
    const countryName = computed(() => store.currentData?.country?.basic_info?.name || 'Untitled Civilization')
    const nationalLowerHouseName = lowerHouseName('national')
    const nationalUpperHouseName = upperHouseName('national')

    const regionOrder = computed(() => store.currentData?.province_groups || [])
    const regionalChartOption = computed(() => regionalStackedSeatOption(results.value.regions, 'assembly', store.partyMeta, regionOrder.value))

    const summaryCards = computed(() => [
      {
        label: 'Assembly Control',
        value: results.value.national.assembly.control.label,
        detail: results.value.national.assembly.control.detail,
        control: results.value.national.assembly.control,
      },
      {
        label: 'Council Control',
        value: results.value.national.prelates.control.label,
        detail: results.value.national.prelates.control.detail,
        control: results.value.national.prelates.control,
      },
      {
        label: 'Assemblypersons',
        value: formatNumber(results.value.national.assembly.seat_count),
        detail: 'Assembly of the Empire',
      },
      {
        label: 'Popular Vote Leader',
        value: store.partyMeta[topParty(results.value.national.assembly.vote_shares)]?.name || topParty(results.value.national.assembly.vote_shares),
        detail: `${formatShare(results.value.national.assembly.vote_shares[topParty(results.value.national.assembly.vote_shares)])} national vote`,
      },
      {
        label: 'Prelates',
        value: formatNumber(results.value.national.prelates.seat_count),
        detail: 'Council of Prelates',
      },
    ])

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

    const regionRows = computed(() => orderRegionsByReference(Object.values(results.value.regions), regionOrder.value)
      .map((region) => {
        const leader = topParty(region.assembly.vote_shares)
        return {
          name: region.name,
          assemblyControl: region.assembly.control,
          population: region.population,
          topParty: leader,
          topVoteShare: formatShare(region.assembly.vote_shares[leader]),
          topVoteCount: formatCompactNumber(popularVoteCount(region.population, region.assembly.vote_shares, leader)),
          assemblySeats: sumSeats(region.assembly.seats),
          prelateSeats: sumSeats(region.prelates.seats),
        }
      }))

    const warnings = computed(() => results.value.diagnostics.warnings.slice(0, 5))

    const tickerKey = computed(() => [
      results.value.config.trendPackageId,
      results.value.config.seed,
      results.value.config.jitterSeed,
    ].join('|'))

    function showElectionTicker(scope = 'national', targetName = null) {
      tickerScope.value = scope
      tickerTargetName.value = targetName
      tickerRequestId.value += 1
    }

    return {
      baselineResults,
      controlCardStyle: (control) => winnerControlStyle(control, store.partyMeta),
      countryName,
      formatCompactNumber,
      formatNumber,
      hasData,
      nationalLowerHouseName,
      nationalUpperHouseName,
      nationalSeatColumns,
      popularVoteRows,
      regionRows,
      regionalChartOption,
      results,
      store,
      summaryCards,
      showElectionTicker,
      tickerKey,
      tickerRequestId,
      tickerScope,
      tickerTargetName,
      warnings,
      uiStore,
    }
  },
}
</script>

<template>
  <section class="election-page election-overview-page">
    <div v-if="!hasData" class="empty-workspace">
      <LayoutDashboard :size="52" class="text-[var(--accent)]" />
      <div>
        <h2>No Election Data</h2>
        <p>Load or create a template to view the election overview.</p>
      </div>
      <button type="button" class="btn-primary" @click="store.loadDefault">
        <FilePlus2 :size="16" />
        New Template
      </button>
    </div>

    <template v-else>
      <header class="overview-hero">
        <div>
          <p class="eyebrow">Election Overview</p>
          <h2>{{ countryName }} Election Board</h2>
          <p>{{ formatCompactNumber(results.national.population) }} people · {{ results.provinces.length }} provinces · {{ regionRows.length }} regions · simulated live returns</p>
          <div class="overview-hero-actions">
            <button type="button" class="btn-broadcast-start" @click="uiStore.openElectionBroadcastModal('overview')">
              <Radio :size="16" />
              Start Election Broadcast
            </button>
            <button type="button" class="btn-broadcast-start" @click="showElectionTicker('overview')">
              <Radio :size="16" />
              Show Election Ticker
            </button>
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

      <section class="overview-metric-strip" aria-label="Election overview metrics">
        <article v-for="metric in overviewMetrics" :key="metric.label" class="overview-metric-card">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <small>{{ metric.detail }}</small>
        </article>
      </section>

      <section class="overview-call-grid">
        <article class="overview-call-card overview-call-card--lead winner-control-card" :style="controlCardStyle(results.national.assembly.control)">
          <span>Assembly of the Empire</span>
          <strong>{{ results.national.assembly.control.label }}</strong>
          <small>{{ results.national.assembly.control.detail }}</small>
        </article>
        <article class="overview-call-card overview-call-card--lead winner-control-card" :style="controlCardStyle(results.national.prelates.control)">
          <span>Council of Prelates</span>
          <strong>{{ results.national.prelates.control.label }}</strong>
          <small>{{ results.national.prelates.control.detail }}</small>
        </article>
        <article class="overview-call-card">
          <span>Popular Vote Leader</span>
          <strong><PartyBadge :party="popularVoteLeader" /></strong>
          <small>{{ formatShare(results.national.assembly.vote_shares[popularVoteLeader]) }} national vote</small>
        </article>
        <article class="overview-call-card">
          <span>Election Climate</span>
          <strong>{{ climateName }}</strong>
          <small>{{ climateDescription }}</small>
        </article>
      </section>

      <section class="overview-control-grid">
        <article v-for="board in controlBoards" :key="`${board.eyebrow}-${board.label}`" class="overview-board-panel overview-control-panel">
          <div class="overview-control-panel-header">
            <div>
              <p class="eyebrow">{{ board.eyebrow }}</p>
              <h3>{{ board.label }}</h3>
            </div>
            <strong>{{ board.total }}</strong>
          </div>
          <div class="overview-control-list">
            <div v-for="row in board.rows" :key="`${board.label}-${row.party}`" class="overview-control-row" :style="partyControlStyle(row.party)">
              <PartyBadge :party="row.party" short />
              <div class="overview-control-track">
                <i :style="{ width: `${row.share}%`, backgroundColor: row.color }"></i>
              </div>
              <strong>{{ row.count }}</strong>
            </div>
          </div>
        </article>
      </section>

      <div class="election-dashboard-grid">
        <ChamberComposition
          title="Assembly of the Empire"
          eyebrow="National Lower House"
          :seats="results.national.assembly.seats"
          :control="results.national.assembly.control"
        />
        <ChamberComposition
          title="Council of Prelates"
          eyebrow="National Upper House"
          :seats="results.national.prelates.seats"
          :control="results.national.prelates.control"
        />
      </div>

      <section class="overview-board-grid">
        <article class="overview-board-panel">
          <div class="election-panel-heading">
            <div>
              <p class="eyebrow">Party Board</p>
              <h3>National Results</h3>
            </div>
          </div>
          <div class="overview-party-board">
            <div v-for="party in partyRows" :key="party.party" class="overview-party-row">
              <div class="overview-party-label">
                <PartyBadge :party="party.party" />
                <span>{{ party.voteShare }} · {{ party.popularVote }}</span>
              </div>
              <div class="overview-party-track">
                <i :style="{ width: `${party.assemblySeatShare}%`, backgroundColor: party.color }"></i>
              </div>
              <strong>{{ party.assemblySeats }} A / {{ party.prelateSeats }} P</strong>
            </div>
          </div>
        </article>

        <article class="overview-board-panel">
          <div class="election-panel-heading">
            <div>
              <p class="eyebrow">Regional Calls</p>
              <h3>Largest Regions</h3>
            </div>
          </div>
          <div class="overview-call-list">
            <div v-for="region in topRegionRows" :key="region.name" class="overview-call-row winner-control-card" :style="controlCardStyle(region.assembly.control)">
              <div>
                <strong>{{ region.name }}</strong>
                <span>{{ formatCompactNumber(region.population) }} · {{ region.province_count }} provinces</span>
              </div>
              <div>
                <PartyBadge :party="region.assembly.control.leaderParty" short />
                <span>{{ region.assembly.control.label }}</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="overview-board-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Regional Seat Map</p>
            <h3>Assembly Control Across Regions</h3>
          </div>
        </div>
        <div class="election-chart-shell">
          <ProvinceChart :option="regionalChartOption" aria-label="Regional Assembly seat map" />
        </div>
      </section>

      <section class="overview-board-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Provincial Highlights</p>
            <h3>Largest Provincial Houses</h3>
          </div>
        </div>
        <div class="overview-province-grid">
          <article
            v-for="province in topProvinceRows"
            :key="province.provinceIndex"
            class="overview-province-card winner-control-card"
            :style="controlCardStyle(province.assembly.control)"
          >
            <div>
              <strong>{{ province.name }}</strong>
              <span>{{ province.group }}</span>
            </div>
            <div>
              <small>{{ lowerHouseNameFor(province) }}</small>
              <b>{{ province.assembly.control.label }}</b>
            </div>
            <div>
              <small>{{ upperHouseNameFor(province) }}</small>
              <b>{{ province.prelates.control.label }}</b>
            </div>
          </article>
        </div>
      </section>
    </template>
  </section>
</template>

<script>
import { computed, ref } from 'vue'
import ChamberComposition from '../components/elections/ChamberComposition.vue'
import ElectionScenarioControls from '../components/elections/ElectionScenarioControls.vue'
import ElectionTickerCard from '../components/elections/ElectionTickerCard.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import { FilePlus2, LayoutDashboard, Radio } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useUiStore } from '../stores/uiStore'
import { formatCompactNumber, formatNumber } from '../domain/provinceVisualizations'
import { PARTIES, PARTY_META, formatShare, lowerHouseName, upperHouseName, winnerControlStyle } from '../domain/elections'
import { regionalStackedSeatOption } from '../domain/elections/charts/electionChartOptions'

function leaderFromShares(shares) {
  return [...PARTIES].sort((a, b) => Number(shares?.[b] || 0) - Number(shares?.[a] || 0))[0]
}

function countControlLeaders(units, chamber) {
  const total = Math.max(1, units.length)
  return PARTIES
    .map((party) => {
      const count = units.filter((unit) => unit[chamber]?.control?.leaderParty === party).length
      return {
        party,
        count,
        color: PARTY_META[party].color,
        share: (count / total) * 100,
      }
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || PARTIES.indexOf(a.party) - PARTIES.indexOf(b.party))
}

export default {
  name: 'ElectionOverview',
  components: { ChamberComposition, ElectionScenarioControls, ElectionTickerCard, FilePlus2, LayoutDashboard, PartyBadge, ProvinceChart, Radio },
  setup() {
    const uiStore = useUiStore()
    const { baselineResults, hasData, results, store } = useElectionResults()
    const tickerRequestId = ref(0)
    const tickerScope = ref('overview')
    const tickerTargetName = ref(null)
    const countryName = computed(() => store.currentData?.country?.basic_info?.name || 'Untitled Civilization')
    const popularVoteLeader = computed(() => leaderFromShares(results.value.national.assembly.vote_shares))
    const regionRows = computed(() => Object.values(results.value.regions).sort((a, b) => b.population - a.population))
    const topRegionRows = computed(() => regionRows.value.slice(0, 6))
    const topProvinceRows = computed(() => [...results.value.provinces].sort((a, b) => b.provincial_population - a.provincial_population).slice(0, 8))
    const regionalChartOption = computed(() => regionalStackedSeatOption(results.value.regions, 'assembly'))
    const overviewMetrics = computed(() => [
      {
        label: 'Assembly Majority',
        value: formatNumber(results.value.national.assembly.control.majority),
        detail: `${formatNumber(results.value.national.assembly.seat_count)} assemblypersons`,
      },
      {
        label: 'Council Majority',
        value: formatNumber(results.value.national.prelates.control.majority),
        detail: `${formatNumber(results.value.national.prelates.seat_count)} prelates`,
      },
      {
        label: 'Regions',
        value: formatNumber(regionRows.value.length),
        detail: 'upper and lower houses',
      },
      {
        label: 'Provinces',
        value: formatNumber(results.value.provinces.length),
        detail: 'upper and lower houses',
      },
      {
        label: 'Climate Signals',
        value: formatNumber(results.value.config.trends.length),
        detail: results.value.config.scenarioName || results.value.config.trendPackageId,
      },
    ])
    const climateName = computed(() => results.value.config.scenarioName || 'Election Climate')
    const climateDescription = computed(() => (
      results.value.config.scenarioDescription || `${formatNumber(results.value.config.trends.length)} climate signals`
    ))
    const controlBoards = computed(() => [
      {
        eyebrow: 'Regional Map',
        label: 'Assembly Calls',
        total: regionRows.value.length,
        rows: countControlLeaders(regionRows.value, 'assembly'),
      },
      {
        eyebrow: 'Regional Map',
        label: 'Council Calls',
        total: regionRows.value.length,
        rows: countControlLeaders(regionRows.value, 'prelates'),
      },
      {
        eyebrow: 'Provincial Map',
        label: 'Assembly Calls',
        total: results.value.provinces.length,
        rows: countControlLeaders(results.value.provinces, 'assembly'),
      },
      {
        eyebrow: 'Provincial Map',
        label: 'Council Calls',
        total: results.value.provinces.length,
        rows: countControlLeaders(results.value.provinces, 'prelates'),
      },
    ])
    const partyRows = computed(() => {
      const totalAssemblySeats = Math.max(1, results.value.national.assembly.seat_count)
      return PARTIES.map((party) => ({
        party,
        color: PARTY_META[party].color,
        voteShare: formatShare(results.value.national.assembly.vote_shares[party]),
        popularVote: formatCompactNumber(Math.round(results.value.national.population * Number(results.value.national.assembly.vote_shares[party] || 0))),
        assemblySeats: results.value.national.assembly.seats[party] || 0,
        prelateSeats: results.value.national.prelates.seats[party] || 0,
        assemblySeatShare: ((results.value.national.assembly.seats[party] || 0) / totalAssemblySeats) * 100,
      })).sort((a, b) => b.assemblySeats - a.assemblySeats)
    })

    function lowerHouseNameFor(province) {
      return lowerHouseName('provincial', province.name)
    }

    function upperHouseNameFor(province) {
      return upperHouseName('provincial', province.name)
    }

    function partyControlStyle(party) {
      const color = PARTY_META[party]?.color || '#d4a843'
      return {
        '--winner-color': color,
        '--winner-bg': `${color}12`,
        '--winner-border': `${color}44`,
      }
    }

    const tickerKey = computed(() => [
      results.value.config.trendPackageId,
      results.value.config.seed,
      results.value.config.jitterSeed,
    ].join('|'))

    function showElectionTicker(scope = 'overview', targetName = null) {
      tickerScope.value = scope
      tickerTargetName.value = targetName
      tickerRequestId.value += 1
    }

    return {
      baselineResults,
      climateDescription,
      climateName,
      controlBoards,
      controlCardStyle: winnerControlStyle,
      countryName,
      formatCompactNumber,
      formatNumber,
      formatShare,
      hasData,
      lowerHouseNameFor,
      overviewMetrics,
      partyRows,
      partyControlStyle,
      popularVoteLeader,
      regionRows,
      regionalChartOption,
      results,
      store,
      showElectionTicker,
      tickerKey,
      tickerRequestId,
      tickerScope,
      tickerTargetName,
      topProvinceRows,
      topRegionRows,
      uiStore,
      upperHouseNameFor,
    }
  },
}
</script>

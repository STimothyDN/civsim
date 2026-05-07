<template>
  <ElectionPageShell
    :icon="LayoutDashboard"
    eyebrow="Election Overview"
    :title="`${countryName} Election Board`"
    :subtitle="`${formatCompactNumber(results?.national?.population || 0)} people · ${results?.provinces?.length || 0} provinces · ${regionRows.length} regions`"
    scope="overview"
    :hide-hero="true"
  >
    <ElectionScoreboard
      :results="results"
      :party-meta="partyMeta"
      :country-name="countryName"
      :election-year="electionStore.electionYear"
      :assembly-leader-name="scoreboardAssemblyLeaderName"
      :council-leader-name="scoreboardCouncilLeaderName"
    />

    <PowerBalanceStrip :results="results" :party-meta="partyMeta" />

    <ElectionTickerCard
      :request-id="tickerRequestId"
      :scope="tickerScope"
      :target-name="tickerTargetName"
      :ticker-key="tickerKey"
    />

    <div class="election-data-grid">
      <ChamberComposition
        title="Assembly of the Empire"
        eyebrow="National Lower House"
        :seats="results.national.assembly.seats"
        :control="results.national.assembly.control"
        chamber-type="assembly"
        scope="national"
        :provinces="results.provinces"
        :jurisdiction-labels="overviewAssemblyJurisdictionLabels"
      />
      <ChamberComposition
        title="Council of Prelates"
        eyebrow="National Upper House"
        :seats="results.national.prelates.seats"
        :control="results.national.prelates.control"
        chamber-type="prelates"
        scope="national"
        :provinces="results.provinces"
        :jurisdiction-labels="overviewCouncilJurisdictionLabels"
      />
    </div>

    <section class="overview-call-grid">
      <article class="overview-call-card overview-call-card--lead winner-control-card" :style="controlCardStyle(results.national.assembly.control)">
        <span>Assembly Control</span>
        <strong>{{ results.national.assembly.control.label }}</strong>
        <small>{{ results.national.assembly.control.detail }}</small>
      </article>
      <article class="overview-call-card overview-call-card--lead winner-control-card" :style="controlCardStyle(results.national.prelates.control)">
        <span>Council Control</span>
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

    <div class="election-data-grid">
      <CaucusListCard
        title="Assembly Caucuses"
        eyebrow="Lower House Breakdown"
        :seats="results.national.assembly.seats"
        :control="results.national.assembly.control"
        chamber-type="assembly"
        scope="national"
        :provinces="results.provinces"
        :jurisdiction-labels="overviewAssemblyJurisdictionLabels"
      />
      <CaucusListCard
        title="Council Caucuses"
        eyebrow="Upper House Breakdown"
        :seats="results.national.prelates.seats"
        :control="results.national.prelates.control"
        chamber-type="prelates"
        scope="national"
        :provinces="results.provinces"
        :jurisdiction-labels="overviewCouncilJurisdictionLabels"
      />
    </div>

    <section class="overview-control-grid overview-control-grid--merged">
      <article v-for="board in mergedControlBoards" :key="board.kind" class="overview-board-panel overview-control-panel overview-control-panel--merged">
        <div class="overview-control-panel-header">
          <div>
            <p class="eyebrow">{{ board.eyebrow }}</p>
            <h3>{{ board.label }}</h3>
          </div>
          <strong>{{ board.total }}</strong>
        </div>
        <div class="overview-control-summary-grid">
          <div v-for="chamber in board.chambers" :key="`${board.kind}-${chamber.label}`" class="overview-control-summary">
            <span>{{ chamber.label }}</span>
            <div class="overview-control-list">
              <div v-for="row in chamber.rows" :key="`${board.kind}-${chamber.label}-${row.party}`" class="overview-control-row" :style="partyControlStyle(row.party)">
                <PartyBadge :party="row.party" short />
                <div class="overview-control-track">
                  <i :style="{ width: `${row.share}%`, backgroundColor: row.color }"></i>
                </div>
                <strong>{{ row.count }}</strong>
              </div>
            </div>
          </div>
        </div>
        <ControlCallBoard :units="board.units" :kind="board.kind" :party-meta="partyMeta" />
      </article>
    </section>

    <section class="election-data-grid">
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
  </ElectionPageShell>
</template>

<script>
import { computed } from 'vue'
import ElectionPageShell from '../components/elections/ElectionPageShell.vue'
import ElectionScoreboard from '../components/elections/ElectionScoreboard.vue'
import PowerBalanceStrip from '../components/elections/PowerBalanceStrip.vue'
import ChamberComposition from '../components/elections/ChamberComposition.vue'
import CaucusListCard from '../components/elections/CaucusListCard.vue'
import ControlCallBoard from '../components/elections/ControlCallBoard.vue'
import ElectionTickerCard from '../components/elections/ElectionTickerCard.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import { LayoutDashboard } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useElectionFormatters } from '../composables/useElectionFormatters'
import { useElectionLeaders } from '../composables/useElectionLeaders'
import { useElectionTicker } from '../composables/useElectionTicker'
import { useElectionStore } from '../stores/electionStore'
import { formatCompactNumber, formatNumber } from '../domain/formatting'
import { PARTIES, formatShare, lowerHouseName, upperHouseName } from '../domain/elections'
import { SEAT_OFFSETS } from '../domain/elections/constants/seatOffsets'
import { generateJurisdictionLabels, generateSeatDetails } from '../domain/elections/chambers/jurisdictionLabels'
import { regionalStackedSeatOption } from '../domain/elections/charts/electionChartOptions'
import { orderRegionsByReference } from '../domain/elections/viewHelpers'

function leaderFromShares(shares) {
  return [...PARTIES].sort((a, b) => Number(shares?.[b] || 0) - Number(shares?.[a] || 0))[0]
}

function countControlLeaders(units, chamber, partyMeta) {
  const total = Math.max(1, units.length)
  return PARTIES
    .map((party) => {
      const count = units.filter((unit) => unit[chamber]?.control?.leaderParty === party).length
      return {
        party,
        count,
        color: partyMeta[party]?.color,
        share: (count / total) * 100,
      }
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || PARTIES.indexOf(a.party) - PARTIES.indexOf(b.party))
}

export default {
  name: 'ElectionOverview',
  components: {
    ChamberComposition,
    CaucusListCard,
    ControlCallBoard,
    ElectionPageShell,
    ElectionScoreboard,
    ElectionTickerCard,
    LayoutDashboard,
    PartyBadge,
    PowerBalanceStrip,
    ProvinceChart,
  },
  setup() {
    const electionStore = useElectionStore()
    const { hasData, partyMeta, results, store } = useElectionResults()
    const { controlCardStyle } = useElectionFormatters(store)

    const countryName = computed(() => store.currentData?.country?.basic_info?.name || 'Untitled Civilization')
    const popularVoteLeader = computed(() => leaderFromShares(results.value.national.assembly.vote_shares))

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

    const { leader: nationalAssemblyLeader } = useElectionLeaders({
      control: computed(() => results.value.national.assembly.control),
      seatDetails: nationalAssemblySeatDetails,
      store,
      electionStore,
      seatIndexOffset: SEAT_OFFSETS.national.assembly,
      seatCount: computed(() => results.value.national.assembly.seat_count),
    })
    const { leader: nationalCouncilLeader } = useElectionLeaders({
      control: computed(() => results.value.national.prelates.control),
      seatDetails: nationalCouncilSeatDetails,
      store,
      electionStore,
      seatIndexOffset: SEAT_OFFSETS.national.prelates,
      seatCount: computed(() => results.value.national.prelates.seat_count),
    })

    const scoreboardAssemblyLeaderName = computed(() => {
      const leader = nationalAssemblyLeader.value
      if (!leader) return ''
      return electionStore.getRepresentativeName(leader.party, leader.seatIndex + SEAT_OFFSETS.national.assembly) || ''
    })
    const scoreboardCouncilLeaderName = computed(() => {
      const leader = nationalCouncilLeader.value
      if (!leader) return ''
      return electionStore.getRepresentativeName(leader.party, leader.seatIndex + SEAT_OFFSETS.national.prelates) || ''
    })
    const regionOrder = computed(() => store.currentData?.province_groups || [])
    const regionRows = computed(() => orderRegionsByReference(Object.values(results.value.regions), regionOrder.value))

    const overviewAssemblyJurisdictionLabels = computed(() => generateJurisdictionLabels({
      seats: results.value.national.assembly.seats,
      chamberType: 'assembly',
      scope: 'national',
      provinces: results.value.provinces,
    }))
    const overviewCouncilJurisdictionLabels = computed(() => generateJurisdictionLabels({
      seats: results.value.national.prelates.seats,
      chamberType: 'prelates',
      scope: 'national',
      provinces: results.value.provinces,
    }))

    const { showElectionTicker, tickerKey, tickerRequestId, tickerScope, tickerTargetName } =
      useElectionTicker({ results, defaultScope: 'overview' })

    const topRegionRows = computed(() => regionRows.value.slice(0, 6))
    const topProvinceRows = computed(() => [...results.value.provinces].sort((a, b) => b.provincial_population - a.provincial_population).slice(0, 8))
    const regionalChartOption = computed(() => regionalStackedSeatOption(results.value.regions, 'assembly', partyMeta.value, regionOrder.value))
    const climateName = computed(() => results.value.config.scenarioName || 'Election Climate')
    const climateDescription = computed(() => (
      results.value.config.scenarioDescription || `${formatNumber(results.value.config.trends.length)} climate signals`
    ))
    const mergedControlBoards = computed(() => [
      {
        eyebrow: 'Regional Map',
        label: 'Regional Control',
        total: regionRows.value.length,
        kind: 'region',
        units: regionRows.value,
        chambers: [
          { label: 'Assembly Calls', rows: countControlLeaders(regionRows.value, 'assembly', partyMeta.value) },
          { label: 'Council Calls', rows: countControlLeaders(regionRows.value, 'prelates', partyMeta.value) },
        ],
      },
      {
        eyebrow: 'Provincial Map',
        label: 'Provincial Control',
        total: results.value.provinces.length,
        kind: 'province',
        units: results.value.provinces,
        chambers: [
          { label: 'Assembly Calls', rows: countControlLeaders(results.value.provinces, 'assembly', partyMeta.value) },
          { label: 'Council Calls', rows: countControlLeaders(results.value.provinces, 'prelates', partyMeta.value) },
        ],
      },
    ])
    const partyRows = computed(() => {
      const totalAssemblySeats = Math.max(1, results.value.national.assembly.seat_count)
      return PARTIES.map((party) => ({
        party,
        color: partyMeta.value[party]?.color,
        voteShare: formatShare(results.value.national.assembly.vote_shares[party]),
        popularVote: formatCompactNumber(Math.round(results.value.national.population * Number(results.value.national.assembly.vote_shares[party] || 0))),
        assemblySeats: results.value.national.assembly.seats[party] || 0,
        prelateSeats: results.value.national.prelates.seats[party] || 0,
        assemblySeatShare: ((results.value.national.assembly.seats[party] || 0) / totalAssemblySeats) * 100,
      })).sort((a, b) => b.assemblySeats - a.assemblySeats)
    })

    function lowerHouseNameFor(province) { return lowerHouseName('provincial', province.name) }
    function upperHouseNameFor(province) { return upperHouseName('provincial', province.name) }

    function partyControlStyle(party) {
      const color = partyMeta.value[party]?.color || '#d4a843'
      return {
        '--winner-color': color,
        '--winner-bg': `${color}12`,
        '--winner-border': `${color}44`,
      }
    }

    return {
      climateDescription,
      climateName,
      controlCardStyle,
      countryName,
      formatCompactNumber,
      formatNumber,
      formatShare,
      hasData,
      LayoutDashboard,
      lowerHouseNameFor,
      mergedControlBoards,
      partyMeta,
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
      upperHouseNameFor,
      overviewAssemblyJurisdictionLabels,
      overviewCouncilJurisdictionLabels,
      electionStore,
      scoreboardAssemblyLeaderName,
      scoreboardCouncilLeaderName,
    }
  },
}
</script>

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
              <BrainCircuit :size="13" class="broadcast-ai-mark" />
            </button>
            <button type="button" class="btn-broadcast-start" @click="showElectionTicker('overview')">
              <Radio :size="16" />
              Show Election Ticker
              <BrainCircuit :size="13" class="broadcast-ai-mark" />
            </button>
          </div>
        </div>
        <div class="overview-hero-calls">
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(results.national.assembly.control)">
            <span>Assembly Control</span>
            <strong>{{ results.national.assembly.control.label }}</strong>
            <small class="control-detail">{{ assemblyControlInfo?.leaderPartySeatCount }}/{{ assemblyControlInfo?.totalSeats || results.national.assembly.control.detail }} seats won</small>
            <small v-if="assemblyControlInfo?.isMinority" class="leader-support-line">
              with support from <span v-html="formatListWithOxfordComma(assemblyControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
            </small>
            <small v-if="assemblyControlInfo?.isMinority" class="control-detail">{{ assemblyControlInfo.totalGovernmentSeats }}/{{ assemblyControlInfo.totalSeats }} seats total</small>
          </div>
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(results.national.prelates.control)">
            <span>Council Control</span>
            <strong>{{ results.national.prelates.control.label }}</strong>
            <small class="control-detail">{{ councilControlInfo?.leaderPartySeatCount }}/{{ councilControlInfo?.totalSeats || results.national.prelates.control.detail }} seats won</small>
            <small v-if="councilControlInfo?.isMinority" class="leader-support-line">
              with support from <span v-html="formatListWithOxfordComma(councilControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
            </small>
            <small v-if="councilControlInfo?.isMinority" class="control-detail">{{ councilControlInfo.totalGovernmentSeats }}/{{ councilControlInfo.totalSeats }} seats total</small>
          </div>
        </div>
        <div v-if="assemblyLeader || councilLeader" class="overview-hero-calls">
          <div v-if="assemblyLeader" class="overview-hero-call winner-control-card" :style="controlCardStyle(results.national.assembly.control)">
            <span>Assembly Leader</span>
            <strong>{{ lowerHouseLeaderTitle('national') }} {{ electionStore.getRepresentativeName(assemblyLeader.party, assemblyLeader.seatIndex) || '' }}</strong>
            <small class="leader-line">from {{ assemblyLeader.jurisdiction }} ({{ store.partyMeta[assemblyLeader.party]?.abbreviation || assemblyLeader.party }})</small>
            <small v-if="assemblySupportLeaders?.length" class="leader-support-line">
              with support from <span v-html="formatListWithOxfordComma(assemblySupportLeaders.map(formatSupportLeaderWithColor))"></span>
            </small>
          </div>
          <div v-if="councilLeader" class="overview-hero-call winner-control-card" :style="controlCardStyle(results.national.prelates.control)">
            <span>Council Leader</span>
            <strong>{{ upperHouseLeaderTitle('national') }} {{ electionStore.getRepresentativeName(councilLeader.party, councilLeader.seatIndex + 2500) || '' }}</strong>
            <small class="leader-line">from {{ councilLeader.jurisdiction }} ({{ store.partyMeta[councilLeader.party]?.abbreviation || councilLeader.party }})</small>
            <small v-if="councilSupportLeaders?.length" class="leader-support-line">
              with support from <span v-html="formatListWithOxfordComma(councilSupportLeaders.map(formatSupportLeaderWithColor))"></span>
            </small>
          </div>
        </div>
      </header>

      <ElectionTickerCard
        :request-id="tickerRequestId"
        :scope="tickerScope"
        :target-name="tickerTargetName"
        :ticker-key="tickerKey"
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
          <ControlCallBoard :units="board.units" :kind="board.kind" :party-meta="store.partyMeta" />
        </article>
      </section>

      <div class="election-dashboard-grid">
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

      <div class="election-dashboard-grid">
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
import { computed, ref, watch } from 'vue'
import ChamberComposition from '../components/elections/ChamberComposition.vue'
import CaucusListCard from '../components/elections/CaucusListCard.vue'
import ControlCallBoard from '../components/elections/ControlCallBoard.vue'
import ElectionTickerCard from '../components/elections/ElectionTickerCard.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import { BrainCircuit, FilePlus2, LayoutDashboard, Radio } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useUiStore } from '../stores/uiStore'
import { usePollingStore } from '../stores/pollingStore'
import { useElectionStore } from '../stores/electionStore'
import { formatCompactNumber, formatNumber } from '../domain/provinceVisualizations'
import { PARTIES, formatShare, lowerHouseName, upperHouseName, lowerHouseLeaderTitle, upperHouseLeaderTitle, winnerControlStyle } from '../domain/elections'
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
  components: { BrainCircuit, ChamberComposition, CaucusListCard, ControlCallBoard, ElectionTickerCard, FilePlus2, LayoutDashboard, PartyBadge, ProvinceChart, Radio },
  setup() {
    const uiStore = useUiStore()
    const pollingStore = usePollingStore()
    const electionStore = useElectionStore()
    const { hasData, results, store } = useElectionResults()
    const tickerRequestId = ref(0)
    const tickerScope = ref('overview')
    const tickerTargetName = ref(null)
    const countryName = computed(() => store.currentData?.country?.basic_info?.name || 'Untitled Civilization')
    const popularVoteLeader = computed(() => leaderFromShares(results.value.national.assembly.vote_shares))
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

    // Generate seat details to find leaders
    const overviewAssemblySeatDetails = computed(() => generateSeatDetails({
      seats: results.value.national.assembly.seats,
      chamberType: 'assembly',
      scope: 'national',
      provinces: results.value.provinces,
    }))

    const overviewCouncilSeatDetails = computed(() => generateSeatDetails({
      seats: results.value.national.prelates.seats,
      chamberType: 'prelates',
      scope: 'national',
      provinces: results.value.provinces,
    }))

    // Find leaders (highest support in governing party)
    const assemblyLeader = computed(() => {
      const leaderParty = results.value.national.assembly.control?.leaderParty
      if (!leaderParty) return null
      const partySeats = overviewAssemblySeatDetails.value.filter((s) => s.party === leaderParty)
      if (partySeats.length === 0) return null
      // Sort by support and get the top one
      const leader = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
      return leader
    })

    const councilLeader = computed(() => {
      const leaderParty = results.value.national.prelates.control?.leaderParty
      if (!leaderParty) return null
      const partySeats = overviewCouncilSeatDetails.value.filter((s) => s.party === leaderParty)
      if (partySeats.length === 0) return null
      const leader = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
      return leader
    })

    // Get control party seat count and support info for Assembly
    const assemblyControlInfo = computed(() => {
      const control = results.value.national.assembly.control
      const leaderParty = control?.leaderParty
      if (!leaderParty) return null
      
      const partySeats = overviewAssemblySeatDetails.value.filter((s) => s.party === leaderParty)
      const leaderPartySeatCount = partySeats.length
      const totalSeats = results.value.national.assembly.seat_count
      
      const supportParties = control?.supportParties || []
      const supportInfo = supportParties.map(party => {
        const seats = overviewAssemblySeatDetails.value.filter((s) => s.party === party).length
        return {
          party,
          name: store.partyMeta[party]?.abbreviation || party,
          color: store.partyMeta[party]?.color || '#d4a843',
          seatCount: seats,
        }
      })
      
      const totalGovernmentSeats = leaderPartySeatCount + supportInfo.reduce((sum, p) => sum + p.seatCount, 0)
      
      return {
        leaderPartySeatCount,
        supportInfo,
        totalGovernmentSeats,
        totalSeats,
        isMinority: supportParties.length > 0,
      }
    })

    // Get control party seat count and support info for Council
    const councilControlInfo = computed(() => {
      const control = results.value.national.prelates.control
      const leaderParty = control?.leaderParty
      if (!leaderParty) return null
      
      const partySeats = overviewCouncilSeatDetails.value.filter((s) => s.party === leaderParty)
      const leaderPartySeatCount = partySeats.length
      const totalSeats = results.value.national.prelates.seat_count
      
      const supportParties = control?.supportParties || []
      const supportInfo = supportParties.map(party => {
        const seats = overviewCouncilSeatDetails.value.filter((s) => s.party === party).length
        return {
          party,
          name: store.partyMeta[party]?.abbreviation || party,
          color: store.partyMeta[party]?.color || '#d4a843',
          seatCount: seats,
        }
      })
      
      const totalGovernmentSeats = leaderPartySeatCount + supportInfo.reduce((sum, p) => sum + p.seatCount, 0)
      
      return {
        leaderPartySeatCount,
        supportInfo,
        totalGovernmentSeats,
        totalSeats,
        isMinority: supportParties.length > 0,
      }
    })

    // Get caucus leader names for support parties
    const assemblySupportLeaders = computed(() => {
      const control = results.value.national.assembly.control
      const leaderParty = control?.leaderParty
      if (!leaderParty) return []
      
      const leaders = []
      
      // Add support party caucus leaders for minority governments
      const supportParties = control?.supportParties || []
      supportParties.forEach(party => {
        const partySeats = overviewAssemblySeatDetails.value.filter((s) => s.party === party)
        if (partySeats.length === 0) return
        const leader = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
        const name = electionStore.getRepresentativeName(party, leader.seatIndex)
        leaders.push({
          party,
          name: name || store.partyMeta[party]?.abbreviation || party,
          title: 'Caucus Leader',
          jurisdiction: leader.jurisdiction,
        })
      })
      
      return leaders
    })

    const councilSupportLeaders = computed(() => {
      const control = results.value.national.prelates.control
      const leaderParty = control?.leaderParty
      if (!leaderParty) return []
      
      const leaders = []
      
      // Add support party caucus leaders for minority governments
      const supportParties = control?.supportParties || []
      supportParties.forEach(party => {
        const partySeats = overviewCouncilSeatDetails.value.filter((s) => s.party === party)
        if (partySeats.length === 0) return
        const leader = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
        const name = electionStore.getRepresentativeName(party, leader.seatIndex + 2500)
        leaders.push({
          party,
          name: name || store.partyMeta[party]?.abbreviation || party,
          title: 'Caucus Leader',
          jurisdiction: leader.jurisdiction,
        })
      })
      
      return leaders
    })
    const topRegionRows = computed(() => regionRows.value.slice(0, 6))
    const topProvinceRows = computed(() => [...results.value.provinces].sort((a, b) => b.provincial_population - a.provincial_population).slice(0, 8))
    const regionalChartOption = computed(() => regionalStackedSeatOption(results.value.regions, 'assembly', store.partyMeta, regionOrder.value))
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
    const mergedControlBoards = computed(() => [
      {
        eyebrow: 'Regional Map',
        label: 'Regional Control',
        total: regionRows.value.length,
        kind: 'region',
        units: regionRows.value,
        chambers: [
          { label: 'Assembly Calls', rows: countControlLeaders(regionRows.value, 'assembly', store.partyMeta) },
          { label: 'Council Calls', rows: countControlLeaders(regionRows.value, 'prelates', store.partyMeta) },
        ],
      },
      {
        eyebrow: 'Provincial Map',
        label: 'Provincial Control',
        total: results.value.provinces.length,
        kind: 'province',
        units: results.value.provinces,
        chambers: [
          { label: 'Assembly Calls', rows: countControlLeaders(results.value.provinces, 'assembly', store.partyMeta) },
          { label: 'Council Calls', rows: countControlLeaders(results.value.provinces, 'prelates', store.partyMeta) },
        ],
      },
    ])
    const partyRows = computed(() => {
      const totalAssemblySeats = Math.max(1, results.value.national.assembly.seat_count)
      return PARTIES.map((party) => ({
        party,
        color: store.partyMeta[party]?.color,
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
      const color = store.partyMeta[party]?.color || '#d4a843'
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
      pollingStore.pollSeed,
    ].join('|'))

    function showElectionTicker(scope = 'overview', targetName = null) {
      tickerScope.value = scope
      tickerTargetName.value = targetName
      tickerRequestId.value += 1
    }

    function formatListWithOxfordComma(items) {
      if (items.length === 0) return ''
      if (items.length === 1) return items[0]
      if (items.length === 2) return `${items[0]} and ${items[1]}`
      return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
    }

    function formatSupportLeaderWithColor(leader) {
      const partyColor = store.partyMeta[leader.party]?.color || '#d4a843'
      return `${leader.title} <span style="color: ${partyColor}">${leader.name}</span> from ${leader.jurisdiction} (<span style="color: ${partyColor}">${store.partyMeta[leader.party]?.abbreviation || leader.party}</span>)`
    }

    function formatSupportPartyWithColor(party) {
      return `<span style="color: ${party.color}">${party.name}</span> (${party.seatCount})`
    }

    return {
      climateDescription,
      climateName,
      controlCardStyle: (control) => winnerControlStyle(control, store.partyMeta),
      countryName,
      formatCompactNumber,
      formatNumber,
      formatShare,
      hasData,
      lowerHouseLeaderTitle,
      lowerHouseNameFor,
      mergedControlBoards,
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
      upperHouseLeaderTitle,
      upperHouseNameFor,
      overviewAssemblyJurisdictionLabels,
      overviewCouncilJurisdictionLabels,
      assemblyLeader,
      councilLeader,
      assemblySupportLeaders,
      councilSupportLeaders,
      assemblyControlInfo,
      councilControlInfo,
      electionStore,
      formatListWithOxfordComma,
      formatSupportLeaderWithColor,
      formatSupportPartyWithColor,
    }
  },
}
</script>

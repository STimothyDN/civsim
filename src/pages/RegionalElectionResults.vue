<template>
  <section class="election-page">
    <div v-if="!hasData" class="empty-workspace">
      <Map :size="52" class="text-[var(--accent)]" />
      <div>
        <h2>No Regional Election Data</h2>
        <p>Load or create a template with provinces and groups.</p>
      </div>
      <button type="button" class="btn-primary" @click="store.loadDefault">
        <FilePlus2 :size="16" />
        New Template
      </button>
    </div>

    <template v-else>
      <header class="overview-hero election-decision-hero">
        <div class="election-decision-hero-main">
          <div class="election-page-icon-wrap"><Map :size="26" /></div>
          <div>
            <p class="eyebrow">Regional Elections</p>
            <h2>Regional Decision Desk</h2>
            <p>{{ formatCompactNumber(totalRegionalPopulation) }} people · {{ regionRows.length }} regions · {{ formatNumber(totalRegionalAssemblySeats) }} assemblypersons</p>
            <div v-if="selectedRegion" class="overview-hero-actions">
              <button type="button" class="btn-broadcast-start" @click="uiStore.openElectionBroadcastModal('regional', selectedRegionName)">
                <Radio :size="16" />
                Start Regional Broadcast
              </button>
              <button type="button" class="btn-broadcast-start" @click="showElectionTicker('regional', selectedRegion.name)">
                <Radio :size="16" />
                Show Election Ticker
              </button>
            </div>
          </div>
        </div>
        <div v-if="selectedRegion" class="overview-hero-calls">
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedRegion.assembly.control)">
            <span>Selected Assembly</span>
            <strong>{{ selectedRegion.assembly.control.label }}</strong>
            <small>{{ selectedRegion.name }}</small>
          </div>
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedRegion.prelates.control)">
            <span>Selected Council</span>
            <strong>{{ selectedRegion.prelates.control.label }}</strong>
            <small>{{ selectedRegion.prelates.control.detail }}</small>
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
        :current-shares="selectedRegion?.assembly?.vote_shares"
        :baseline-shares="baselineSelectedRegion?.assembly?.vote_shares"
      />

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Selected Region</p>
            <h3>{{ selectedRegion?.name || 'No Region' }}</h3>
          </div>
          <label class="election-select">
            <span>Region</span>
            <select v-model="selectedRegionName">
              <option v-for="region in regionRows" :key="region.name" :value="region.name">{{ region.name }}</option>
            </select>
          </label>
        </div>

        <div v-if="selectedRegion" class="election-summary-grid election-summary-grid--tight">
          <article class="election-summary-card">
            <span>Population</span>
            <strong>{{ formatCompactNumber(selectedRegion.population) }}</strong>
            <small>{{ selectedRegion.province_count }} provinces</small>
          </article>
          <article class="election-summary-card election-summary-card--winner winner-control-card" :style="controlCardStyle(selectedRegion.assembly.control)">
            <span>{{ selectedLowerHouseName }}</span>
            <strong>{{ selectedRegion.assembly.control.label }}</strong>
            <small>{{ formatNumber(sumSeats(selectedRegion.assembly.seats)) }} assemblypersons</small>
          </article>
          <article class="election-summary-card election-summary-card--winner winner-control-card" :style="controlCardStyle(selectedRegion.prelates.control)">
            <span>{{ selectedUpperHouseName }}</span>
            <strong>{{ selectedRegion.prelates.control.label }}</strong>
            <small>{{ formatNumber(sumSeats(selectedRegion.prelates.seats)) }} prelates</small>
          </article>
          <article class="election-summary-card election-summary-card--winner winner-control-card" :style="partyWinnerStyle(selectedPopularVoteLeader)">
            <span>Popular Vote Leader</span>
            <strong>{{ selectedPopularVoteLeaderName }}</strong>
            <small>{{ selectedPopularVoteLeaderShare }} · {{ selectedPopularVoteLeaderVotes }}</small>
          </article>
        </div>
      </section>

      <div class="election-dashboard-grid">
        <section class="election-panel">
          <div class="election-panel-heading">
            <div>
              <p class="eyebrow">Regional Assembly</p>
              <h3>{{ selectedLowerHouseName }}</h3>
            </div>
          </div>
          <ChamberComposition
            v-if="selectedRegion"
            :title="selectedLowerHouseName"
            eyebrow="Regional Delegation"
            :seats="selectedRegion.assembly.seats"
            :control="selectedRegion.assembly.control"
            compact
          />
        </section>

        <section class="election-panel">
          <div class="election-panel-heading">
            <div>
              <p class="eyebrow">Regional Prelates</p>
              <h3>{{ selectedUpperHouseName }}</h3>
            </div>
          </div>
          <ChamberComposition
            v-if="selectedRegion"
            :title="selectedUpperHouseName"
            eyebrow="Regional Delegation"
            :seats="selectedRegion.prelates.seats"
            :control="selectedRegion.prelates.control"
            compact
          />
        </section>
      </div>

      <section v-if="selectedRegion" class="election-panel">
        <PopularVoteBoard
          eyebrow="Selected Region"
          :title="`${selectedRegion.name} Popular Vote`"
          :rows="selectedPopularVoteRows"
          :total-votes="selectedRegion.population"
          :seat-columns="selectedRegionSeatColumns"
        />
      </section>

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Region-By-Region Calls</p>
            <h3>Control Of Regional Houses</h3>
          </div>
        </div>
        <div class="election-call-board election-call-board--regions">
          <article
            v-for="region in regionRows"
            :key="region.name"
            class="election-call-card winner-control-card"
            :style="controlCardStyle(region.assembly.control)"
          >
            <div class="election-call-card-main">
              <strong>{{ region.name }}</strong>
              <span>{{ formatCompactNumber(region.population) }} people · {{ region.province_count }} provinces</span>
            </div>
            <div class="election-call-card-chambers">
              <div>
                <small>Assembly</small>
                <PartyBadge :party="region.assembly.control.leaderParty" short />
                <b>{{ region.assembly.control.label }}</b>
              </div>
              <div :style="controlCardStyle(region.prelates.control)">
                <small>Council</small>
                <PartyBadge :party="region.prelates.control.leaderParty" short />
                <b>{{ region.prelates.control.label }}</b>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">All Regions</p>
            <h3>Assembly Seat Geography</h3>
          </div>
        </div>
        <div class="election-chart-shell">
          <ProvinceChart :option="regionalAssemblyChartOption" aria-label="Regional Assembly seats by party" />
        </div>
      </section>

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Regional Popular Vote</p>
            <h3>Vote Strength By Region</h3>
          </div>
        </div>
        <div class="election-table-wrap">
          <table class="election-table election-table--wide election-table--vote-detail">
            <thead>
              <tr>
                <th>Region</th>
                <th>Population</th>
                <th>Top Party</th>
                <th>Leader Vote</th>
                <th v-for="party in parties" :key="`regional-vote-${party}`">{{ party }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="region in regionalPopularVoteRows" :key="`${region.name}-popular-vote`" class="winner-table-row" :style="partyWinnerStyle(region.topParty)">
                <td>{{ region.name }}</td>
                <td>{{ formatNumber(region.population) }}</td>
                <td><PartyBadge :party="region.topParty" short /></td>
                <td>{{ region.topVoteShare }} · {{ region.topVoteCount }}</td>
                <td v-for="party in parties" :key="`${region.name}-vote-${party}`">
                  <span class="vote-detail-cell">
                    <strong>{{ formatShare(region.voteShares[party]) }}</strong>
                    <small>{{ formatCompactNumber(region.popularVotes[party]) }}</small>
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
            <p class="eyebrow">Regional Table</p>
            <h3>Seat Allocation By Region</h3>
          </div>
        </div>
        <div class="election-table-wrap">
          <table class="election-table election-table--wide">
            <thead>
              <tr>
                <th>Region</th>
                <th>Assembly Control</th>
                <th>Council Control</th>
                <th>Population</th>
                <th>Provinces</th>
                <th v-for="party in parties" :key="`assembly-${party}`">A {{ party }}</th>
                <th v-for="party in parties" :key="`prelates-${party}`">P {{ party }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="region in regionRows" :key="region.name" class="winner-table-row" :style="controlCardStyle(region.assembly.control)">
                <td>{{ region.name }}</td>
                <td>{{ region.assembly.control.label }}</td>
                <td>{{ region.prelates.control.label }}</td>
                <td>{{ formatNumber(region.population) }}</td>
                <td>{{ region.province_count }}</td>
                <td v-for="party in parties" :key="`${region.name}-a-${party}`">{{ region.assembly.seats[party] }}</td>
                <td v-for="party in parties" :key="`${region.name}-p-${party}`">{{ region.prelates.seats[party] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { FilePlus2, Map, Radio } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import ChamberComposition from '../components/elections/ChamberComposition.vue'
import ElectionScenarioControls from '../components/elections/ElectionScenarioControls.vue'
import ElectionTickerCard from '../components/elections/ElectionTickerCard.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import PopularVoteBoard from '../components/elections/PopularVoteBoard.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useUiStore } from '../stores/uiStore'
import { formatCompactNumber, formatNumber } from '../domain/provinceVisualizations'
import { lowerHouseName, PARTIES, PARTY_META, formatShare, upperHouseName, winnerControlStyle } from '../domain/elections'
import { regionalStackedSeatOption } from '../domain/elections/charts/electionChartOptions'
import { partyWinnerStyle, popularVoteCount, sumSeats, topParty } from '../domain/elections/viewHelpers'

export default {
  name: 'RegionalElectionResults',
  components: { ChamberComposition, ElectionScenarioControls, ElectionTickerCard, FilePlus2, Map, PartyBadge, PopularVoteBoard, ProvinceChart, Radio },
  setup() {
    const uiStore = useUiStore()
    const selectedRegionName = ref('')
    const tickerRequestId = ref(0)
    const tickerScope = ref('regional')
    const tickerTargetName = ref(null)
    const { baselineResults, hasData, results, store } = useElectionResults()
    const regionRows = computed(() => Object.values(results.value.regions).sort((a, b) => b.population - a.population))
    const selectedRegion = computed(() => results.value.regions[selectedRegionName.value] || regionRows.value[0] || null)
    const baselineSelectedRegion = computed(() => baselineResults.value.regions[selectedRegionName.value] || null)
    const selectedLowerHouseName = computed(() => lowerHouseName('regional', selectedRegion.value?.name))
    const selectedUpperHouseName = computed(() => upperHouseName('regional', selectedRegion.value?.name))
    const regionalAssemblyChartOption = computed(() => regionalStackedSeatOption(results.value.regions, 'assembly'))
    const totalRegionalPopulation = computed(() => regionRows.value.reduce((sum, region) => sum + Number(region.population || 0), 0))
    const totalRegionalAssemblySeats = computed(() => regionRows.value.reduce((sum, region) => sum + sumSeats(region.assembly.seats), 0))
    const selectedRegionSeatColumns = [
      { key: 'assemblySeats', label: 'Assembly Seats' },
      { key: 'prelateSeats', label: 'Council Seats' },
    ]
    const selectedPopularVoteRows = computed(() => PARTIES.map((party) => ({
      party,
      voteShare: selectedRegion.value?.assembly?.vote_shares?.[party] || 0,
      voteCount: popularVoteCount(selectedRegion.value?.population, selectedRegion.value?.assembly?.vote_shares, party),
      assemblySeats: selectedRegion.value?.assembly?.seats?.[party] || 0,
      prelateSeats: selectedRegion.value?.prelates?.seats?.[party] || 0,
    })))
    const selectedPopularVoteLeader = computed(() => topParty(selectedRegion.value?.assembly?.vote_shares))
    const selectedPopularVoteLeaderName = computed(() => PARTY_META[selectedPopularVoteLeader.value]?.name || selectedPopularVoteLeader.value)
    const selectedPopularVoteLeaderShare = computed(() => formatShare(selectedRegion.value?.assembly?.vote_shares?.[selectedPopularVoteLeader.value]))
    const selectedPopularVoteLeaderVotes = computed(() => formatCompactNumber(popularVoteCount(
      selectedRegion.value?.population,
      selectedRegion.value?.assembly?.vote_shares,
      selectedPopularVoteLeader.value
    )))
    const regionalPopularVoteRows = computed(() => regionRows.value.map((region) => {
      const leader = topParty(region.assembly.vote_shares)
      const popularVotes = Object.fromEntries(PARTIES.map((party) => [
        party,
        popularVoteCount(region.population, region.assembly.vote_shares, party),
      ]))
      return {
        name: region.name,
        population: region.population,
        topParty: leader,
        topVoteShare: formatShare(region.assembly.vote_shares[leader]),
        topVoteCount: formatCompactNumber(popularVotes[leader]),
        voteShares: region.assembly.vote_shares,
        popularVotes,
      }
    }))

    const tickerKey = computed(() => [
      results.value.config.trendPackageId,
      results.value.config.seed,
      results.value.config.jitterSeed,
      selectedRegion.value?.name || '',
    ].join('|'))

    function showElectionTicker(scope = 'regional', targetName = selectedRegion.value?.name || null) {
      tickerScope.value = scope
      tickerTargetName.value = targetName
      tickerRequestId.value += 1
    }

    watch(regionRows, (regions) => {
      if (!regions.length) {
        selectedRegionName.value = ''
        return
      }
      if (!regions.some((region) => region.name === selectedRegionName.value)) {
        selectedRegionName.value = regions[0].name
      }
    }, { immediate: true })

    return {
      baselineSelectedRegion,
      controlCardStyle: winnerControlStyle,
      formatCompactNumber,
      formatNumber,
      hasData,
      formatShare,
      parties: PARTIES,
      partyWinnerStyle,
      regionRows,
      regionalPopularVoteRows,
      regionalAssemblyChartOption,
      results,
      selectedRegion,
      selectedRegionName,
      selectedLowerHouseName,
      selectedPopularVoteLeader,
      selectedPopularVoteLeaderName,
      selectedPopularVoteLeaderShare,
      selectedPopularVoteLeaderVotes,
      selectedPopularVoteRows,
      selectedRegionSeatColumns,
      selectedUpperHouseName,
      showElectionTicker,
      store,
      sumSeats,
      tickerKey,
      tickerRequestId,
      tickerScope,
      tickerTargetName,
      totalRegionalAssemblySeats,
      totalRegionalPopulation,
      uiStore,
    }
  },
}
</script>

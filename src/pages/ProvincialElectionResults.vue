<template>
  <section class="election-page">
    <div v-if="!hasData" class="empty-workspace">
      <Building2 :size="52" class="text-[var(--accent)]" />
      <div>
        <h2>No Provincial Election Data</h2>
        <p>Load or create a template with provinces.</p>
      </div>
      <button type="button" class="btn-primary" @click="store.loadDefault">
        <FilePlus2 :size="16" />
        New Template
      </button>
    </div>

    <template v-else>
      <header class="overview-hero election-decision-hero">
        <div class="election-decision-hero-main">
          <div class="election-page-icon-wrap"><Building2 :size="26" /></div>
          <div>
            <p class="eyebrow">Provincial Elections</p>
            <h2>Provincial Decision Desk</h2>
            <p>{{ selectedProvince?.name }} · {{ selectedProvince?.group }} · {{ formatCompactNumber(selectedProvince?.provincial_population) }} people</p>
            <div v-if="selectedProvince" class="overview-hero-actions">
              <button type="button" class="btn-broadcast-start" @click="uiStore.openElectionBroadcastModal('provincial', selectedProvince.name)">
                <Radio :size="16" />
                Start Provincial Broadcast
                <BrainCircuit :size="13" style="opacity:0.7;margin-left:2px" />
              </button>
              <button type="button" class="btn-broadcast-start" @click="showElectionTicker('provincial', selectedProvince.name)">
                <Radio :size="16" />
                Show Election Ticker
                <BrainCircuit :size="13" style="opacity:0.7;margin-left:2px" />
              </button>
            </div>
          </div>
        </div>
        <div v-if="selectedProvince" class="overview-hero-calls">
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedProvince.assembly.control)">
            <span>Assembly Control</span>
            <strong>{{ selectedProvince.assembly.control.label }}</strong>
            <small>{{ selectedProvince.assembly.control.detail }}</small>
          </div>
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedProvince.prelates.control)">
            <span>Council Control</span>
            <strong>{{ selectedProvince.prelates.control.label }}</strong>
            <small>{{ selectedProvince.prelates.control.detail }}</small>
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
        :current-shares="selectedProvince?.assembly?.vote_shares"
        :baseline-shares="baselineSelectedProvince?.assembly?.vote_shares"
      />

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Province</p>
            <h3>{{ selectedProvince?.name }}</h3>
          </div>
          <label class="election-select">
            <span>Province</span>
            <select v-model.number="selectedIndex">
              <option v-for="province in provinceOptions" :key="province.provinceIndex" :value="province.provinceIndex">
                {{ province.name }}
              </option>
            </select>
          </label>
        </div>

        <div v-if="selectedProvince" class="election-summary-grid">
          <article class="election-summary-card election-summary-card--winner winner-control-card" :style="controlCardStyle(selectedProvince.assembly.control)">
            <span>{{ selectedLowerHouseName }}</span>
            <strong>{{ selectedProvince.assembly.control.label }}</strong>
            <small>{{ formatNumber(sumSeats(selectedProvince.assembly.seats)) }} assemblypersons</small>
          </article>
          <article class="election-summary-card election-summary-card--winner winner-control-card" :style="controlCardStyle(selectedProvince.prelates.control)">
            <span>{{ selectedUpperHouseName }}</span>
            <strong>{{ selectedProvince.prelates.control.label }}</strong>
            <small>{{ formatNumber(sumSeats(selectedProvince.prelates.seats)) }} prelates</small>
          </article>
          <article class="election-summary-card">
            <span>Counties</span>
            <strong>{{ selectedProvince.counties.length }}</strong>
            <small>{{ formatCompactNumber(selectedProvince.provincial_population) }} allocated</small>
          </article>
          <article class="election-summary-card election-summary-card--winner winner-control-card" :style="partyWinnerStyle(selectedPopularVoteLeader)">
            <span>Popular Vote Leader</span>
            <strong>{{ selectedPopularVoteLeaderName }}</strong>
            <small>{{ selectedPopularVoteLeaderShare }} · {{ selectedPopularVoteLeaderVotes }}</small>
          </article>
          <article class="election-summary-card">
            <span>Political Climate</span>
            <strong>{{ affectedTrends.length }}</strong>
            <small>active local trends</small>
          </article>
        </div>
      </section>

      <div class="election-dashboard-grid">
        <section class="election-panel">
          <div class="election-panel-heading">
            <div>
              <p class="eyebrow">Province-Wide Vote</p>
              <h3>{{ selectedLowerHouseName }}</h3>
            </div>
          </div>
          <ChamberComposition
            v-if="selectedProvince"
            :title="selectedLowerHouseName"
            eyebrow="Provincial Delegation"
            :seats="selectedProvince.assembly.seats"
            :control="selectedProvince.assembly.control"
            compact
          />
        </section>

        <section class="election-panel">
          <div class="election-panel-heading">
            <div>
              <p class="eyebrow">County-Weighted Vote</p>
              <h3>{{ selectedUpperHouseName }}</h3>
            </div>
          </div>
          <ChamberComposition
            v-if="selectedProvince"
            :title="selectedUpperHouseName"
            eyebrow="Provincial Delegation"
            :seats="selectedProvince.prelates.seats"
            :control="selectedProvince.prelates.control"
            compact
          />
        </section>
      </div>

      <section v-if="selectedProvince" class="election-panel">
        <PopularVoteBoard
          eyebrow="Province-Wide Vote"
          :title="`${selectedProvince.name} Popular Vote`"
          :rows="selectedPopularVoteRows"
          :total-votes="selectedProvince.provincial_population"
          :seat-columns="selectedProvinceSeatColumns"
        />
      </section>

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Province-By-Province Calls</p>
            <h3>Control Of Provincial Houses</h3>
          </div>
        </div>
        <div class="election-call-board election-call-board--provinces">
          <article
            v-for="province in provinceCallRows"
            :key="province.provinceIndex"
            class="election-call-card winner-control-card"
            :style="controlCardStyle(province.assembly.control)"
          >
            <div class="election-call-card-main">
              <strong>{{ province.name }}</strong>
              <span>{{ province.group }} · {{ formatCompactNumber(province.provincial_population) }}</span>
            </div>
            <div class="election-call-card-chambers">
              <div>
                <small>Assembly</small>
                <PartyBadge :party="province.assembly.control.leaderParty" short />
                <b>{{ province.assembly.control.label }}</b>
              </div>
              <div :style="controlCardStyle(province.prelates.control)">
                <small>Council</small>
                <PartyBadge :party="province.prelates.control.leaderParty" short />
                <b>{{ province.prelates.control.label }}</b>
              </div>
            </div>
          </article>
        </div>
      </section>



      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Feature Indices</p>
            <h3>Provincial Political Profile</h3>
          </div>
        </div>
        <div class="election-chart-shell election-chart-shell--compact">
          <ProvinceChart :option="featureRadarOption" aria-label="Province political feature radar" />
        </div>
      </section>

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">County Results</p>
            <h3>County Popular Vote Inputs</h3>
          </div>
        </div>
        <div class="election-table-wrap">
          <table class="election-table election-table--wide">
            <thead>
              <tr>
                <th>County</th>
                <th>Population</th>
                <th>Top Party</th>
                <th v-for="party in parties" :key="party">{{ party }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="county in countyRows" :key="county.tile_id" class="winner-table-row" :style="partyWinnerStyle(county.topParty)">
                <td>{{ county.name }}</td>
                <td>{{ formatNumber(county.county_population) }}</td>
                <td><PartyBadge :party="county.topParty" short /></td>
                <td v-for="party in parties" :key="`${county.tile_id}-${party}`">
                  <span class="vote-detail-cell">
                    <strong>{{ formatShare(county.vote_shares[party]) }}</strong>
                    <small>{{ formatNumber(county.popularVotes[party]) }}</small>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="affectedTrends.length" class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Active Trends</p>
            <h3>Matched Local Climate</h3>
          </div>
        </div>
        <div class="trend-chip-list">
          <span v-for="trend in affectedTrends" :key="trend.id" class="trend-chip">
            <PartyBadge :party="trend.party" short />
            {{ trend.label }}
          </span>
        </div>
      </section>
    </template>
  </section>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { BrainCircuit, Building2, FilePlus2, Radio } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import ChamberComposition from '../components/elections/ChamberComposition.vue'
import ElectionScenarioControls from '../components/elections/ElectionScenarioControls.vue'
import ElectionTickerCard from '../components/elections/ElectionTickerCard.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import PopularVoteBoard from '../components/elections/PopularVoteBoard.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useUiStore } from '../stores/uiStore'
import { formatCompactNumber, formatNumber } from '../domain/provinceVisualizations'
import { lowerHouseName, PARTIES, formatShare, trendHasMatchingEffect, upperHouseName, winnerControlStyle } from '../domain/elections'
import { provinceFeatureRadarOption } from '../domain/elections/charts/electionChartOptions'
import { partyWinnerStyle, popularVoteCount, sumSeats, topParty } from '../domain/elections/viewHelpers'

export default {
  name: 'ProvincialElectionResults',
  components: { BrainCircuit, Building2, ChamberComposition, ElectionScenarioControls, ElectionTickerCard, FilePlus2, PartyBadge, PopularVoteBoard, ProvinceChart, Radio },
  setup() {
    const uiStore = useUiStore()
    const selectedIndex = ref(0)
    const tickerRequestId = ref(0)
    const tickerScope = ref('provincial')
    const tickerTargetName = ref(null)
    const { baselineResults, electionStore, hasData, results, store } = useElectionResults()
    const provinceOptions = computed(() => results.value.provinces)
    const provinceCallRows = computed(() => [...results.value.provinces].sort((a, b) => b.provincial_population - a.provincial_population))
    const selectedProvince = computed(() => {
      return results.value.provinces.find((province) => province.provinceIndex === selectedIndex.value) || results.value.provinces[0] || null
    })
    const baselineSelectedProvince = computed(() => {
      return baselineResults.value.provinces.find((province) => province.provinceIndex === selectedIndex.value) || baselineResults.value.provinces[0] || null
    })
    const selectedLowerHouseName = computed(() => lowerHouseName('provincial', selectedProvince.value?.name))
    const selectedUpperHouseName = computed(() => upperHouseName('provincial', selectedProvince.value?.name))
    const featureRadarOption = computed(() => provinceFeatureRadarOption(selectedProvince.value))
    const selectedProvinceSeatColumns = [
      { key: 'assemblySeats', label: 'Assembly Seats' },
      { key: 'prelateSeats', label: 'Council Seats' },
    ]
    const selectedPopularVoteRows = computed(() => PARTIES.map((party) => ({
      party,
      voteShare: selectedProvince.value?.assembly?.vote_shares?.[party] || 0,
      voteCount: popularVoteCount(selectedProvince.value?.provincial_population, selectedProvince.value?.assembly?.vote_shares, party),
      assemblySeats: selectedProvince.value?.assembly?.seats?.[party] || 0,
      prelateSeats: selectedProvince.value?.prelates?.seats?.[party] || 0,
    })))
    const selectedPopularVoteLeader = computed(() => topParty(selectedProvince.value?.assembly?.vote_shares))
    const selectedPopularVoteLeaderName = computed(() => store.partyMeta[selectedPopularVoteLeader.value]?.name || selectedPopularVoteLeader.value)
    const selectedPopularVoteLeaderShare = computed(() => formatShare(selectedProvince.value?.assembly?.vote_shares?.[selectedPopularVoteLeader.value]))
    const selectedPopularVoteLeaderVotes = computed(() => formatCompactNumber(popularVoteCount(
      selectedProvince.value?.provincial_population,
      selectedProvince.value?.assembly?.vote_shares,
      selectedPopularVoteLeader.value
    )))
    const countyRows = computed(() => (selectedProvince.value?.counties || []).map((county) => ({
      ...county,
      name: county.name || county.tile_id || 'Unnamed county',
      topParty: topParty(county.vote_shares),
      popularVotes: Object.fromEntries(PARTIES.map((party) => [
        party,
        popularVoteCount(county.county_population, county.vote_shares, party),
      ])),
    })).sort((a, b) => Number(b.county_population || 0) - Number(a.county_population || 0)))
    const affectedTrends = computed(() => {
      if (!selectedProvince.value) return []
      return electionStore.trends.filter((trend) => {
        if (trendHasMatchingEffect(trend, selectedProvince.value, 'province')) return true
        return selectedProvince.value.counties.some((county) => trendHasMatchingEffect(trend, county, 'county'))
      })
    })

    const tickerKey = computed(() => [
      results.value.config.trendPackageId,
      results.value.config.seed,
      results.value.config.jitterSeed,
      selectedProvince.value?.provinceIndex ?? '',
    ].join('|'))

    function showElectionTicker(scope = 'provincial', targetName = selectedProvince.value?.name || null) {
      tickerScope.value = scope
      tickerTargetName.value = targetName
      tickerRequestId.value += 1
    }

    watch(provinceOptions, (provinces) => {
      if (!provinces.length) {
        selectedIndex.value = 0
        return
      }
      if (!provinces.some((province) => province.provinceIndex === selectedIndex.value)) {
        selectedIndex.value = provinces[0].provinceIndex
      }
    }, { immediate: true })

    return {
      affectedTrends,
      baselineSelectedProvince,
      controlCardStyle: (control) => winnerControlStyle(control, store.partyMeta),
      countyRows,
      featureRadarOption,
      formatCompactNumber,
      formatNumber,
      formatShare,
      hasData,
      partyWinnerStyle: (party) => partyWinnerStyle(party, store.partyMeta),
      parties: PARTIES,
      provinceOptions,
      provinceCallRows,
      results,
      selectedIndex,
      selectedLowerHouseName,
      selectedPopularVoteLeader,
      selectedPopularVoteLeaderName,
      selectedPopularVoteLeaderShare,
      selectedPopularVoteLeaderVotes,
      selectedPopularVoteRows,
      selectedProvinceSeatColumns,
      selectedProvince,
      selectedUpperHouseName,
      showElectionTicker,
      store,
      sumSeats,
      tickerKey,
      tickerRequestId,
      tickerScope,
      tickerTargetName,
      topParty,
      uiStore,
    }
  },
}
</script>

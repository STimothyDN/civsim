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
            <h2>{{ selectedRegion?.name || 'Regional' }} Decision Desk</h2>
            <p>{{ formatCompactNumber(totalRegionalPopulation) }} people · {{ regionRows.length }} regions · {{ formatNumber(totalRegionalAssemblySeats) }} assemblypersons</p>
            <label class="election-select">
              <span>Region</span>
              <select v-model="selectedRegionName">
                <option v-for="region in regionRows" :key="region.name" :value="region.name">{{ region.name }}</option>
              </select>
            </label>
            <div v-if="selectedRegion" class="overview-hero-actions">
              <button type="button" class="btn-broadcast-start" @click="uiStore.openElectionBroadcastModal('regional', selectedRegionName)">
                <Radio :size="16" />
                Start Regional Broadcast
                <BrainCircuit :size="13" class="broadcast-ai-mark" />
              </button>
              <button type="button" class="btn-broadcast-start" @click="showElectionTicker('regional', selectedRegion.name)">
                <Radio :size="16" />
                Show Election Ticker
                <BrainCircuit :size="13" class="broadcast-ai-mark" />
              </button>
            </div>
          </div>
        </div>
        <div v-if="selectedRegion" class="overview-hero-calls">
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedRegion.assembly.control)">
            <span>Assembly Control</span>
            <strong>{{ selectedRegion.assembly.control.label }}</strong>
            <small class="control-detail">{{ assemblyControlInfo?.leaderPartySeatCount }}/{{ assemblyControlInfo?.totalSeats || selectedRegion.assembly.control.detail }} seats won</small>
            <small v-if="assemblyControlInfo?.isMinority" class="leader-support-line">
              with support from <span v-html="formatListWithOxfordComma(assemblyControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
            </small>
            <small v-if="assemblyControlInfo?.isMinority" class="control-detail">{{ assemblyControlInfo.totalGovernmentSeats }}/{{ assemblyControlInfo.totalSeats }} seats total</small>
          </div>
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedRegion.prelates.control)">
            <span>Council Control</span>
            <strong>{{ selectedRegion.prelates.control.label }}</strong>
            <small class="control-detail">{{ councilControlInfo?.leaderPartySeatCount }}/{{ councilControlInfo?.totalSeats || selectedRegion.prelates.control.detail }} seats won</small>
            <small v-if="councilControlInfo?.isMinority" class="leader-support-line">
              with support from <span v-html="formatListWithOxfordComma(councilControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
            </small>
            <small v-if="councilControlInfo?.isMinority" class="control-detail">{{ councilControlInfo.totalGovernmentSeats }}/{{ councilControlInfo.totalSeats }} seats total</small>
          </div>
        </div>
        <div v-if="selectedRegion && (assemblyLeader || councilLeader)" class="overview-hero-calls">
          <div v-if="assemblyLeader" class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedRegion.assembly.control)">
            <span>Assembly Leader</span>
            <strong>{{ lowerHouseLeaderTitle('regional') }} {{ electionStore.getRepresentativeName(assemblyLeader.party, assemblyLeader.seatIndex + 5000) || '' }}</strong>
            <small class="leader-line">from {{ assemblyLeader.jurisdiction }} ({{ store.partyMeta[assemblyLeader.party]?.abbreviation || assemblyLeader.party }})</small>
            <small v-if="assemblySupportLeaders?.length" class="leader-support-line">
              with support from <span v-html="formatListWithOxfordComma(assemblySupportLeaders.map(formatSupportLeaderWithColor))"></span>
            </small>
          </div>
          <div v-if="councilLeader" class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedRegion.prelates.control)">
            <span>Council Leader</span>
            <strong>{{ upperHouseLeaderTitle('regional') }} {{ electionStore.getRepresentativeName(councilLeader.party, councilLeader.seatIndex + 7500) || '' }}</strong>
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

      <section v-if="selectedRegion" class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Regional Swing</p>
            <h3>{{ selectedRegion.name }} Party Shifts from Baseline</h3>
          </div>
        </div>
        <PartySwingCards
          :current-shares="selectedRegion.assembly.vote_shares"
          :baseline-shares="baselineResults.regions[selectedRegion.name]?.assembly?.vote_shares"
        />
      </section>

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Selected Region</p>
            <h3>{{ selectedRegion?.name || 'No Region' }}</h3>
          </div>
        </div>

        <div v-if="selectedRegion" class="election-summary-grid election-summary-grid--tight">
          <article class="election-summary-card election-summary-card--winner winner-control-card" :style="controlCardStyle(selectedRegion.assembly.control)">
            <span>Population</span>
            <strong>{{ formatCompactNumber(selectedRegion.population) }}</strong>
            <small>{{ selectedRegion.province_count }} provinces</small>
          </article>
          <article class="election-summary-card election-summary-card--winner winner-control-card" :style="controlCardStyle(selectedRegion.assembly.control)">
            <span>Assembly Control</span>
            <strong>{{ selectedRegion.assembly.control.label }}</strong>
            <small>{{ selectedLowerHouseName }} · {{ formatNumber(sumSeats(selectedRegion.assembly.seats)) }} assemblypersons</small>
          </article>
          <article class="election-summary-card election-summary-card--winner winner-control-card" :style="controlCardStyle(selectedRegion.prelates.control)">
            <span>Council Control</span>
            <strong>{{ selectedRegion.prelates.control.label }}</strong>
            <small>{{ selectedUpperHouseName }} · {{ formatNumber(sumSeats(selectedRegion.prelates.seats)) }} prelates</small>
          </article>
          <article class="election-summary-card election-summary-card--winner winner-control-card" :style="partyStyle(selectedPopularVoteLeader)">
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
            chamber-type="assembly"
            scope="regional"
            :provinces="results.provinces"
            :selected-region-name="selectedRegion.name"
            :jurisdiction-labels="regionalAssemblyJurisdictionLabels"
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
            chamber-type="prelates"
            scope="regional"
            :provinces="results.provinces"
            :selected-region-name="selectedRegion.name"
            :jurisdiction-labels="regionalCouncilJurisdictionLabels"
            compact
          />
        </section>
      </div>

      <div class="election-dashboard-grid">
        <CaucusListCard
          v-if="selectedRegion"
          title="Assembly Caucuses"
          eyebrow="Lower House Breakdown"
          :seats="selectedRegion.assembly.seats"
          :control="selectedRegion.assembly.control"
          chamber-type="assembly"
          scope="regional"
          :provinces="results.provinces"
          :selected-region-name="selectedRegion.name"
          :jurisdiction-labels="regionalAssemblyJurisdictionLabels"
        />
        <CaucusListCard
          v-if="selectedRegion"
          title="Council Caucuses"
          eyebrow="Upper House Breakdown"
          :seats="selectedRegion.prelates.seats"
          :control="selectedRegion.prelates.control"
          chamber-type="prelates"
          scope="regional"
          :provinces="results.provinces"
          :selected-region-name="selectedRegion.name"
          :jurisdiction-labels="regionalCouncilJurisdictionLabels"
        />
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

      <section v-if="selectedRegion" class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Feature Indices</p>
            <h3>Regional Political Profile</h3>
          </div>
        </div>
        <div class="election-chart-shell election-chart-shell--compact">
          <ProvinceChart :option="featureRadarOption" aria-label="Region political feature radar" />
        </div>
      </section>

      <section v-if="selectedRegion" class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Province Results</p>
            <h3>{{ selectedRegion.name }} Province-Level Returns</h3>
          </div>
        </div>
        <div class="election-table-wrap">
          <table class="election-table election-table--wide election-table--vote-detail">
            <thead>
              <tr>
                <th>Province</th>
                <th>Population</th>
                <th>Top Party</th>
                <th>Assembly Control</th>
                <th>Council Control</th>
                <th v-for="party in parties" :key="`region-province-vote-${party}`">{{ partyColumnLabel(party) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="province in provinceResultRows" :key="`${province.provinceIndex}-region-province`" class="winner-table-row" :style="controlCardStyle(province.assemblyControl)">
                <td>{{ province.name }}</td>
                <td>{{ formatNumber(province.population) }}</td>
                <td><PartyBadge :party="province.topParty" short /></td>
                <td>{{ province.assemblyControl.label }}</td>
                <td>{{ province.prelateControl.label }}</td>
                <td v-for="party in parties" :key="`${province.provinceIndex}-vote-${party}`">
                  <span class="vote-detail-cell">
                    <strong>{{ formatShare(province.voteShares[party]) }}</strong>
                    <small>{{ formatCompactNumber(province.popularVotes[party]) }}</small>
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
            <h3>Matched Regional Climate</h3>
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
import { BrainCircuit, FilePlus2, Map, Radio } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import ChamberComposition from '../components/elections/ChamberComposition.vue'
import CaucusListCard from '../components/elections/CaucusListCard.vue'
import ElectionTickerCard from '../components/elections/ElectionTickerCard.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import PartySwingCards from '../components/elections/PartySwingCards.vue'
import PopularVoteBoard from '../components/elections/PopularVoteBoard.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useElectionLeaders } from '../composables/useElectionLeaders'
import { useElectionFormatters } from '../composables/useElectionFormatters'
import { useElectionTicker } from '../composables/useElectionTicker'
import { useUiStore } from '../stores/uiStore'
import { formatCompactNumber, formatNumber } from '../domain/formatting'
import { lowerHouseName, PARTIES, formatShare, trendHasMatchingEffect, upperHouseName, lowerHouseLeaderTitle, upperHouseLeaderTitle } from '../domain/elections'
import { generateJurisdictionLabels, generateSeatDetails } from '../domain/elections/chambers/jurisdictionLabels'
import { regionFeatureRadarOption as buildRegionFeatureRadarOption } from '../domain/elections/charts/electionChartOptions'
import { orderRegionsByReference, popularVoteCount, sumSeats, topParty } from '../domain/elections/viewHelpers'

export default {
  name: 'RegionalElectionResults',
  components: { BrainCircuit, ChamberComposition, CaucusListCard, ElectionTickerCard, FilePlus2, Map, PartyBadge, PartySwingCards, PopularVoteBoard, ProvinceChart, Radio },
  setup() {
    const uiStore = useUiStore()
    const selectedRegionName = ref('')
    const { baselineResults, electionStore, hasData, results, store } = useElectionResults()
    const {
      controlCardStyle,
      formatListWithOxfordComma,
      formatSupportLeaderWithColor,
      formatSupportPartyWithColor,
      partyStyle,
    } = useElectionFormatters(store)

    const regionOrder = computed(() => store.currentData?.province_groups || [])
    const regionRows = computed(() => orderRegionsByReference(Object.values(results.value.regions), regionOrder.value))
    const selectedRegion = computed(() => results.value.regions[selectedRegionName.value] || regionRows.value[0] || null)
    const selectedRegionProvinces = computed(() => {
      if (!selectedRegion.value) return []
      return results.value.provinces
        .filter((province) => province.group === selectedRegion.value.name)
        .sort((a, b) => Number(b.provincial_population || 0) - Number(a.provincial_population || 0))
    })
    const selectedLowerHouseName = computed(() => lowerHouseName('regional', selectedRegion.value?.name))
    const selectedUpperHouseName = computed(() => upperHouseName('regional', selectedRegion.value?.name))

    // Jurisdiction labels
    const regionalAssemblyJurisdictionLabels = computed(() => generateJurisdictionLabels({
      seats: selectedRegion.value?.assembly?.seats,
      chamberType: 'assembly',
      scope: 'regional',
      provinces: results.value.provinces,
      selectedRegionName: selectedRegion.value?.name,
    }))
    const regionalCouncilJurisdictionLabels = computed(() => generateJurisdictionLabels({
      seats: selectedRegion.value?.prelates?.seats,
      chamberType: 'prelates',
      scope: 'regional',
      provinces: results.value.provinces,
      selectedRegionName: selectedRegion.value?.name,
    }))

    // Seat details for leaders
    const regionalAssemblySeatDetails = computed(() => generateSeatDetails({
      seats: selectedRegion.value?.assembly?.seats,
      chamberType: 'assembly',
      scope: 'regional',
      provinces: results.value.provinces,
      selectedRegionName: selectedRegion.value?.name,
    }))
    const regionalCouncilSeatDetails = computed(() => generateSeatDetails({
      seats: selectedRegion.value?.prelates?.seats,
      chamberType: 'prelates',
      scope: 'regional',
      provinces: results.value.provinces,
      selectedRegionName: selectedRegion.value?.name,
    }))

    // Assembly leaders & control (via shared composable)
    const {
      leader: assemblyLeader,
      controlInfo: assemblyControlInfo,
      supportLeaders: assemblySupportLeaders,
    } = useElectionLeaders({
      control: computed(() => selectedRegion.value?.assembly?.control),
      seatDetails: regionalAssemblySeatDetails,
      store,
      electionStore,
      seatIndexOffset: 5000,
      seatCount: computed(() => selectedRegion.value?.assembly?.seat_count || 0),
    })

    // Council leaders & control (via shared composable)
    const {
      leader: councilLeader,
      controlInfo: councilControlInfo,
      supportLeaders: councilSupportLeaders,
    } = useElectionLeaders({
      control: computed(() => selectedRegion.value?.prelates?.control),
      seatDetails: regionalCouncilSeatDetails,
      store,
      electionStore,
      seatIndexOffset: 7500,
      seatCount: computed(() => selectedRegion.value?.prelates?.seat_count || 0),
    })

    // Ticker (via shared composable)
    const selectedRegionNameRef = computed(() => selectedRegion.value?.name || '')
    const { showElectionTicker, tickerKey, tickerRequestId, tickerScope, tickerTargetName } =
      useElectionTicker({ results, defaultScope: 'regional', extraKeyParts: [selectedRegionNameRef] })

    // Page-specific data
    const featureRadarOption = computed(() => buildRegionFeatureRadarOption(selectedRegion.value, selectedRegionProvinces.value))
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
    const selectedPopularVoteLeaderName = computed(() => store.partyMeta[selectedPopularVoteLeader.value]?.name || selectedPopularVoteLeader.value)
    const selectedPopularVoteLeaderShare = computed(() => formatShare(selectedRegion.value?.assembly?.vote_shares?.[selectedPopularVoteLeader.value]))
    const selectedPopularVoteLeaderVotes = computed(() => formatCompactNumber(popularVoteCount(
      selectedRegion.value?.population,
      selectedRegion.value?.assembly?.vote_shares,
      selectedPopularVoteLeader.value
    )))
    const provinceResultRows = computed(() => selectedRegionProvinces.value.map((province) => {
      const leader = topParty(province.assembly.vote_shares)
      const popularVotes = Object.fromEntries(PARTIES.map((party) => [
        party,
        popularVoteCount(province.provincial_population, province.assembly.vote_shares, party),
      ]))
      return {
        provinceIndex: province.provinceIndex,
        name: province.name,
        population: province.provincial_population,
        topParty: leader,
        assemblyControl: province.assembly.control,
        prelateControl: province.prelates.control,
        voteShares: province.assembly.vote_shares,
        popularVotes,
      }
    }))
    const affectedTrends = computed(() => {
      if (!selectedRegion.value) return []
      return electionStore.trends.filter((trend) => selectedRegionProvinces.value.some((province) => {
        if (trendHasMatchingEffect(trend, province, 'province')) return true
        return province.counties.some((county) => trendHasMatchingEffect(trend, county, 'county'))
      }))
    })

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
      affectedTrends,
      baselineResults,
      controlCardStyle,
      featureRadarOption,
      formatCompactNumber,
      formatNumber,
      hasData,
      formatListWithOxfordComma,
      formatSupportLeaderWithColor,
      formatSupportPartyWithColor,
      formatShare,
      parties: PARTIES,
      partyColumnLabel: (party) => store.partyMeta[party]?.abbreviation || store.partyMeta[party]?.colorLabel || party,
      partyStyle,
      provinceResultRows,
      regionRows,
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
      regionalAssemblyJurisdictionLabels,
      regionalCouncilJurisdictionLabels,
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

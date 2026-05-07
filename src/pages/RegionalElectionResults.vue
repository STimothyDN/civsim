<template>
  <ElectionPageShell
    :icon="MapIcon"
    eyebrow="Regional Elections"
    :title="`${selectedRegion?.name || 'Regional'} Decision Desk`"
    :subtitle="selectedRegion ? `${formatCompactNumber(selectedRegion.population)} people · ${selectedRegion.province_count} provinces` : ''"
    scope="regional"
    :target-name="selectedRegion?.name"
  >
    <template v-if="selectedRegion" #hero-calls>
      <div class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedRegion.assembly.control)">
        <span>Assembly Control</span>
        <strong>{{ selectedRegion.assembly.control.label }}</strong>
        <small class="control-detail">{{ assemblyControlInfo?.leaderPartySeatCount }}/{{ assemblyControlInfo?.totalSeats || selectedRegion.assembly.control.detail }} seats won</small>
        <small v-if="assemblyControlInfo?.isMinority" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(assemblyControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
        </small>
      </div>
      <div class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedRegion.prelates.control)">
        <span>Council Control</span>
        <strong>{{ selectedRegion.prelates.control.label }}</strong>
        <small class="control-detail">{{ councilControlInfo?.leaderPartySeatCount }}/{{ councilControlInfo?.totalSeats || selectedRegion.prelates.control.detail }} seats won</small>
        <small v-if="councilControlInfo?.isMinority" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(councilControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
        </small>
      </div>
      <div v-if="assemblyLeader" class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedRegion.assembly.control)">
        <span>Assembly Leader</span>
        <strong>{{ lowerHouseLeaderTitle('regional') }} {{ electionStore.getRepresentativeName(assemblyLeader.party, assemblyLeader.seatIndex + SEAT_OFFSETS.regional.assembly) || '' }}</strong>
        <small class="leader-line">from {{ assemblyLeader.jurisdiction }} ({{ partyMeta[assemblyLeader.party]?.abbreviation || assemblyLeader.party }})</small>
        <small v-if="assemblySupportLeaders?.length" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(assemblySupportLeaders.map(formatSupportLeaderWithColor))"></span>
        </small>
      </div>
      <div v-if="councilLeader" class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedRegion.prelates.control)">
        <span>Council Leader</span>
        <strong>{{ upperHouseLeaderTitle('regional') }} {{ electionStore.getRepresentativeName(councilLeader.party, councilLeader.seatIndex + SEAT_OFFSETS.regional.prelates) || '' }}</strong>
        <small class="leader-line">from {{ councilLeader.jurisdiction }} ({{ partyMeta[councilLeader.party]?.abbreviation || councilLeader.party }})</small>
        <small v-if="councilSupportLeaders?.length" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(councilSupportLeaders.map(formatSupportLeaderWithColor))"></span>
        </small>
      </div>
    </template>

    <RegionSelectorPanel
      v-model="selectedRegionName"
      :regions="regionRows"
      :party-meta="partyMeta"
    />

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
        :baseline-shares="baselineShares"
      />
    </section>

    <div class="election-data-grid">
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

    <div class="election-data-grid">
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

    <div class="election-data-grid">
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

      <ProvinceScatterPlot
        v-if="selectedRegionProvinces.length > 1"
        :provinces="selectedRegionProvinces"
        :party-meta="partyMeta"
      />
    </div>

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
  </ElectionPageShell>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { Map as MapIcon } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import ChamberComposition from '../components/elections/ChamberComposition.vue'
import CaucusListCard from '../components/elections/CaucusListCard.vue'
import ElectionPageShell from '../components/elections/ElectionPageShell.vue'
import ElectionTickerCard from '../components/elections/ElectionTickerCard.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import PartySwingCards from '../components/elections/PartySwingCards.vue'
import PopularVoteBoard from '../components/elections/PopularVoteBoard.vue'
import RegionSelectorPanel from '../components/elections/RegionSelectorPanel.vue'
import ProvinceScatterPlot from '../components/elections/ProvinceScatterPlot.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useElectionLeaders } from '../composables/useElectionLeaders'
import { useElectionFormatters } from '../composables/useElectionFormatters'
import { useElectionTicker } from '../composables/useElectionTicker'
import { formatCompactNumber, formatNumber } from '../domain/formatting'
import { lowerHouseName, PARTIES, formatShare, trendHasMatchingEffect, upperHouseName, lowerHouseLeaderTitle, upperHouseLeaderTitle } from '../domain/elections'
import { SEAT_OFFSETS } from '../domain/elections/constants/seatOffsets'
import { generateJurisdictionLabels, generateSeatDetails } from '../domain/elections/chambers/jurisdictionLabels'
import { regionFeatureRadarOption as buildRegionFeatureRadarOption } from '../domain/elections/charts/electionChartOptions'
import { orderRegionsByReference, popularVoteCount, sumSeats, topParty } from '../domain/elections/viewHelpers'

export default {
  name: 'RegionalElectionResults',
  components: {
    ChamberComposition, CaucusListCard, ElectionPageShell, ElectionTickerCard,
    PartyBadge, PartySwingCards, PopularVoteBoard, ProvinceChart,
    RegionSelectorPanel, ProvinceScatterPlot,
  },
  setup() {
    const selectedRegionName = ref('')
    const { baselineResults, previousElectionResults, electionStore, partyMeta, results, store } = useElectionResults()
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
        .filter((p) => p.group === selectedRegion.value.name)
        .sort((a, b) => Number(b.provincial_population || 0) - Number(a.provincial_population || 0))
    })
    const selectedLowerHouseName = computed(() => lowerHouseName('regional', selectedRegion.value?.name))
    const selectedUpperHouseName = computed(() => upperHouseName('regional', selectedRegion.value?.name))

    const baselineShares = computed(() => {
      const name = selectedRegion.value?.name
      const source = electionStore.electionNumber > 0 ? previousElectionResults.value : baselineResults.value
      return source.regions[name]?.assembly?.vote_shares
    })

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

    const {
      leader: assemblyLeader,
      controlInfo: assemblyControlInfo,
      supportLeaders: assemblySupportLeaders,
    } = useElectionLeaders({
      control: computed(() => selectedRegion.value?.assembly?.control),
      seatDetails: regionalAssemblySeatDetails,
      store,
      electionStore,
      seatIndexOffset: SEAT_OFFSETS.regional.assembly,
      seatCount: computed(() => selectedRegion.value?.assembly?.seat_count || 0),
    })

    const {
      leader: councilLeader,
      controlInfo: councilControlInfo,
      supportLeaders: councilSupportLeaders,
    } = useElectionLeaders({
      control: computed(() => selectedRegion.value?.prelates?.control),
      seatDetails: regionalCouncilSeatDetails,
      store,
      electionStore,
      seatIndexOffset: SEAT_OFFSETS.regional.prelates,
      seatCount: computed(() => selectedRegion.value?.prelates?.seat_count || 0),
    })

    const selectedRegionNameRef = computed(() => selectedRegion.value?.name || '')
    const { showElectionTicker, tickerKey, tickerRequestId, tickerScope, tickerTargetName } =
      useElectionTicker({ results, defaultScope: 'regional', extraKeyParts: [selectedRegionNameRef] })

    const featureRadarOption = computed(() => buildRegionFeatureRadarOption(selectedRegion.value, selectedRegionProvinces.value))
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
      if (!regions.length) { selectedRegionName.value = ''; return }
      if (!regions.some((r) => r.name === selectedRegionName.value)) {
        selectedRegionName.value = regions[0].name
      }
    }, { immediate: true })

    return {
      affectedTrends,
      assemblyControlInfo,
      assemblyLeader,
      assemblySupportLeaders,
      baselineShares,
      controlCardStyle,
      councilControlInfo,
      councilLeader,
      councilSupportLeaders,
      electionStore,
      featureRadarOption,
      formatCompactNumber,
      formatListWithOxfordComma,
      formatNumber,
      formatShare,
      formatSupportLeaderWithColor,
      formatSupportPartyWithColor,
      lowerHouseLeaderTitle,
      MapIcon,
      partyMeta,
      parties: PARTIES,
      partyColumnLabel: (party) => partyMeta.value[party]?.abbreviation || partyMeta.value[party]?.colorLabel || party,
      partyStyle,
      provinceResultRows,
      regionRows,
      results,
      selectedLowerHouseName,
      selectedRegion,
      selectedRegionName,
      selectedRegionProvinces,
      selectedPopularVoteRows,
      selectedRegionSeatColumns,
      selectedUpperHouseName,
      SEAT_OFFSETS,
      store,
      sumSeats,
      tickerKey,
      tickerRequestId,
      tickerScope,
      tickerTargetName,
      upperHouseLeaderTitle,
    }
  },
}
</script>

<template>
  <ElectionPageShell
    :icon="Building2"
    eyebrow="Provincial Elections"
    :title="`${selectedProvince?.name || 'Provincial'} Returns Desk`"
    :subtitle="selectedProvince ? `${selectedProvince.name} · ${selectedProvince.group} · ${formatCompactNumber(selectedProvince.provincial_population)} subjects` : ''"
    scope="provincial"
    :target-name="selectedProvince?.name"
  >
    <template v-if="selectedProvince" #hero-calls>
      <div class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedProvince.assembly.control)">
        <span>Assembly Control</span>
        <strong>{{ selectedProvince.assembly.control.label }}</strong>
        <small class="control-detail">{{ assemblyControlInfo?.leaderPartySeatCount }}/{{ assemblyControlInfo?.totalSeats || selectedProvince.assembly.control.detail }} seats won</small>
        <small v-if="assemblyControlInfo?.isMinority" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(assemblyControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
        </small>
      </div>
      <div class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedProvince.prelates.control)">
        <span>Council Control</span>
        <strong>{{ selectedProvince.prelates.control.label }}</strong>
        <small class="control-detail">{{ councilControlInfo?.leaderPartySeatCount }}/{{ councilControlInfo?.totalSeats || selectedProvince.prelates.control.detail }} seats won</small>
        <small v-if="councilControlInfo?.isMinority" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(councilControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
        </small>
      </div>
      <div v-if="assemblyLeader" class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedProvince.assembly.control)">
        <span>Assembly Leader</span>
        <strong>
          {{ lowerHouseLeaderTitle('provincial') }} {{ electionStore.getRepresentativeName(assemblyLeader.party, assemblyLeader.seatIndex + SEAT_OFFSETS.provincial.assembly) || '' }}
          <IncumbencyBadge :party="assemblyLeader.party" :seat-index="assemblyLeader.seatIndex + SEAT_OFFSETS.provincial.assembly" />
        </strong>
        <small class="leader-line">from {{ assemblyLeader.jurisdiction }} ({{ partyMeta[assemblyLeader.party]?.abbreviation || assemblyLeader.party }})</small>
        <small v-if="assemblySupportLeaders?.length" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(assemblySupportLeaders.map(formatSupportLeaderWithColor))"></span>
        </small>
      </div>
      <div v-if="councilLeader" class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedProvince.prelates.control)">
        <span>Council Leader</span>
        <strong>
          {{ upperHouseLeaderTitle('provincial') }} {{ electionStore.getRepresentativeName(councilLeader.party, councilLeader.seatIndex + SEAT_OFFSETS.provincial.prelates) || '' }}
          <IncumbencyBadge :party="councilLeader.party" :seat-index="councilLeader.seatIndex + SEAT_OFFSETS.provincial.prelates" />
        </strong>
        <small class="leader-line">from {{ councilLeader.jurisdiction }} ({{ partyMeta[councilLeader.party]?.abbreviation || councilLeader.party }})</small>
        <small v-if="councilSupportLeaders?.length" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(councilSupportLeaders.map(formatSupportLeaderWithColor))"></span>
        </small>
      </div>
    </template>

    <ProvinceSelectorGrid
      v-model="selectedIndex"
      :provinces="provinceOptions"
      :party-meta="partyMeta"
    />

    <ElectionTickerCard
      :request-id="tickerRequestId"
      :scope="tickerScope"
      :target-name="tickerTargetName"
      :ticker-key="tickerKey"
    />

    <section v-if="selectedProvince" class="election-panel">
      <div class="election-panel-heading">
        <div>
          <p class="eyebrow">Provincial Swing</p>
          <h3>{{ selectedProvince.name }} Party Shifts from Baseline</h3>
        </div>
      </div>
      <PartySwingCards
        :current-shares="selectedProvince.assembly.vote_shares"
        :baseline-shares="baselineShares"
      />
    </section>

    <div class="election-data-grid">
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
          chamber-type="assembly"
          scope="provincial"
          :selected-province="selectedProvince"
          :jurisdiction-labels="provincialAssemblyJurisdictionLabels"
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
          chamber-type="prelates"
          scope="provincial"
          :selected-province="selectedProvince"
          :jurisdiction-labels="provincialCouncilJurisdictionLabels"
          compact
        />
      </section>
    </div>

    <div class="election-data-grid">
      <CaucusListCard
        v-if="selectedProvince"
        title="Assembly Caucuses"
        eyebrow="Lower House Breakdown"
        :seats="selectedProvince.assembly.seats"
        :control="selectedProvince.assembly.control"
        chamber-type="assembly"
        scope="provincial"
        :provinces="results.provinces"
        :selected-province="selectedProvince"
        :jurisdiction-labels="provincialAssemblyJurisdictionLabels"
      />
      <CaucusListCard
        v-if="selectedProvince"
        title="Council Caucuses"
        eyebrow="Upper House Breakdown"
        :seats="selectedProvince.prelates.seats"
        :control="selectedProvince.prelates.control"
        chamber-type="prelates"
        scope="provincial"
        :provinces="results.provinces"
        :selected-province="selectedProvince"
        :jurisdiction-labels="provincialCouncilJurisdictionLabels"
      />
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

    <CountyVoteGrid
      v-if="selectedProvince && selectedProvince.counties.length"
      :counties="selectedProvince.counties"
      :party-meta="partyMeta"
    />

    <CountyFeatureHeatmap
      v-if="selectedProvince && selectedProvince.counties.length"
      :counties="selectedProvince.counties"
    />

    <div class="election-data-grid">
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

      <FeatureCorrelationScatter
        v-if="selectedProvince && selectedProvince.counties.length > 2"
        :counties="selectedProvince.counties"
        :party-meta="partyMeta"
      />
    </div>

    <div class="election-data-grid">
      <CountyGeographyStrip
        v-if="selectedProvince && selectedProvince.counties.length"
        :counties="selectedProvince.counties"
      />

      <AdjacentProvinceCompare
        v-if="selectedProvince"
        :province="selectedProvince"
        :party-meta="partyMeta"
      />
    </div>

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
              <th v-for="party in parties" :key="party">{{ partyColumnLabel(party) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="county in countyRows" :key="county.tile_id" class="winner-table-row" :style="partyStyle(county.topParty)">
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
  </ElectionPageShell>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { Building2 } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import ChamberComposition from '../components/elections/ChamberComposition.vue'
import CaucusListCard from '../components/elections/CaucusListCard.vue'
import ElectionPageShell from '../components/elections/ElectionPageShell.vue'
import ElectionTickerCard from '../components/elections/ElectionTickerCard.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import IncumbencyBadge from '../components/elections/IncumbencyBadge.vue'
import PartySwingCards from '../components/elections/PartySwingCards.vue'
import PopularVoteBoard from '../components/elections/PopularVoteBoard.vue'
import ProvinceSelectorGrid from '../components/elections/ProvinceSelectorGrid.vue'
import CountyVoteGrid from '../components/elections/CountyVoteGrid.vue'
import CountyFeatureHeatmap from '../components/elections/CountyFeatureHeatmap.vue'
import CountyGeographyStrip from '../components/elections/CountyGeographyStrip.vue'
import FeatureCorrelationScatter from '../components/elections/FeatureCorrelationScatter.vue'
import AdjacentProvinceCompare from '../components/elections/AdjacentProvinceCompare.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useElectionLeaders } from '../composables/useElectionLeaders'
import { useElectionFormatters } from '../composables/useElectionFormatters'
import { useElectionTicker } from '../composables/useElectionTicker'
import { formatCompactNumber, formatNumber } from '../domain/formatting'
import { PARTIES, formatShare, trendHasMatchingEffect } from '../domain/elections'
import { useChamberLabels } from '../composables/useChamberLabels'
import { SEAT_OFFSETS } from '../domain/elections/constants/seatOffsets'
import { generateJurisdictionLabels, generateSeatDetails } from '../domain/elections/chambers/jurisdictionLabels'
import { provinceFeatureRadarOption } from '../domain/elections/charts/electionChartOptions'
import { popularVoteCount, topParty } from '../domain/elections/viewHelpers'

export default {
  name: 'ProvincialElectionResults',
  components: {
    AdjacentProvinceCompare, Building2, ChamberComposition, CaucusListCard,
    CountyFeatureHeatmap, CountyGeographyStrip, CountyVoteGrid,
    ElectionPageShell, ElectionTickerCard, FeatureCorrelationScatter,
    PartyBadge, IncumbencyBadge, PartySwingCards, PopularVoteBoard, ProvinceChart,
    ProvinceSelectorGrid,
  },
  setup() {
    const { lowerHouseName, upperHouseName, lowerHouseLeaderTitle, upperHouseLeaderTitle } = useChamberLabels()
    const selectedIndex = ref(0)
    const { baselineResults, previousElectionResults, electionStore, partyMeta, results, store } = useElectionResults()
    const {
      controlCardStyle,
      formatListWithOxfordComma,
      formatSupportLeaderWithColor,
      formatSupportPartyWithColor,
      partyStyle,
    } = useElectionFormatters(store)

    const provinceOptions = computed(() => results.value.provinces)
    const selectedProvince = computed(() =>
      results.value.provinces.find((p) => p.provinceIndex === selectedIndex.value) || results.value.provinces[0] || null
    )
    const selectedLowerHouseName = computed(() => lowerHouseName('provincial', selectedProvince.value?.name))
    const selectedUpperHouseName = computed(() => upperHouseName('provincial', selectedProvince.value?.name))

    const baselineShares = computed(() => {
      const idx = selectedProvince.value?.provinceIndex
      const source = electionStore.electionNumber > 0 ? previousElectionResults.value : baselineResults.value
      return source.provinces.find((p) => p.provinceIndex === idx)?.assembly?.vote_shares
    })

    const provincialAssemblyJurisdictionLabels = computed(() => generateJurisdictionLabels({
      seats: selectedProvince.value?.assembly?.seats,
      chamberType: 'assembly',
      scope: 'provincial',
      selectedProvince: selectedProvince.value,
    }))
    const provincialCouncilJurisdictionLabels = computed(() => generateJurisdictionLabels({
      seats: selectedProvince.value?.prelates?.seats,
      chamberType: 'prelates',
      scope: 'provincial',
      selectedProvince: selectedProvince.value,
    }))

    const provincialAssemblySeatDetails = computed(() => generateSeatDetails({
      seats: selectedProvince.value?.assembly?.seats,
      chamberType: 'assembly',
      scope: 'provincial',
      selectedProvince: selectedProvince.value,
    }))
    const provincialCouncilSeatDetails = computed(() => generateSeatDetails({
      seats: selectedProvince.value?.prelates?.seats,
      chamberType: 'prelates',
      scope: 'provincial',
      selectedProvince: selectedProvince.value,
    }))

    const {
      leader: assemblyLeader,
      controlInfo: assemblyControlInfo,
      supportLeaders: assemblySupportLeaders,
    } = useElectionLeaders({
      control: computed(() => selectedProvince.value?.assembly?.control),
      seatDetails: provincialAssemblySeatDetails,
      store,
      electionStore,
      seatIndexOffset: SEAT_OFFSETS.provincial.assembly,
      seatCount: computed(() => selectedProvince.value?.assembly?.seat_count || 0),
    })

    const {
      leader: councilLeader,
      controlInfo: councilControlInfo,
      supportLeaders: councilSupportLeaders,
    } = useElectionLeaders({
      control: computed(() => selectedProvince.value?.prelates?.control),
      seatDetails: provincialCouncilSeatDetails,
      store,
      electionStore,
      seatIndexOffset: SEAT_OFFSETS.provincial.prelates,
      seatCount: computed(() => selectedProvince.value?.prelates?.seat_count || 0),
    })

    const selectedProvinceIndexRef = computed(() => selectedProvince.value?.provinceIndex ?? '')
    const { showElectionTicker, tickerKey, tickerRequestId, tickerScope, tickerTargetName } =
      useElectionTicker({ results, defaultScope: 'provincial', extraKeyParts: [selectedProvinceIndexRef] })

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

    watch(provinceOptions, (provinces) => {
      if (!provinces.length) { selectedIndex.value = 0; return }
      if (!provinces.some((p) => p.provinceIndex === selectedIndex.value)) {
        selectedIndex.value = provinces[0].provinceIndex
      }
    }, { immediate: true })

    return {
      affectedTrends,
      assemblyControlInfo,
      assemblyLeader,
      assemblySupportLeaders,
      baselineShares,
      Building2,
      controlCardStyle,
      councilControlInfo,
      councilLeader,
      councilSupportLeaders,
      countyRows,
      electionStore,
      featureRadarOption,
      formatCompactNumber,
      formatListWithOxfordComma,
      formatNumber,
      formatShare,
      formatSupportLeaderWithColor,
      formatSupportPartyWithColor,
      lowerHouseLeaderTitle,
      partyMeta,
      parties: PARTIES,
      partyColumnLabel: (party) => partyMeta.value[party]?.abbreviation || partyMeta.value[party]?.colorLabel || party,
      partyStyle,
      provinceOptions,
      provincialAssemblyJurisdictionLabels,
      provincialCouncilJurisdictionLabels,
      results,
      SEAT_OFFSETS,
      selectedIndex,
      selectedLowerHouseName,
      selectedPopularVoteRows,
      selectedProvince,
      selectedProvinceSeatColumns,
      selectedUpperHouseName,
      store,
      tickerKey,
      tickerRequestId,
      tickerScope,
      tickerTargetName,
      topParty,
      upperHouseLeaderTitle,
    }
  },
}
</script>

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
            <h2>{{ selectedProvince?.name || 'Provincial' }} Decision Desk</h2>
            <p>{{ selectedProvince?.name }} · {{ selectedProvince?.group }} · {{ formatCompactNumber(selectedProvince?.provincial_population) }} people</p>
            <label class="election-select">
              <span>Province</span>
              <select v-model.number="selectedIndex">
                <option v-for="province in provinceOptions" :key="province.provinceIndex" :value="province.provinceIndex">
                  {{ province.name }}
                </option>
              </select>
            </label>
            <div v-if="selectedProvince" class="overview-hero-actions">
              <button type="button" class="btn-broadcast-start" @click="uiStore.openElectionBroadcastModal('provincial', selectedProvince.name)">
                <Radio :size="16" />
                Start Provincial Broadcast
                <BrainCircuit :size="13" class="broadcast-ai-mark" />
              </button>
              <button type="button" class="btn-broadcast-start" @click="showElectionTicker('provincial', selectedProvince.name)">
                <Radio :size="16" />
                Show Election Ticker
                <BrainCircuit :size="13" class="broadcast-ai-mark" />
              </button>
            </div>
          </div>
        </div>
        <div v-if="selectedProvince" class="overview-hero-calls">
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedProvince.assembly.control)">
            <span>Assembly Control</span>
            <strong>{{ selectedProvince.assembly.control.label }}</strong>
            <small class="control-detail">{{ assemblyControlInfo?.leaderPartySeatCount }}/{{ assemblyControlInfo?.totalSeats || selectedProvince.assembly.control.detail }} seats won</small>
            <small v-if="assemblyControlInfo?.isMinority" class="leader-support-line">
              with support from <span v-html="formatListWithOxfordComma(assemblyControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
            </small>
            <small v-if="assemblyControlInfo?.isMinority" class="control-detail">{{ assemblyControlInfo.totalGovernmentSeats }}/{{ assemblyControlInfo.totalSeats }} seats total</small>
          </div>
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedProvince.prelates.control)">
            <span>Council Control</span>
            <strong>{{ selectedProvince.prelates.control.label }}</strong>
            <small class="control-detail">{{ councilControlInfo?.leaderPartySeatCount }}/{{ councilControlInfo?.totalSeats || selectedProvince.prelates.control.detail }} seats won</small>
            <small v-if="councilControlInfo?.isMinority" class="leader-support-line">
              with support from <span v-html="formatListWithOxfordComma(councilControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
            </small>
            <small v-if="councilControlInfo?.isMinority" class="control-detail">{{ councilControlInfo.totalGovernmentSeats }}/{{ councilControlInfo.totalSeats }} seats total</small>
          </div>
        </div>
        <div v-if="selectedProvince && (assemblyLeader || councilLeader)" class="overview-hero-calls">
          <div v-if="assemblyLeader" class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedProvince.assembly.control)">
            <span>Assembly Leader</span>
            <strong>{{ lowerHouseLeaderTitle('provincial') }} {{ electionStore.getRepresentativeName(assemblyLeader.party, assemblyLeader.seatIndex + 10000) || '' }}</strong>
            <small class="leader-line">from {{ assemblyLeader.jurisdiction }} ({{ store.partyMeta[assemblyLeader.party]?.abbreviation || assemblyLeader.party }})</small>
            <small v-if="assemblySupportLeaders?.length" class="leader-support-line">
              with support from <span v-html="formatListWithOxfordComma(assemblySupportLeaders.map(formatSupportLeaderWithColor))"></span>
            </small>
          </div>
          <div v-if="councilLeader" class="overview-hero-call winner-control-card" :style="controlCardStyle(selectedProvince.prelates.control)">
            <span>Council Leader</span>
            <strong>{{ upperHouseLeaderTitle('provincial') }} {{ electionStore.getRepresentativeName(councilLeader.party, councilLeader.seatIndex + 12500) || '' }}</strong>
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

      <section v-if="selectedProvince" class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Provincial Swing</p>
            <h3>{{ selectedProvince.name }} Party Shifts from Baseline</h3>
          </div>
        </div>
        <PartySwingCards
          :current-shares="selectedProvince.assembly.vote_shares"
          :baseline-shares="baselineResults.provinces.find(p => p.provinceIndex === selectedProvince.provinceIndex)?.assembly?.vote_shares"
        />
      </section>

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Province</p>
            <h3>{{ selectedProvince?.name }}</h3>
          </div>
        </div>

        <div v-if="selectedProvince" class="election-summary-grid">
          <article class="election-summary-card election-summary-card--winner winner-control-card" :style="controlCardStyle(selectedProvince.assembly.control)">
            <span>Assembly Control</span>
            <strong>{{ selectedProvince.assembly.control.label }}</strong>
            <small>{{ selectedLowerHouseName }} · {{ formatNumber(sumSeats(selectedProvince.assembly.seats)) }} assemblypersons</small>
          </article>
          <article class="election-summary-card election-summary-card--winner winner-control-card" :style="controlCardStyle(selectedProvince.prelates.control)">
            <span>Council Control</span>
            <strong>{{ selectedProvince.prelates.control.label }}</strong>
            <small>{{ selectedUpperHouseName }} · {{ formatNumber(sumSeats(selectedProvince.prelates.seats)) }} prelates</small>
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

      <div class="election-dashboard-grid">
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
                <th v-for="party in parties" :key="party">{{ partyColumnLabel(party) }}</th>
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
import CaucusListCard from '../components/elections/CaucusListCard.vue'
import ElectionTickerCard from '../components/elections/ElectionTickerCard.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import PartySwingCards from '../components/elections/PartySwingCards.vue'
import PopularVoteBoard from '../components/elections/PopularVoteBoard.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useUiStore } from '../stores/uiStore'
import { formatCompactNumber, formatNumber } from '../domain/provinceVisualizations'
import { lowerHouseName, PARTIES, formatShare, trendHasMatchingEffect, upperHouseName, lowerHouseLeaderTitle, upperHouseLeaderTitle, winnerControlStyle } from '../domain/elections'
import { generateJurisdictionLabels, generateSeatDetails } from '../domain/elections/chambers/jurisdictionLabels'
import { provinceFeatureRadarOption } from '../domain/elections/charts/electionChartOptions'
import { partyWinnerStyle, popularVoteCount, sumSeats, topParty } from '../domain/elections/viewHelpers'
import { usePollingStore } from '../stores/pollingStore'

export default {
  name: 'ProvincialElectionResults',
  components: { BrainCircuit, Building2, ChamberComposition, CaucusListCard, ElectionTickerCard, FilePlus2, PartyBadge, PartySwingCards, PopularVoteBoard, ProvinceChart, Radio },
  setup() {
    const uiStore = useUiStore()
    const pollingStore = usePollingStore()
    const selectedIndex = ref(0)
    const tickerRequestId = ref(0)
    const tickerScope = ref('provincial')
    const tickerTargetName = ref(null)
    const { baselineResults, electionStore, hasData, results, store } = useElectionResults()
    const provinceOptions = computed(() => results.value.provinces)
    const selectedProvince = computed(() => {
      return results.value.provinces.find((province) => province.provinceIndex === selectedIndex.value) || results.value.provinces[0] || null
    })
    const selectedLowerHouseName = computed(() => lowerHouseName('provincial', selectedProvince.value?.name))
    const selectedUpperHouseName = computed(() => upperHouseName('provincial', selectedProvince.value?.name))

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

    // Generate seat details to find leaders
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

    // Find leaders (highest support in governing party)
    const assemblyLeader = computed(() => {
      const leaderParty = selectedProvince.value?.assembly?.control?.leaderParty
      if (!leaderParty) return null
      const partySeats = provincialAssemblySeatDetails.value.filter((s) => s.party === leaderParty)
      if (partySeats.length === 0) return null
      const leader = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
      return leader
    })

    const councilLeader = computed(() => {
      const leaderParty = selectedProvince.value?.prelates?.control?.leaderParty
      if (!leaderParty) return null
      const partySeats = provincialCouncilSeatDetails.value.filter((s) => s.party === leaderParty)
      if (partySeats.length === 0) return null
      const leader = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
      return leader
    })

    // Get control party seat count and support info for Assembly
    const assemblyControlInfo = computed(() => {
      const control = selectedProvince.value?.assembly?.control
      const leaderParty = control?.leaderParty
      if (!leaderParty) return null
      
      const partySeats = provincialAssemblySeatDetails.value.filter((s) => s.party === leaderParty)
      const leaderPartySeatCount = partySeats.length
      const totalSeats = selectedProvince.value?.assembly?.seat_count || 0
      
      const supportParties = control?.supportParties || []
      const supportInfo = supportParties.map(party => {
        const seats = provincialAssemblySeatDetails.value.filter((s) => s.party === party).length
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
      const control = selectedProvince.value?.prelates?.control
      const leaderParty = control?.leaderParty
      if (!leaderParty) return null
      
      const partySeats = provincialCouncilSeatDetails.value.filter((s) => s.party === leaderParty)
      const leaderPartySeatCount = partySeats.length
      const totalSeats = selectedProvince.value?.prelates?.seat_count || 0
      
      const supportParties = control?.supportParties || []
      const supportInfo = supportParties.map(party => {
        const seats = provincialCouncilSeatDetails.value.filter((s) => s.party === party).length
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
      const control = selectedProvince.value?.assembly?.control
      const leaderParty = control?.leaderParty
      if (!leaderParty) return []
      
      const leaders = []
      
      // Add support party caucus leaders for minority governments
      const supportParties = control?.supportParties || []
      supportParties.forEach(party => {
        const partySeats = provincialAssemblySeatDetails.value.filter((s) => s.party === party)
        if (partySeats.length === 0) return
        const leader = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
        const name = electionStore.getRepresentativeName(party, leader.seatIndex + 10000)
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
      const control = selectedProvince.value?.prelates?.control
      const leaderParty = control?.leaderParty
      if (!leaderParty) return []
      
      const leaders = []
      
      // Add support party caucus leaders for minority governments
      const supportParties = control?.supportParties || []
      supportParties.forEach(party => {
        const partySeats = provincialCouncilSeatDetails.value.filter((s) => s.party === party)
        if (partySeats.length === 0) return
        const leader = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
        const name = electionStore.getRepresentativeName(party, leader.seatIndex + 12500)
        leaders.push({
          party,
          name: name || store.partyMeta[party]?.abbreviation || party,
          title: 'Caucus Leader',
          jurisdiction: leader.jurisdiction,
        })
      })
      
      return leaders
    })

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
      pollingStore.pollSeed,
    ].join('|'))

    function showElectionTicker(scope = 'provincial', targetName = selectedProvince.value?.name || null) {
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

    function formatSupportPartyWithColor(party) {
      return `<span style="color: ${party.color}">${party.name}</span> (${party.seatCount})`
    }

    function formatSupportLeaderWithColor(leader) {
      const partyColor = store.partyMeta[leader.party]?.color || '#d4a843'
      return `${leader.title} <span style="color: ${partyColor}">${leader.name}</span> from ${leader.jurisdiction} (<span style="color: ${partyColor}">${store.partyMeta[leader.party]?.abbreviation || leader.party}</span>)`
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
      baselineResults,
      controlCardStyle: (control) => winnerControlStyle(control, store.partyMeta),
      countyRows,
      featureRadarOption,
      formatCompactNumber,
      formatNumber,
      formatShare,
      hasData,
      partyWinnerStyle: (party) => partyWinnerStyle(party, store.partyMeta),
      parties: PARTIES,
      partyColumnLabel: (party) => store.partyMeta[party]?.abbreviation || store.partyMeta[party]?.colorLabel || party,
      provinceOptions,
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
      provincialAssemblyJurisdictionLabels,
      provincialCouncilJurisdictionLabels,
      assemblyLeader,
      councilLeader,
      assemblySupportLeaders,
      councilSupportLeaders,
      assemblyControlInfo,
      councilControlInfo,
      electionStore,
      formatListWithOxfordComma,
      formatSupportPartyWithColor,
      formatSupportLeaderWithColor,
      lowerHouseLeaderTitle,
      upperHouseLeaderTitle,
    }
  },
}
</script>

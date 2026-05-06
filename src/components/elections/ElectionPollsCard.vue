<template>
  <section class="election-panel election-polls-card">
    <div class="election-polls-header">
      <div>
        <p class="eyebrow">Election Polls</p>
        <h3>Concord of Pollsters</h3>
      </div>
      <div class="election-polls-controls">
        <div class="poll-scope-toggle" role="tablist" aria-label="Polling scope">
          <button
            v-for="scope in scopeOptions"
            :key="scope.value"
            type="button"
            :class="{ 'poll-scope-toggle--active': pollingStore.view === scope.value }"
            @click="pollingStore.setView(scope.value)"
          >
            {{ scope.label }}
          </button>
        </div>
        <label v-if="pollingStore.view === 'regional'" class="election-select poll-scope-select">
          <span>Region</span>
          <select v-model="selectedRegionName">
            <option v-for="scope in regionalScopes" :key="scope.scopeKey" :value="scope.scopeKey">
              {{ scope.scopeLabel }}
            </option>
          </select>
        </label>
        <label v-if="pollingStore.view === 'provincial'" class="election-select poll-scope-select">
          <span>Province</span>
          <select v-model.number="selectedProvinceIndex">
            <option v-for="scope in provincialScopes" :key="scope.scopeKey" :value="Number(scope.scopeKey)">
              {{ scope.scopeLabel }}
            </option>
          </select>
        </label>
        <button type="button" class="btn-primary" @click="pollingStore.randomizePolls">
          <RefreshCcw :size="16" />
          Re-roll polls
        </button>
        <button type="button" class="btn-broadcast-start" @click="uiStore.openPollBreakdownModal">
          <Radio :size="16" />
          Start Poll Breakdown
          <BrainCircuit :size="13" class="broadcast-ai-mark" />
        </button>
      </div>
    </div>

    <div v-if="currentScope" class="poll-aggregate-banner winner-control-card" :style="partyWinnerStyle(aggregateLeader)">
      <div>
        <span>{{ currentScope.scopeLabel }}</span>
        <strong>
          <PartyBadge :party="aggregateLeader" />
          leads at {{ formatShare(currentScope.aggregate.voteShares[aggregateLeader]) }}
        </strong>
      </div>
      <div>
        <span>Projected Assembly</span>
        <strong>{{ formatNumber(currentScope.aggregate.seats.assembly[aggregateLeader] || 0) }} seats</strong>
      </div>
      <div>
        <span>Spread</span>
        <strong>{{ leaderSpreadLabel }}</strong>
      </div>
    </div>

    <div v-if="currentScope" class="overview-hero-calls">
      <div class="overview-hero-call winner-control-card" :style="controlCardStyle(projectedAssemblyControl)">
        <span>Projected Assembly Control</span>
        <strong>{{ projectedAssemblyControl.label }}</strong>
        <small class="control-detail">{{ projectedAssemblyControlInfo?.leaderPartySeatCount }}/{{ projectedAssemblyControlInfo?.totalSeats || projectedAssemblyControl.detail }} seats projected</small>
        <small v-if="projectedAssemblyControlInfo?.isMinority" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(projectedAssemblyControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
        </small>
        <small v-if="projectedAssemblyControlInfo?.isMinority" class="control-detail">{{ projectedAssemblyControlInfo.totalGovernmentSeats }}/{{ projectedAssemblyControlInfo.totalSeats }} seats total</small>
      </div>
      <div class="overview-hero-call winner-control-card" :style="controlCardStyle(projectedCouncilControl)">
        <span>Projected Council Control</span>
        <strong>{{ projectedCouncilControl.label }}</strong>
        <small class="control-detail">{{ projectedCouncilControlInfo?.leaderPartySeatCount }}/{{ projectedCouncilControlInfo?.totalSeats || projectedCouncilControl.detail }} seats projected</small>
        <small v-if="projectedCouncilControlInfo?.isMinority" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(projectedCouncilControlInfo.supportInfo.map(formatSupportPartyWithColor))"></span>
        </small>
        <small v-if="projectedCouncilControlInfo?.isMinority" class="control-detail">{{ projectedCouncilControlInfo.totalGovernmentSeats }}/{{ projectedCouncilControlInfo.totalSeats }} seats total</small>
      </div>
    </div>

    <div v-if="currentScope" class="overview-hero-calls">
      <div class="overview-hero-call winner-control-card" :style="controlCardStyle(projectedAssemblyControl)">
        <span>Projected Assembly Leader</span>
        <strong v-if="projectedAssemblyLeader">{{ lowerHouseLeaderTitle(currentScope.scope) }} {{ electionStore.getRepresentativeName(projectedAssemblyLeader.party, getSeatIndexOffset('assembly', currentScope.scope) + projectedAssemblyLeader.seatIndex) || '' }}</strong>
        <strong v-else>{{ lowerHouseLeaderTitle(currentScope.scope) }} {{ formStore.partyMeta[projectedAssemblyControl.leaderParty]?.name || projectedAssemblyControl.leaderParty }}</strong>
        <small v-if="projectedAssemblyLeader" class="leader-line">from {{ projectedAssemblyLeader.jurisdiction }} ({{ formStore.partyMeta[projectedAssemblyLeader.party]?.abbreviation || projectedAssemblyLeader.party }})</small>
        <small v-else class="leader-line">Projected leading party</small>
        <small v-if="projectedAssemblySupportLeaders?.length" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(projectedAssemblySupportLeaders.map(formatSupportLeaderWithColor))"></span>
        </small>
      </div>
      <div class="overview-hero-call winner-control-card" :style="controlCardStyle(projectedCouncilControl)">
        <span>Projected Council Leader</span>
        <strong v-if="projectedCouncilLeader">{{ upperHouseLeaderTitle(currentScope.scope) }} {{ electionStore.getRepresentativeName(projectedCouncilLeader.party, getSeatIndexOffset('prelates', currentScope.scope) + projectedCouncilLeader.seatIndex) || '' }}</strong>
        <strong v-else>{{ upperHouseLeaderTitle(currentScope.scope) }} {{ formStore.partyMeta[projectedCouncilControl.leaderParty]?.name || projectedCouncilControl.leaderParty }}</strong>
        <small v-if="projectedCouncilLeader" class="leader-line">from {{ projectedCouncilLeader.jurisdiction }} ({{ formStore.partyMeta[projectedCouncilLeader.party]?.abbreviation || projectedCouncilLeader.party }})</small>
        <small v-else class="leader-line">Projected leading party</small>
        <small v-if="projectedCouncilSupportLeaders?.length" class="leader-support-line">
          with support from <span v-html="formatListWithOxfordComma(projectedCouncilSupportLeaders.map(formatSupportLeaderWithColor))"></span>
        </small>
      </div>
    </div>

    <div v-if="currentScope" class="pollster-grid">
      <article
        v-for="pollster in currentScope.pollsters"
        :key="pollster.id"
        class="pollster-card winner-control-card"
        :style="partyWinnerStyle(pollster.leader)"
      >
        <div class="pollster-card-header">
          <div>
            <p class="eyebrow">{{ pollster.tagline }}</p>
            <h4>{{ pollster.name }}</h4>
          </div>
          <div class="pollster-card-tools">
            <span class="poll-methodology-tip">
              <button
                type="button"
                class="poll-info-button"
                :aria-label="`${pollster.name} methodology`"
              >
                <Info :size="14" />
              </button>
              <span class="poll-methodology-tooltip" role="tooltip">{{ pollster.methodology }}</span>
            </span>
            <button
              type="button"
              class="poll-compare-toggle"
              :class="{ 'poll-compare-toggle--active': pollingStore.comparePollsters.includes(pollster.id) }"
              @click="pollingStore.togglePollsterCompare(pollster.id)"
            >
              <GitCompare :size="14" />
              Compare
            </button>
          </div>
        </div>

        <div class="pollster-leader">
          <span>Leader</span>
          <PartyBadge :party="pollster.leader" />
          <strong>{{ formatShare(pollster.voteShares[pollster.leader]) }}</strong>
        </div>

        <div class="pollster-party-board">
          <div class="pollster-party-board-head">
            <span>Party</span>
            <span></span>
            <span>Vote</span>
            <span>Asm</span>
            <span>Council</span>
          </div>
          <div v-for="party in pollsterParties(pollster)" :key="`${pollster.id}-${party}`" class="pollster-party-row">
            <PartyBadge :party="party" abbreviated />
            <div class="pollster-party-track">
              <i :style="{ width: `${Math.max(4, pollster.voteShares[party] * 100)}%`, backgroundColor: partyColor(party) }"></i>
            </div>
            <strong>{{ formatShare(pollster.voteShares[party]) }}</strong>
            <span class="pollster-seat-chip">{{ formatNumber(pollster.seats.assembly[party] || 0) }}</span>
            <span class="pollster-seat-chip">{{ formatNumber(pollster.seats.prelates[party] || 0) }}</span>
          </div>
        </div>

        <div class="pollster-seat-grid">
          <div>
            <span>Asm Total</span>
            <strong>{{ formatNumber(sumSeats(pollster.seats.assembly)) }}</strong>
          </div>
          <div>
            <span>Council Total</span>
            <strong>{{ formatNumber(sumSeats(pollster.seats.prelates)) }}</strong>
          </div>
          <div>
            <span>MoE</span>
            <strong>±{{ (pollster.marginOfError * 100).toFixed(1) }}%</strong>
          </div>
          <div>
            <span>House Effect</span>
            <strong>{{ houseEffectLabel(pollster) }}</strong>
          </div>
        </div>
      </article>
    </div>

    <section v-if="selectedPollsters.length >= 2 && currentScope" class="poll-comparison">
      <div class="election-panel-heading">
        <div>
          <p class="eyebrow">Comparison</p>
          <h3>Pollster Crosscheck</h3>
        </div>
      </div>
      <div class="election-table-wrap">
        <table class="election-table election-table--wide poll-comparison-table">
          <thead>
            <tr>
              <th>Party</th>
              <th v-for="pollster in selectedPollsters" :key="`head-${pollster.id}`">{{ pollster.name }}</th>
              <th>Aggregate</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="party in parties" :key="`compare-${party}`">
              <td><PartyBadge :party="party" /></td>
              <td v-for="pollster in selectedPollsters" :key="`${pollster.id}-${party}`">
                <span class="poll-comparison-cell">
                  <strong>{{ formatShare(pollster.voteShares[party]) }} ±{{ (pollster.marginOfError * 100).toFixed(1) }}</strong>
                  <small>{{ formatNumber(pollster.seats.assembly[party] || 0) }} A · {{ seatDelta(pollster, party) }}</small>
                </span>
              </td>
              <td>
                <span class="poll-comparison-cell">
                  <strong>{{ formatShare(currentScope.aggregate.voteShares[party]) }}</strong>
                  <small>{{ formatNumber(currentScope.aggregate.seats.assembly[party] || 0) }} A · poll-of-polls</small>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script>
import { computed, watch } from 'vue'
import { BrainCircuit, GitCompare, Info, Radio, RefreshCcw } from 'lucide-vue-next'
import { usePolls } from '../../composables/usePolls'
import { useElectionResults } from '../../composables/useElectionResults'
import { PARTIES, formatShare, determineHouseControl, lowerHouseLeaderTitle, upperHouseLeaderTitle, winnerControlStyle } from '../../domain/elections'
import { generateSeatDetails } from '../../domain/elections/chambers/jurisdictionLabels'
import { formatNumber } from '../../domain/provinceVisualizations'
import { partyWinnerStyle, sumSeats, topParty } from '../../domain/elections/viewHelpers'
import { useFormStore } from '../../stores/formStore'
import { useUiStore } from '../../stores/uiStore'
import { useElectionStore } from '../../stores/electionStore'
import PartyBadge from './PartyBadge.vue'

export default {
  name: 'ElectionPollsCard',
  components: { BrainCircuit, GitCompare, Info, PartyBadge, Radio, RefreshCcw },
  setup() {
    const formStore = useFormStore()
    const uiStore = useUiStore()
    const electionStore = useElectionStore()
    const { currentScope, pollingStore, provincialScopes, regionalScopes } = usePolls()
    const { results } = useElectionResults()
    const scopeOptions = [
      { value: 'national', label: 'National' },
      { value: 'regional', label: 'Regional' },
      { value: 'provincial', label: 'Provincial' },
    ]

    const selectedRegionName = computed({
      get: () => pollingStore.regionName || regionalScopes.value[0]?.scopeKey || '',
      set: (value) => pollingStore.selectRegion(value),
    })
    const selectedProvinceIndex = computed({
      get: () => Number(pollingStore.provinceIndex ?? provincialScopes.value[0]?.scopeKey ?? 0),
      set: (value) => pollingStore.selectProvince(value),
    })
    const aggregateLeader = computed(() => currentScope.value?.aggregate?.leader || topParty(currentScope.value?.aggregate?.voteShares))
    const leaderSpreadLabel = computed(() => {
      const leader = aggregateLeader.value
      const spread = currentScope.value?.aggregate?.spread?.voteShareRangePct?.[leader]
      if (!spread) return 'steady'
      return `${spread.min}%–${spread.max}%`
    })
    const selectedPollsters = computed(() => {
      const selected = new Set(pollingStore.comparePollsters)
      return (currentScope.value?.pollsters || []).filter((pollster) => selected.has(pollster.id))
    })

    // Get projected seats from poll-of-polls for current scope
    const projectedAssemblySeats = computed(() => {
      return currentScope.value?.aggregate?.seats?.assembly || {}
    })

    const projectedCouncilSeats = computed(() => {
      return currentScope.value?.aggregate?.seats?.prelates || {}
    })

    // Calculate projected control using the same logic as actual results
    const projectedAssemblyControl = computed(() => {
      const partyNames = Object.fromEntries(
        Object.keys(formStore.partyMeta).map((key) => [key, formStore.partyMeta[key]?.name || key])
      )
      return determineHouseControl(projectedAssemblySeats.value, results.value.config.trends, partyNames)
    })

    const projectedCouncilControl = computed(() => {
      const partyNames = Object.fromEntries(
        Object.keys(formStore.partyMeta).map((key) => [key, formStore.partyMeta[key]?.name || key])
      )
      return determineHouseControl(projectedCouncilSeats.value, results.value.config.trends, partyNames)
    })

    // Get control info for display
    const projectedAssemblyControlInfo = computed(() => {
      const control = projectedAssemblyControl.value
      const leaderParty = control?.leaderParty
      if (!leaderParty) return null
      
      const leaderPartySeatCount = projectedAssemblySeats.value[leaderParty] || 0
      const totalSeats = Object.values(projectedAssemblySeats.value).reduce((sum, val) => sum + (val || 0), 0)
      
      const supportParties = control?.supportParties || []
      const supportInfo = supportParties.map(party => {
        const seats = projectedAssemblySeats.value[party] || 0
        return {
          party,
          name: formStore.partyMeta[party]?.abbreviation || party,
          color: formStore.partyMeta[party]?.color || '#d4a843',
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

    const projectedCouncilControlInfo = computed(() => {
      const control = projectedCouncilControl.value
      const leaderParty = control?.leaderParty
      if (!leaderParty) return null
      
      const leaderPartySeatCount = projectedCouncilSeats.value[leaderParty] || 0
      const totalSeats = Object.values(projectedCouncilSeats.value).reduce((sum, val) => sum + (val || 0), 0)
      
      const supportParties = control?.supportParties || []
      const supportInfo = supportParties.map(party => {
        const seats = projectedCouncilSeats.value[party] || 0
        return {
          party,
          name: formStore.partyMeta[party]?.abbreviation || party,
          color: formStore.partyMeta[party]?.color || '#d4a843',
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

    // Generate seat details from actual election results to find projected leaders
    // We use actual representatives running in the election, but project which one would be leader
    // based on which party is projected to win control
    // For regional/provincial scopes, we use national seat details with selectedRegionName/selectedProvince
    const actualAssemblySeatDetails = computed(() => {
      const scope = currentScope.value?.scope
      if (!scope) return []
      
      let seatDetails = []
      
      if (scope === 'national') {
        seatDetails = generateSeatDetails({
          seats: results.value.national.assembly.seats,
          chamberType: 'assembly',
          scope: 'national',
          provinces: results.value.provinces,
        })
      } else if (scope === 'regional') {
        const region = results.value.regions[currentScope.value.scopeKey]
        if (!region) return []
        // For regional scope, use regional assembly seats
        seatDetails = generateSeatDetails({
          seats: region.assembly.seats,
          chamberType: 'assembly',
          scope: 'regional',
          provinces: results.value.provinces,
          selectedRegionName: region.name,
        })
      } else if (scope === 'provincial') {
        const provinceIndex = Number(currentScope.value.scopeKey)
        const province = results.value.provinces[provinceIndex]
        if (!province) return []
        // For provincial scope, use provincial assembly seats
        seatDetails = generateSeatDetails({
          seats: province.assembly.seats,
          chamberType: 'assembly',
          scope: 'provincial',
          provinces: results.value.provinces,
          selectedProvince: province,
        })
      }
      
      return seatDetails
    })

    const actualCouncilSeatDetails = computed(() => {
      const scope = currentScope.value?.scope
      if (!scope) return []
      
      let seatDetails = []
      
      if (scope === 'national') {
        seatDetails = generateSeatDetails({
          seats: results.value.national.prelates.seats,
          chamberType: 'prelates',
          scope: 'national',
          provinces: results.value.provinces,
        })
      } else if (scope === 'regional') {
        const region = results.value.regions[currentScope.value.scopeKey]
        if (!region) return []
        // For regional scope, use regional prelate seats
        seatDetails = generateSeatDetails({
          seats: region.prelates.seats,
          chamberType: 'prelates',
          scope: 'regional',
          provinces: results.value.provinces,
          selectedRegionName: region.name,
        })
      } else if (scope === 'provincial') {
        const provinceIndex = Number(currentScope.value.scopeKey)
        const province = results.value.provinces[provinceIndex]
        if (!province) return []
        // For provincial scope, use provincial prelate seats
        seatDetails = generateSeatDetails({
          seats: province.prelates.seats,
          chamberType: 'prelates',
          scope: 'provincial',
          provinces: results.value.provinces,
          selectedProvince: province,
        })
      }
      
      return seatDetails
    })

    // Find projected leaders based on projected leading party and actual representatives
    const projectedAssemblyLeader = computed(() => {
      const leaderParty = projectedAssemblyControl.value?.leaderParty
      if (!leaderParty) return null
      
      // Filter actual representatives to only those from the projected leading party
      const partySeats = actualAssemblySeatDetails.value.filter((s) => s.party === leaderParty)
      if (partySeats.length === 0) return null
      
      // Find the one with highest support metric (most likely to be leader)
      const leader = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
      return leader
    })

    const projectedCouncilLeader = computed(() => {
      const leaderParty = projectedCouncilControl.value?.leaderParty
      if (!leaderParty) return null
      
      // Filter actual representatives to only those from the projected leading party
      const partySeats = actualCouncilSeatDetails.value.filter((s) => s.party === leaderParty)
      if (partySeats.length === 0) return null
      
      // Find the one with highest support metric (most likely to be leader)
      const leader = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
      return leader
    })

    // Get projected caucus leaders for support parties in minority governments
    const projectedAssemblySupportLeaders = computed(() => {
      const control = projectedAssemblyControl.value
      const leaderParty = control?.leaderParty
      if (!leaderParty) return []
      
      const leaders = []
      const scope = currentScope.value?.scope
      
      // Add support party caucus leaders for projected minority governments
      const supportParties = control?.supportParties || []
      supportParties.forEach(party => {
        const partySeats = actualAssemblySeatDetails.value.filter((s) => s.party === party)
        if (partySeats.length === 0) return
        const leader = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
        const name = electionStore.getRepresentativeName(party, getSeatIndexOffset('assembly', scope) + leader.seatIndex)
        leaders.push({
          party,
          name: name || formStore.partyMeta[party]?.abbreviation || party,
          title: 'Caucus Leader',
          jurisdiction: leader.jurisdiction,
        })
      })
      
      return leaders
    })

    const projectedCouncilSupportLeaders = computed(() => {
      const control = projectedCouncilControl.value
      const leaderParty = control?.leaderParty
      if (!leaderParty) return []
      
      const leaders = []
      const scope = currentScope.value?.scope
      
      // Add support party caucus leaders for projected minority governments
      const supportParties = control?.supportParties || []
      supportParties.forEach(party => {
        const partySeats = actualCouncilSeatDetails.value.filter((s) => s.party === party)
        if (partySeats.length === 0) return
        const leader = partySeats.sort((a, b) => b.supportMetric - a.supportMetric)[0]
        const name = electionStore.getRepresentativeName(party, getSeatIndexOffset('prelates', scope) + leader.seatIndex)
        leaders.push({
          party,
          name: name || formStore.partyMeta[party]?.abbreviation || party,
          title: 'Caucus Leader',
          jurisdiction: leader.jurisdiction,
        })
      })
      
      return leaders
    })

    function partyColor(party) {
      return formStore.partyMeta[party]?.color || '#9b9a97'
    }

    function pollsterParties(pollster = {}) {
      const shares = pollster.voteShares || {}
      const seats = pollster.seats?.assembly || {}
      return [...PARTIES].sort((a, b) => (
        Number(shares[b] || 0) - Number(shares[a] || 0) ||
        Number(seats[b] || 0) - Number(seats[a] || 0) ||
        PARTIES.indexOf(a) - PARTIES.indexOf(b)
      ))
    }

    function houseEffectLabel(pollster) {
      if (!pollster.houseEffect?.party || !pollster.houseEffect?.points) return 'Neutral'
      const name = formStore.partyMeta[pollster.houseEffect.party]?.name || pollster.houseEffect.party
      return `+${pollster.houseEffect.points.toFixed(1)} ${name}`
    }

    function seatDelta(pollster, party) {
      const delta = Number(pollster.seats?.assembly?.[party] || 0) - Number(currentScope.value?.aggregate?.seats?.assembly?.[party] || 0)
      if (delta === 0) return 'even'
      return `${delta > 0 ? '+' : ''}${delta} vs aggregate`
    }

    function controlCardStyle(control) {
      return winnerControlStyle(control, formStore.partyMeta)
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

    function formatSupportPartyWithColorSimple(party) {
      const color = formStore.partyMeta[party]?.color || '#d4a843'
      const name = formStore.partyMeta[party]?.abbreviation || party
      return `<span style="color: ${color}">${name}</span>`
    }

    function formatSupportLeaderWithColor(leader) {
      const partyColor = formStore.partyMeta[leader.party]?.color || '#d4a843'
      return `${leader.title} <span style="color: ${partyColor}">${leader.name}</span> from ${leader.jurisdiction} (<span style="color: ${partyColor}">${formStore.partyMeta[leader.party]?.abbreviation || leader.party}</span>)`
    }

    function getSeatIndexOffset(chamberType, scope) {
      // Seat index offsets based on scope and chamber type
      // National: assembly = 0, prelates = 2500
      // Regional: assembly = 5000, prelates = 7500
      // Provincial: assembly = 10000, prelates = 12500
      if (scope === 'national') {
        return chamberType === 'prelates' ? 2500 : 0
      }
      if (scope === 'regional') {
        return chamberType === 'prelates' ? 7500 : 5000
      }
      if (scope === 'provincial') {
        return chamberType === 'prelates' ? 12500 : 10000
      }
      return 0
    }

    watch(regionalScopes, (scopes) => {
      if (!scopes.length) return
      if (!scopes.some((scope) => scope.scopeKey === pollingStore.regionName)) {
        pollingStore.regionName = scopes[0].scopeKey
      }
    }, { immediate: true })

    watch(provincialScopes, (scopes) => {
      if (!scopes.length) return
      if (!scopes.some((scope) => Number(scope.scopeKey) === Number(pollingStore.provinceIndex))) {
        pollingStore.provinceIndex = Number(scopes[0].scopeKey)
      }
    }, { immediate: true })

    return {
      aggregateLeader,
      controlCardStyle,
      currentScope,
      electionStore,
      formatListWithOxfordComma,
      formatNumber,
      formatShare,
      formatSupportLeaderWithColor,
      formatSupportPartyWithColor,
      formatSupportPartyWithColorSimple,
      formStore,
      getSeatIndexOffset,
      houseEffectLabel,
      leaderSpreadLabel,
      lowerHouseLeaderTitle,
      parties: PARTIES,
      partyColor,
      partyWinnerStyle: (party) => partyWinnerStyle(party, formStore.partyMeta),
      pollingStore,
      projectedAssemblyControl,
      projectedAssemblyControlInfo,
      projectedAssemblyLeader,
      projectedAssemblySupportLeaders,
      projectedCouncilControl,
      projectedCouncilControlInfo,
      projectedCouncilLeader,
      projectedCouncilSupportLeaders,
      provincialScopes,
      regionalScopes,
      scopeOptions,
      seatDelta,
      selectedPollsters,
      selectedProvinceIndex,
      selectedRegionName,
      sumSeats,
      pollsterParties,
      uiStore,
      upperHouseLeaderTitle,
    }
  },
}
</script>

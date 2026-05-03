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

        <div class="pollster-top-list">
          <div v-for="party in topParties(pollster.voteShares)" :key="`${pollster.id}-${party}`" class="pollster-party-row">
            <PartyBadge :party="party" abbreviated />
            <div class="pollster-party-track">
              <i :style="{ width: `${Math.max(4, pollster.voteShares[party] * 100)}%`, backgroundColor: partyColor(party) }"></i>
            </div>
            <strong>{{ formatShare(pollster.voteShares[party]) }}</strong>
          </div>
        </div>

        <div class="pollster-seat-grid">
          <div>
            <span>Assembly</span>
            <strong>{{ formatNumber(sumSeats(pollster.seats.assembly)) }}</strong>
          </div>
          <div>
            <span>Council</span>
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
import { GitCompare, Info, RefreshCcw } from 'lucide-vue-next'
import { usePolls } from '../../composables/usePolls'
import { PARTIES, formatShare } from '../../domain/elections'
import { formatNumber } from '../../domain/provinceVisualizations'
import { partyWinnerStyle, sumSeats, topParty } from '../../domain/elections/viewHelpers'
import { useFormStore } from '../../stores/formStore'
import PartyBadge from './PartyBadge.vue'

export default {
  name: 'ElectionPollsCard',
  components: { GitCompare, Info, PartyBadge, RefreshCcw },
  setup() {
    const formStore = useFormStore()
    const { currentScope, pollingStore, provincialScopes, regionalScopes } = usePolls()
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

    function partyColor(party) {
      return formStore.partyMeta[party]?.color || '#9b9a97'
    }

    function topParties(shares = {}) {
      return [...PARTIES].sort((a, b) => Number(shares[b] || 0) - Number(shares[a] || 0)).slice(0, 3)
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
      currentScope,
      formatNumber,
      formatShare,
      houseEffectLabel,
      leaderSpreadLabel,
      parties: PARTIES,
      partyColor,
      partyWinnerStyle: (party) => partyWinnerStyle(party, formStore.partyMeta),
      pollingStore,
      provincialScopes,
      regionalScopes,
      scopeOptions,
      seatDelta,
      selectedPollsters,
      selectedProvinceIndex,
      selectedRegionName,
      sumSeats,
      topParties,
    }
  },
}
</script>

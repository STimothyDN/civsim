<template>
  <section class="election-control-panel">
    <div class="election-scenario-main">
      <div class="election-scenario-copy">
        <p class="eyebrow">
          {{ electionStore.hasPendingElection
            ? `Previewing Election ${electionStore.electionYear + 2}`
            : electionStore.electionNumber > 0
              ? `Election ${electionStore.electionYear} · Confirmed`
              : 'Election Climate' }}
        </p>
        <h3>{{ electionStore.scenarioName }}</h3>
        <p v-if="electionStore.scenarioDescription" class="election-scenario-description">
          {{ electionStore.scenarioDescription }}
        </p>
        <div class="election-seed-row">
          <span>Seed {{ electionStore.seed }}</span>
          <span>Jitter {{ electionStore.jitterSeed }}</span>
        </div>
      </div>
      <div class="election-control-actions">
        <button type="button" class="btn-primary" @click="randomizeElectionClimate">
          <Shuffle :size="16" />
          Randomize Election Climate
        </button>
        <button
          type="button"
          class="btn-primary"
          :disabled="!electionStore.hasPendingElection"
          @click="electionStore.confirmElection"
        >
          <CheckCircle :size="16" />
          Confirm Election {{ electionStore.electionYear + 2 }}
        </button>
        <button type="button" :disabled="electionStore.electionNumber === 0 && !electionStore.hasPendingElection" @click="electionStore.resetScenario">
          <RotateCcw :size="16" />
          Reset to {{ electionStore.electionYear }} Baseline
        </button>
      </div>
    </div>

    <div class="trend-chip-list">
      <span v-if="!electionStore.trends.length" class="trend-chip trend-chip--baseline">Baseline climate</span>
      <template v-for="(roundTrends, i) in electionStore.trendHistory" :key="`confirmed-${i}`">
        <span class="trend-chip trend-chip--round-label">{{ 2026 + i * 2 }} →</span>
        <span
          v-for="trend in roundTrends"
          :key="trend.id"
          class="trend-chip"
          @mouseenter="showTrendDetail(trend, $event)"
          @mouseleave="hideTrendDetail"
        >
          <PartyBadge :party="trend.party" short />
          {{ trend.label }}
        </span>
      </template>
      <template v-if="electionStore.pendingTrends.length">
        <span class="trend-chip trend-chip--round-label trend-chip--pending">{{ electionStore.electionYear + 2 }} preview →</span>
        <span
          v-for="trend in electionStore.pendingTrends"
          :key="trend.id"
          class="trend-chip trend-chip--pending"
          @mouseenter="showTrendDetail(trend, $event)"
          @mouseleave="hideTrendDetail"
        >
          <PartyBadge :party="trend.party" short />
          {{ trend.label }}
        </span>
      </template>
    </div>

    <TrendDetailModal ref="trendDetailModalRef" />

    <div v-if="partyShifts.length" class="party-shift-list">
      <div v-for="shift in partyShifts" :key="shift.party" class="party-shift-card" :style="shift.style">
        <PartyBadge :party="shift.party" short />
        <strong>{{ shift.shiftFormatted }}</strong>
      </div>
    </div>

    <div class="election-control-ai-footer">
      <LlmStatusIndicator
        v-if="isNamingScenario && llmStatus"
        :status="llmStatus"
        title="Climate Naming"
        variant="compact"
      />
      <button
        type="button"
        class="btn-ai"
        :disabled="isNamingScenario || !electionStore.hasPendingElection"
        @click="generateClimateDescription"
      >
        <Loader2 v-if="isNamingScenario" class="election-spin" :size="14" />
        <BrainCircuit v-else :size="14" />
        {{ isNamingScenario ? 'Generating...' : 'Generate Climate Description' }}
      </button>
    </div>
  </section>
</template>

<script>
import { computed, ref } from 'vue'
import { BrainCircuit, CheckCircle, Loader2, RotateCcw, Shuffle } from 'lucide-vue-next'
import { useCivilizationStore } from '../../stores/civilizationStore'
import { useElectionStore } from '../../stores/electionStore'
import { useFormStore } from '../../stores/formStore'
import { useUiStore } from '../../stores/uiStore'
import { PARTIES } from '../../domain/elections'
import { requestElectionClimateSummary } from '../../domain/elections/narrativePlanner'
import LlmStatusIndicator from './LlmStatusIndicator.vue'
import { climateLlmStatus } from './llmStatusCopy'
import PartyBadge from './PartyBadge.vue'
import TrendDetailModal from './TrendDetailModal.vue'

export default {
  name: 'ElectionScenarioControls',
  components: { BrainCircuit, CheckCircle, LlmStatusIndicator, Loader2, PartyBadge, RotateCcw, Shuffle, TrendDetailModal },
  props: {
    currentShares: { type: Object, default: () => ({}) },
    baselineShares: { type: Object, default: () => ({}) },
    previousShares: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const civStore = useCivilizationStore()
    const electionStore = useElectionStore()
    const formStore = useFormStore()
    const uiStore = useUiStore()
    const llmStatus = ref(null)
    const trendDetailModalRef = ref(null)
    const isNamingScenario = computed(() => electionStore.scenarioMetadataStatus === 'loading')

    const partyShifts = computed(() => {
      if (electionStore.isBaseline) return []
      const refShares = electionStore.electionNumber > 0 ? props.previousShares : props.baselineShares
      return PARTIES.map((party) => {
        const current = Number(props.currentShares?.[party] || 0)
        const baseline = Number(refShares?.[party] || 0)
        const diff = current - baseline
        return {
          party,
          diff,
          shiftFormatted: `${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)}%`,
          style: {
            '--shift-color': civStore.partyMeta[party]?.color || '#888',
            '--shift-bg': `${civStore.partyMeta[party]?.color || '#888'}15`,
            '--shift-border': `${civStore.partyMeta[party]?.color || '#888'}40`,
          },
        }
      }).filter((p) => Math.abs(p.diff) >= 0.0005).sort((a, b) => b.diff - a.diff)
    })

    function randomizeElectionClimate() {
      electionStore.randomizeScenario()
    }

    async function generateClimateDescription() {
      const trendPackageId = electionStore.trendPackageId
      electionStore.setScenarioMetadataLoading(trendPackageId)
      llmStatus.value = null

      try {
        const metadata = await requestElectionClimateSummary({
          trends: electionStore.trends,
          seed: electionStore.seed,
          data: formStore.currentData,
          onStatus: (status) => {
            llmStatus.value = climateLlmStatus(status)
          },
        })
        electionStore.applyScenarioMetadata(metadata, trendPackageId)
      } catch (error) {
        electionStore.setScenarioMetadataError(error.message, trendPackageId)
        uiStore.showToast('Scenario description could not be generated.', 'error')
      }
    }

    function showTrendDetail(trend, event) {
      trendDetailModalRef.value?.showTrend(trend, event)
    }

    function hideTrendDetail() {
      trendDetailModalRef.value?.hideTrend()
    }

    return { electionStore, generateClimateDescription, isNamingScenario, llmStatus, partyShifts, randomizeElectionClimate, showTrendDetail, hideTrendDetail, trendDetailModalRef }
  },
}
</script>

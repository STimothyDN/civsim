<template>
  <section class="election-control-panel">
    <div class="election-scenario-main">
      <div class="election-scenario-copy">
        <p class="eyebrow">Election Climate</p>
        <h3>{{ electionStore.scenarioName }}</h3>
        <p v-if="electionStore.scenarioDescription" class="election-scenario-description">
          {{ electionStore.scenarioDescription }}
        </p>
        <div class="election-seed-row">
          <span>Seed {{ electionStore.seed }}</span>
          <span>Jitter {{ electionStore.jitterSeed }}</span>
        </div>
        <LlmStatusIndicator
          v-if="isNamingScenario && llmStatus"
          :status="llmStatus"
          title="Climate Naming"
          variant="compact"
        />
      </div>
      <div class="election-control-actions">
        <button type="button" class="btn-primary" :disabled="isNamingScenario" @click="randomizeElectionClimate">
          <Loader2 v-if="isNamingScenario" class="election-spin" :size="16" />
          <Shuffle v-else :size="16" />
          {{ isNamingScenario ? 'Naming Climate' : 'Randomize Election Climate' }}
        </button>
        <button type="button" :disabled="electionStore.isBaseline" @click="electionStore.resetScenario">
          <RotateCcw :size="16" />
          Reset
        </button>
      </div>
    </div>

    <div class="trend-chip-list">
      <span v-if="!electionStore.trends.length" class="trend-chip trend-chip--baseline">Baseline climate</span>
      <span v-for="trend in electionStore.trends" :key="trend.id" class="trend-chip" :title="trend.narrative?.reason || trend.description">
        <PartyBadge :party="trend.party" short />
        {{ trend.label }}
      </span>
    </div>

    <div v-if="partyShifts.length" class="party-shift-list">
      <div v-for="shift in partyShifts" :key="shift.party" class="party-shift-card" :style="shift.style">
        <PartyBadge :party="shift.party" short />
        <strong>{{ shift.shiftFormatted }}</strong>
      </div>
    </div>
  </section>
</template>

<script>
import { computed, ref } from 'vue'
import { Loader2, RotateCcw, Shuffle } from 'lucide-vue-next'
import { useElectionStore } from '../../stores/electionStore'
import { useFormStore } from '../../stores/formStore'
import { useUiStore } from '../../stores/uiStore'
import { PARTIES } from '../../domain/elections'
import { requestElectionClimateSummary } from '../../domain/elections/narrativePlanner'
import LlmStatusIndicator from './LlmStatusIndicator.vue'
import { climateLlmStatus } from './llmStatusCopy'
import PartyBadge from './PartyBadge.vue'

export default {
  name: 'ElectionScenarioControls',
  components: { LlmStatusIndicator, Loader2, PartyBadge, RotateCcw, Shuffle },
  props: {
    currentShares: { type: Object, default: () => ({}) },
    baselineShares: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const electionStore = useElectionStore()
    const formStore = useFormStore()
    const uiStore = useUiStore()
    const llmStatus = ref(null)
    const isNamingScenario = computed(() => electionStore.scenarioMetadataStatus === 'loading')

    const partyShifts = computed(() => {
      if (electionStore.isBaseline) return []
      return PARTIES.map((party) => {
        const current = Number(props.currentShares?.[party] || 0)
        const baseline = Number(props.baselineShares?.[party] || 0)
        const diff = current - baseline
        return {
          party,
          diff,
          shiftFormatted: `${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)}%`,
          style: {
            '--shift-color': formStore.partyMeta[party]?.color || '#888',
            '--shift-bg': `${formStore.partyMeta[party]?.color || '#888'}15`,
            '--shift-border': `${formStore.partyMeta[party]?.color || '#888'}40`,
          },
        }
      }).filter((p) => Math.abs(p.diff) >= 0.0005).sort((a, b) => b.diff - a.diff)
    })

    async function randomizeElectionClimate() {
      const packageDef = electionStore.randomizeScenario()
      const trendPackageId = packageDef.trendPackageId

      electionStore.setScenarioMetadataLoading(trendPackageId)
      llmStatus.value = null

      try {
        const metadata = await requestElectionClimateSummary({
          trends: packageDef.trends,
          seed: packageDef.seed,
          data: formStore.currentData,
          onStatus: (status) => {
            llmStatus.value = climateLlmStatus(status)
          },
        })
        electionStore.applyScenarioMetadata(metadata, trendPackageId)
      } catch (error) {
        electionStore.setScenarioMetadataError(error.message, trendPackageId)
        uiStore.showToast('Election climate randomized; scenario description could not be generated.', 'error')
      }
    }

    return { electionStore, isNamingScenario, llmStatus, partyShifts, randomizeElectionClimate }
  },
}
</script>

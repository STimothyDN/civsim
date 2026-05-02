<template>
  <section class="election-control-panel">
    <div class="election-scenario-main">
      <div>
        <p class="eyebrow">Election Climate</p>
        <h3>{{ scenarioLabel }}</h3>
        <div class="election-seed-row">
          <span>Seed {{ electionStore.seed }}</span>
          <span>Jitter {{ electionStore.jitterSeed }}</span>
        </div>
      </div>
      <div class="election-control-actions">
        <button type="button" class="btn-primary" @click="electionStore.randomizeScenario">
          <Shuffle :size="16" />
          Randomize Election Climate
        </button>
        <button type="button" :disabled="electionStore.isBaseline" @click="electionStore.resetScenario">
          <RotateCcw :size="16" />
          Reset
        </button>
      </div>
    </div>

    <div class="trend-chip-list">
      <span v-if="!electionStore.trends.length" class="trend-chip trend-chip--baseline">Baseline scenario</span>
      <span v-for="trend in electionStore.trends" :key="trend.id" class="trend-chip" :title="trend.description">
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
import { computed } from 'vue'
import { RotateCcw, Shuffle } from 'lucide-vue-next'
import { useElectionStore } from '../../stores/electionStore'
import { PARTIES, PARTY_META } from '../../domain/elections'
import PartyBadge from './PartyBadge.vue'

export default {
  name: 'ElectionScenarioControls',
  components: { PartyBadge, RotateCcw, Shuffle },
  props: {
    currentShares: { type: Object, default: () => ({}) },
    baselineShares: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const electionStore = useElectionStore()
    const scenarioLabel = computed(() => electionStore.isBaseline ? 'Baseline Scenario' : 'Randomized Scenario')

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
            '--shift-color': PARTY_META[party]?.color || '#888',
            '--shift-bg': `${PARTY_META[party]?.color || '#888'}15`,
            '--shift-border': `${PARTY_META[party]?.color || '#888'}40`,
          },
        }
      }).filter((p) => Math.abs(p.diff) >= 0.0005).sort((a, b) => b.diff - a.diff)
    })

    return { electionStore, partyShifts, scenarioLabel }
  },
}
</script>


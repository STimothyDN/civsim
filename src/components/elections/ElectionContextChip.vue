<template>
  <div class="election-context-chip" @click="open = !open" @keydown.escape="open = false">
    <span class="election-context-chip-year">{{ electionStore.electionYear }}</span>
    <span class="election-context-chip-scenario">{{ electionStore.scenarioName || 'Baseline' }}</span>
    <span v-if="electionStore.hasPendingElection" class="election-context-chip-pending" title="Pending changes" />

    <Transition name="ctx-pop">
      <div v-if="open" class="election-context-popover" @click.stop>
        <div class="election-context-popover-row">
          <span>Year</span>
          <strong>{{ electionStore.electionYear }}</strong>
        </div>
        <div class="election-context-popover-row">
          <span>Scenario</span>
          <strong>{{ electionStore.scenarioName || 'Baseline' }}</strong>
        </div>
        <div class="election-context-popover-row">
          <span>Election #</span>
          <strong>{{ electionStore.electionNumber + 1 }}</strong>
        </div>
        <div class="election-context-popover-row">
          <span>Trends</span>
          <strong>{{ electionStore.trends?.length || 0 }} active</strong>
        </div>
        <div class="election-context-popover-actions">
          <button type="button" class="btn-sm" @click="randomize">Randomize</button>
          <button type="button" class="btn-sm btn-primary" :disabled="!electionStore.hasPendingElection" @click="confirm">Confirm</button>
          <button type="button" class="btn-sm" @click="reset">Reset</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useElectionStore } from '../../stores/electionStore'

export default {
  name: 'ElectionContextChip',
  setup() {
    const electionStore = useElectionStore()
    const open = ref(false)

    function randomize() {
      electionStore.randomizeScenario()
      open.value = false
    }
    function confirm() {
      electionStore.confirmElection()
      open.value = false
    }
    function reset() {
      electionStore.resetScenario()
      open.value = false
    }

    return { electionStore, open, randomize, confirm, reset }
  },
}
</script>

<style scoped>
.ctx-pop-enter-active,
.ctx-pop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.ctx-pop-enter-from,
.ctx-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

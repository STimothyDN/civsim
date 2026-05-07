<template>
  <ElectionPageShell
    :icon="ClipboardList"
    eyebrow="Pre-Election"
    :title="climateName"
    :subtitle="`${countryName} · ${formatNumber(activeTrendCount)} active trends · polling seed ${pollingStore.pollSeed}`"
    scope="pre-election"
  >
    <template #hero-calls>
      <div class="overview-hero-call" style="display: flex; gap: 8px; align-items: center;">
        <button type="button" class="btn-primary" @click="pollingStore.randomizePolls">
          <RefreshCcw :size="16" />
          Refresh polling
        </button>
      </div>
    </template>

    <ScenarioTimeline
      :election-number="electionStore.electionNumber"
      :trend-history="electionStore.trendHistory"
      :scenario-name="climateName"
      :party-meta="partyMeta"
    />

    <ElectionScenarioControls
      :current-shares="results.national.assembly.vote_shares"
      :baseline-shares="baselineResults.national.assembly.vote_shares"
      :previous-shares="previousElectionResults.national.assembly.vote_shares"
    />

    <div class="election-data-grid">
      <VoteTrajectoryChart
        :baseline-shares="baselineResults.national.assembly.vote_shares"
        :current-shares="results.national.assembly.vote_shares"
        :previous-shares="previousElectionResults.national.assembly.vote_shares"
        :election-number="electionStore.electionNumber"
        :party-meta="partyMeta"
      />

      <TrendImpactHeatmap
        :trends="electionStore.trends"
        :party-meta="partyMeta"
      />
    </div>

    <ElectionPollsCard />
  </ElectionPageShell>
</template>

<script>
import { computed } from 'vue'
import { ClipboardList, RefreshCcw } from 'lucide-vue-next'
import ElectionPageShell from '../components/elections/ElectionPageShell.vue'
import ElectionPollsCard from '../components/elections/ElectionPollsCard.vue'
import ElectionScenarioControls from '../components/elections/ElectionScenarioControls.vue'
import ScenarioTimeline from '../components/elections/ScenarioTimeline.vue'
import VoteTrajectoryChart from '../components/elections/VoteTrajectoryChart.vue'
import TrendImpactHeatmap from '../components/elections/TrendImpactHeatmap.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { formatNumber } from '../domain/formatting'
import { usePollingStore } from '../stores/pollingStore'

export default {
  name: 'PreElectionPage',
  components: {
    ClipboardList, ElectionPageShell, ElectionPollsCard, ElectionScenarioControls,
    RefreshCcw, ScenarioTimeline, TrendImpactHeatmap, VoteTrajectoryChart,
  },
  setup() {
    const pollingStore = usePollingStore()
    const { baselineResults, previousElectionResults, electionStore, partyMeta, results, store } = useElectionResults()
    const countryName = computed(() => store.currentData?.country?.basic_info?.name || 'Untitled Civilization')
    const climateName = computed(() => results.value.config.scenarioName || 'Election Climate')
    const activeTrendCount = computed(() => results.value.config.trends.length)

    return {
      activeTrendCount,
      baselineResults,
      ClipboardList,
      climateName,
      countryName,
      electionStore,
      formatNumber,
      partyMeta,
      pollingStore,
      previousElectionResults,
      results,
      store,
    }
  },
}
</script>

<template>
  <section class="election-page pre-election-page">
    <div v-if="!hasData" class="empty-workspace">
      <ClipboardList :size="52" class="text-[var(--accent)]" />
      <div>
        <h2>No Election Data</h2>
        <p>Load or create a template to prepare the election climate and polling board.</p>
      </div>
      <button type="button" class="btn-primary" @click="store.loadDefault">
        <FilePlus2 :size="16" />
        New Template
      </button>
    </div>

    <template v-else>
      <header class="overview-hero pre-election-hero">
        <div class="election-decision-hero-main">
          <div class="election-page-icon-wrap"><ClipboardList :size="26" /></div>
          <div>
            <p class="eyebrow">Pre-Election</p>
            <h2>{{ climateName }}</h2>
            <p>{{ countryName }} · {{ formatNumber(activeTrendCount) }} active trends · polling seed {{ pollingStore.pollSeed }}</p>
          </div>
        </div>
        <div class="pre-election-hero-actions">
          <button type="button" class="btn-primary" @click="pollingStore.randomizePolls">
            <RefreshCcw :size="16" />
            Refresh polling
          </button>
        </div>
      </header>

      <ElectionScenarioControls
        :current-shares="results.national.assembly.vote_shares"
        :baseline-shares="baselineResults.national.assembly.vote_shares"
      />

      <ElectionPollsCard />
    </template>
  </section>
</template>

<script>
import { computed } from 'vue'
import { ClipboardList, FilePlus2, RefreshCcw } from 'lucide-vue-next'
import ElectionPollsCard from '../components/elections/ElectionPollsCard.vue'
import ElectionScenarioControls from '../components/elections/ElectionScenarioControls.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { formatNumber } from '../domain/provinceVisualizations'
import { usePollingStore } from '../stores/pollingStore'

export default {
  name: 'PreElectionPage',
  components: { ClipboardList, ElectionPollsCard, ElectionScenarioControls, FilePlus2, RefreshCcw },
  setup() {
    const pollingStore = usePollingStore()
    const { baselineResults, hasData, results, store } = useElectionResults()
    const countryName = computed(() => store.currentData?.country?.basic_info?.name || 'Untitled Civilization')
    const climateName = computed(() => results.value.config.scenarioName || 'Election Climate')
    const activeTrendCount = computed(() => results.value.config.trends.length)

    return {
      activeTrendCount,
      baselineResults,
      climateName,
      countryName,
      formatNumber,
      hasData,
      pollingStore,
      results,
      store,
    }
  },
}
</script>

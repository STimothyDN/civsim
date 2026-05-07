<template>
  <section class="election-simulator-page">
    <nav class="election-command-bar">
      <div class="election-tab-list" role="tablist" aria-label="Election simulator sections">
        <button
          v-for="tab in tabs"
          :key="tab.to"
          type="button"
          class="election-tab"
          :class="{ 'election-tab--active': route.path === tab.to }"
          :aria-selected="route.path === tab.to"
          role="tab"
          @click="router.push(tab.to)"
        >
          <component :is="tab.icon" :size="15" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <ElectionContextChip />

      <div class="election-action-cluster">
        <button
          type="button"
          class="election-action-btn"
          title="Election Narrative"
          @click="uiStore.openElectionNarrativeModal"
        >
          <BrainCircuit :size="16" />
        </button>
        <button
          type="button"
          class="election-action-btn"
          title="Start Broadcast"
          @click="uiStore.openElectionBroadcastModal(uiStore.currentPageScope, uiStore.currentPageTargetName)"
        >
          <Radio :size="16" />
        </button>
        <button
          type="button"
          class="election-action-btn"
          title="Election Ticker"
          @click="$emit('show-ticker')"
        >
          <Activity :size="16" />
        </button>
      </div>
    </nav>

    <router-view v-slot="{ Component }">
      <Transition name="page-slide" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </router-view>
  </section>
</template>

<script>
import { markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Activity, BrainCircuit, Building2, ClipboardList, LayoutDashboard, Map, Radio, Users, Vote } from 'lucide-vue-next'
import { useUiStore } from '../stores/uiStore'
import ElectionContextChip from '../components/elections/ElectionContextChip.vue'

export default {
  name: 'ElectionSimulator',
  components: { Activity, BrainCircuit, Radio, ElectionContextChip },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const uiStore = useUiStore()

    const tabs = [
      { to: '/elections/pre-election', label: 'Pre-Election', icon: markRaw(ClipboardList) },
      { to: '/elections/overview', label: 'Overview', icon: markRaw(LayoutDashboard) },
      { to: '/elections/national', label: 'National', icon: markRaw(Vote) },
      { to: '/elections/regional', label: 'Regional', icon: markRaw(Map) },
      { to: '/elections/provincial', label: 'Provincial', icon: markRaw(Building2) },
      { to: '/elections/directory', label: 'Directory', icon: markRaw(Users) },
    ]

    return { route, router, tabs, uiStore }
  },
}
</script>

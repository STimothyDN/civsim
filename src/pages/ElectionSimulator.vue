<template>
  <section class="election-simulator-page">
    <div class="builder-tabs election-simulator-tabs">
      <div class="election-simulator-tab-list" role="tablist" aria-label="Election simulator sections">
        <button
          v-for="tab in tabs"
          :key="tab.to"
          type="button"
          class="builder-tab"
          :class="{ 'builder-tab--active': route.path === tab.to }"
          :aria-selected="route.path === tab.to"
          role="tab"
          @click="router.push(tab.to)"
        >
          <component :is="tab.icon" :size="16" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
      <button type="button" class="btn-narrative election-simulator-narrative" @click="uiStore.openElectionNarrativeModal">
        <BrainCircuit :size="15" />
        <span>Election Narrative</span>
      </button>
    </div>

    <router-view />
  </section>
</template>

<script>
import { markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BrainCircuit, Building2, ClipboardList, LayoutDashboard, Map, Users, Vote } from 'lucide-vue-next'
import { useUiStore } from '../stores/uiStore'

export default {
  name: 'ElectionSimulator',
  components: { BrainCircuit },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const uiStore = useUiStore()

    const tabs = [
      { to: '/elections/pre-election', label: 'Pre-Election', icon: markRaw(ClipboardList) },
      { to: '/elections/overview', label: 'Overview', icon: markRaw(LayoutDashboard) },
      { to: '/elections/national', label: 'National Elections', icon: markRaw(Vote) },
      { to: '/elections/regional', label: 'Regional Elections', icon: markRaw(Map) },
      { to: '/elections/provincial', label: 'Provincial Elections', icon: markRaw(Building2) },
      { to: '/elections/directory', label: 'Representative Directory', icon: markRaw(Users) },
    ]

    return { route, router, tabs, uiStore }
  },
}
</script>

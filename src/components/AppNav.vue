<template>
  <nav class="app-nav">
    <div class="app-nav-links">
      <router-link
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        class="app-nav-link"
        :class="{ 'app-nav-link--active': $route.path === link.to }"
      >
        <component :is="link.icon" :size="16" class="nav-link-icon" />
        <span class="nav-link-label">{{ link.label }}</span>
      </router-link>
    </div>

    <button
      type="button"
      class="btn-recalculate"
      @click="recalculate"
      title="Recalculate all jitter-based values across all pages"
    >
      <RefreshCw class="recalc-icon" :size="15" />
      <span>Recalculate</span>
    </button>
  </nav>
</template>

<script>
import { markRaw } from 'vue'
import { Building2, ChartNoAxesColumnIncreasing, Home, LayoutDashboard, Map, RefreshCw, Vote } from 'lucide-vue-next'
import { useFormStore } from '../stores/formStore'

export default {
  name: 'AppNav',
  components: { RefreshCw },
  setup() {
    const store = useFormStore()

    const navLinks = [
      { to: '/', label: 'Home', icon: markRaw(Home) },
      { to: '/provinces/details', label: 'Province Details', icon: markRaw(ChartNoAxesColumnIncreasing) },
      { to: '/elections/overview', label: 'Election Overview', icon: markRaw(LayoutDashboard) },
      { to: '/elections/national', label: 'National Elections', icon: markRaw(Vote) },
      { to: '/elections/regional', label: 'Regional Elections', icon: markRaw(Map) },
      { to: '/elections/provincial', label: 'Provincial Elections', icon: markRaw(Building2) },
    ]

    function recalculate() {
      store.recalculate()
    }

    return { navLinks, recalculate }
  }
}
</script>

<template>
  <nav class="app-nav">
    <div class="app-nav-links">
      <router-link
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        class="app-nav-link"
        :class="{ 'app-nav-link--active': isActiveLink($route.path, link) }"
      >
        <component :is="link.icon" :size="16" class="nav-link-icon" />
        <span class="nav-link-label">{{ link.label }}</span>
      </router-link>
    </div>

    <div class="app-nav-actions">
      <button
        type="button"
        class="btn-recalculate"
        @click="recalculate"
        title="Recalculate all jitter-based values across all pages"
      >
        <RefreshCw class="recalc-icon" :size="15" />
        <span>Recalculate</span>
      </button>
    </div>
  </nav>
</template>

<script>
import { markRaw } from 'vue'
import { Database, LayoutDashboard, RefreshCw } from 'lucide-vue-next'
import { useFormStore } from '../stores/formStore'

export default {
  name: 'AppNav',
  components: { RefreshCw },
  setup() {
    const store = useFormStore()

    const navLinks = [
      { to: '/', label: 'Data Input and Overview', icon: markRaw(Database), exact: true },
      { to: '/elections', label: 'Election Simulator', icon: markRaw(LayoutDashboard), prefix: '/elections' },
    ]

    function recalculate() {
      store.recalculate()
    }

    function isActiveLink(path, link) {
      if (link.exact) return path === link.to
      if (link.prefix) return path.startsWith(link.prefix)
      return path === link.to
    }

    return { isActiveLink, navLinks, recalculate }
  }
}
</script>

<template>
  <CountryOverview @navigate="onNavigate" />
</template>

<script>
import { useRouter } from 'vue-router'
import CountryOverview from './CountryOverview.vue'

export default {
  name: 'OverviewRoute',
  components: { CountryOverview },
  setup() {
    const router = useRouter()
    function onNavigate(payload) {
      router.push({ path: '/builder', query: payload?.tab ? { section: payload.tab } : {} })
    }
    return { onNavigate }
  },
}
</script>

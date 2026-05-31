<template>
  <div v-if="items.length" class="ticker" role="status" aria-label="World status ticker">
    <div class="ticker__tag"><Activity :size="12" /> LIVE</div>
    <div class="ticker__view">
      <div class="ticker__track">
        <span v-for="(item, i) in run" :key="i" class="ticker__item">
          <em class="ticker__kind" :class="`ticker__kind--${item.tone}`">{{ item.tag }}</em>
          {{ item.text }}
          <i class="ticker__sep" />
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { Activity } from 'lucide-vue-next'
import { useFormStore } from '../stores/formStore'

export default {
  name: 'AppTicker',
  components: { Activity },
  setup() {
    const store = useFormStore()

    const items = computed(() => {
      const data = store.currentData
      if (!data) return []
      const out = []
      const info = data.country?.basic_info
      if (info?.name) {
        out.push({ tag: 'REALM', tone: 'gold', text: `${info.name}${info.leader ? ` — ${info.leader}` : ''}` })
      }
      const provinces = data.provinces?.length
      if (provinces) out.push({ tag: 'ATLAS', tone: 'azure', text: `${provinces} provinces under administration` })
      const counties = data.provinces?.reduce((n, p) => n + (p.counties?.length || 0), 0)
      if (counties) out.push({ tag: 'CENSUS', tone: 'jade', text: `${counties} counties surveyed` })
      const groups = data.province_groups?.length
      if (groups) out.push({ tag: 'REGIONS', tone: 'ink', text: `${groups} regional blocs` })
      const parties = data.config?.parties?.length
      if (parties) out.push({ tag: 'FACTIONS', tone: 'coral', text: `${parties} factions contesting` })
      const religions = data.global_religions?.length
      if (religions) out.push({ tag: 'FAITH', tone: 'ink', text: `${religions} recognized religions` })
      out.push({ tag: 'STATE', tone: 'jade', text: 'Autosaved to the royal atlas' })
      return out
    })

    // Duplicate the list so the marquee loops seamlessly.
    const run = computed(() => [...items.value, ...items.value])

    return { items, run }
  },
}
</script>

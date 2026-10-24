<template>
  <div v-if="items.length" class="ticker" role="status" aria-label="World status ticker">
    <div class="ticker__tag" :class="{ 'ticker__tag--live': tickerLoading }">
      <Activity :size="12" /> {{ tickerLoading ? 'TABULATING' : 'LIVE' }}
    </div>
    <div class="ticker__view">
      <div class="ticker__track">
        <span
          v-for="item in run"
          :key="item.runKey"
          class="ticker__item"
          :class="{ 'ticker__item--news': item.kind === 'llm', 'ticker__item--loading': item.kind === 'loading' }"
        >
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
import { useUiStore } from '../stores/uiStore'

export default {
  name: 'AppTicker',
  components: { Activity },
  setup() {
    const store = useFormStore()
    const uiStore = useUiStore()

    const tickerLoading = computed(() => uiStore.electionTicker.loading)

    // LLM-generated election headlines (newest first), tagged as 'llm' so they
    // get the breaking-news entrance animation when they mount.
    const electionItems = computed(() =>
      uiStore.electionTicker.items.map((item) => ({
        id: item.id,
        kind: 'llm',
        tag: item.tag,
        tone: item.tone,
        text: item.text,
      }))
    )

    // Static world-status items, derived from the loaded civilization data.
    const staticItems = computed(() => {
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
      return out.map((item, i) => ({ ...item, id: `static-${i}`, kind: 'static' }))
    })

    // Election headlines lead the ticker (breaking news first), then the steady
    // world-status items. A loading chip slots in front while the LLM runs.
    const items = computed(() => {
      const list = [...electionItems.value, ...staticItems.value]
      if (tickerLoading.value) {
        list.unshift({ id: 'ticker-loading', kind: 'loading', tag: '●', tone: 'coral', text: 'Tabulating election headlines…' })
      }
      return list
    })

    // Duplicate the list so the marquee loops seamlessly. Keys stay unique and
    // stable per item id, so only genuinely new headlines mount (and animate).
    const run = computed(() =>
      [...items.value, ...items.value].map((item, i) => ({
        ...item,
        runKey: `${i < items.value.length ? 'a' : 'b'}-${item.id}`,
      }))
    )

    return { items, run, tickerLoading }
  },
}
</script>

<style scoped>
/* Breaking-news entrance for freshly mounted LLM headlines. Static items never
   carry this class, so the steady world-status ticker doesn't re-animate. */
.ticker__item--news {
  animation: tickerNewsIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.ticker__item--loading {
  opacity: 0.85;
}
.ticker__item--loading .ticker__kind {
  animation: tickerLoadingPulse 1s ease-in-out infinite;
}
.ticker__tag--live {
  color: var(--gold);
  background: var(--gold-soft);
}

@keyframes tickerNewsIn {
  0% { opacity: 0; transform: translateX(-14px); }
  60% { opacity: 1; }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes tickerLoadingPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
</style>

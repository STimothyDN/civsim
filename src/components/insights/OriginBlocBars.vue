<template>
  <div class="origin-bloc-bars">
    <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
    <div v-if="!ranked.length" class="empty-inline">No origin data</div>
    <div v-else class="origin-row-list">
      <div v-for="bloc in ranked" :key="bloc.name" class="origin-row" :class="{ 'origin-row--lead': bloc === ranked[0] }">
        <div class="origin-row-head">
          <strong>{{ bloc.name }}</strong>
          <span>{{ bloc.provinces }} {{ bloc.provinces === 1 ? 'province' : 'provinces' }}</span>
        </div>
        <div class="origin-row-bar"><i :style="{ width: `${bloc.share}%` }"></i></div>
        <div class="origin-row-foot">
          <small>{{ formatCompactNumber(bloc.population) }} pop</small>
          <small>{{ bloc.share.toFixed(1) }}%</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { formatCompactNumber } from '../../domain/provinceVisualizations'

export default {
  name: 'OriginBlocBars',
  props: {
    blocs: { type: Array, default: () => [] },
    eyebrow: { type: String, default: '' },
    limit: { type: Number, default: 8 },
  },
  setup(props) {
    const ranked = computed(() => {
      const sorted = [...props.blocs].sort((a, b) => b.population - a.population || b.provinces - a.provinces)
      const total = sorted.reduce((sum, b) => sum + b.population, 0) || 1
      return sorted.slice(0, props.limit).map((b) => ({ ...b, share: (b.population / total) * 100 }))
    })
    return { ranked, formatCompactNumber }
  },
}
</script>

<style scoped>
.origin-bloc-bars { display: flex; flex-direction: column; gap: 8px; }
.eyebrow { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted, #a9a39a); margin: 0; }
.empty-inline { font-size: 0.78rem; color: var(--text-muted, #a9a39a); padding: 8px; }
.origin-row-list { display: flex; flex-direction: column; gap: 6px; }
.origin-row { padding: 8px 10px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 6px; display: flex; flex-direction: column; gap: 4px; }
.origin-row--lead { background: linear-gradient(135deg, rgba(212,168,67,0.12), transparent); border-color: rgba(212,168,67,0.4); }
.origin-row-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.origin-row-head strong { font-size: 0.88rem; }
.origin-row-head span { font-size: 0.7rem; color: var(--text-muted, #a9a39a); }
.origin-row-bar { height: 4px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; }
.origin-row-bar i { display: block; height: 100%; background: var(--accent, #d4a843); border-radius: 999px; }
.origin-row-foot { display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted, #a9a39a); }
</style>

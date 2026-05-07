<template>
  <div class="religion-mosaic">
    <div class="mosaic-head">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <small v-if="totalLabel">{{ totalLabel }}</small>
    </div>
    <div v-if="!segments.length" class="empty-inline">No religion data</div>
    <template v-else>
      <div class="mosaic-bar" :aria-label="ariaLabel">
        <i
          v-for="seg in segments"
          :key="seg.name"
          :style="{ width: `${seg.share}%`, background: seg.color }"
          :title="`${seg.name}: ${seg.share.toFixed(1)}%`"
        ></i>
      </div>
      <div class="mosaic-legend">
        <div v-for="seg in segments" :key="`leg-${seg.name}`" class="mosaic-legend-row">
          <span class="legend-swatch" :style="{ background: seg.color }"></span>
          <strong>{{ seg.name }}</strong>
          <span>{{ seg.share.toFixed(1) }}%</span>
          <small>{{ formatCompactNumber(seg.followers) }}</small>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue'
import { formatCompactNumber } from '../../domain/provinceVisualizations'

const PALETTE = ['#d4a843', '#2dd4bf', '#60a5fa', '#a78bfa', '#f472b6', '#4ade80', '#facc15', '#fb923c', '#94a3b8', '#ef4444']

export default {
  name: 'ReligionMosaic',
  props: {
    religions: { type: [Array, Object], default: () => [] },
    eyebrow: { type: String, default: '' },
    limit: { type: Number, default: 8 },
  },
  setup(props) {
    const normalized = computed(() => {
      if (Array.isArray(props.religions)) {
        return props.religions
          .map((r) => ({ name: r.name || 'Unspecified', followers: Number(r.followers) || 0 }))
          .filter((r) => r.followers > 0)
      }
      return Object.entries(props.religions || {})
        .map(([name, followers]) => ({ name: name || 'Unspecified', followers: Number(followers) || 0 }))
        .filter((r) => r.followers > 0)
    })
    const sorted = computed(() => [...normalized.value].sort((a, b) => b.followers - a.followers).slice(0, props.limit))
    const total = computed(() => sorted.value.reduce((sum, r) => sum + r.followers, 0) || 1)
    const segments = computed(() => sorted.value.map((r, i) => ({ ...r, share: (r.followers / total.value) * 100, color: PALETTE[i % PALETTE.length] })))
    const totalLabel = computed(() => sorted.value.length ? `${formatCompactNumber(total.value)} followers` : '')
    const ariaLabel = computed(() => sorted.value.map((r) => `${r.name} ${(r.followers / total.value * 100).toFixed(1)}%`).join(', '))
    return { segments, totalLabel, ariaLabel, formatCompactNumber }
  },
}
</script>

<style scoped>
.religion-mosaic { display: flex; flex-direction: column; gap: 8px; }
.mosaic-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.eyebrow { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted, #a9a39a); margin: 0; }
.mosaic-head small { font-size: 0.7rem; color: var(--text-muted, #a9a39a); }
.empty-inline { font-size: 0.78rem; color: var(--text-muted, #a9a39a); padding: 8px; }
.mosaic-bar { display: flex; height: 14px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); background: rgba(255,255,255,0.02); }
.mosaic-bar i { display: block; height: 100%; transition: width 0.3s ease; }
.mosaic-legend { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 4px 10px; }
.mosaic-legend-row { display: flex; align-items: center; gap: 6px; font-size: 0.72rem; }
.mosaic-legend-row strong { font-weight: 600; flex: 1; }
.mosaic-legend-row span { color: var(--text-muted, #a9a39a); font-weight: 700; }
.mosaic-legend-row small { color: var(--text-muted, #a9a39a); }
.legend-swatch { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
</style>

<template>
  <div class="connectivity-orbit">
    <div class="orbit-head">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <small v-if="averageDistance">avg {{ formatNumber(averageDistance) }}</small>
    </div>
    <div v-if="!neighbors.length" class="empty-inline">No neighbor data</div>
    <template v-else>
      <svg class="orbit-svg" :viewBox="`0 0 ${size} ${size}`" role="img" :aria-label="ariaLabel">
        <circle
          v-for="ring in rings"
          :key="`ring-${ring}`"
          :cx="center"
          :cy="center"
          :r="ring"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          stroke-dasharray="2 4"
        />
        <line
          v-for="(n, i) in placedNeighbors"
          :key="`line-${i}`"
          :x1="center"
          :y1="center"
          :x2="n.x"
          :y2="n.y"
          stroke="rgba(212,168,67,0.32)"
          stroke-width="1"
        />
        <circle :cx="center" :cy="center" :r="14" fill="#d4a843" />
        <text :x="center" :y="center + 4" text-anchor="middle" fill="#181a24" font-size="9" font-weight="700">{{ centerInitial }}</text>
        <g v-for="(n, i) in placedNeighbors" :key="`pt-${i}`">
          <circle :cx="n.x" :cy="n.y" :r="9" fill="#2dd4bf" stroke="rgba(255,255,255,0.18)" />
          <text :x="n.x" :y="n.y - 14" text-anchor="middle" fill="#f1eee8" font-size="9">{{ n.label }}</text>
          <text :x="n.x" :y="n.y + 22" text-anchor="middle" fill="#a9a39a" font-size="8">{{ formatNumber(n.distance) }}</text>
        </g>
      </svg>
      <div class="orbit-ladder">
        <div v-for="(n, i) in neighbors" :key="`row-${i}`" class="orbit-row">
          <span>{{ i + 1 }}</span>
          <strong>{{ n.provinceName || n.label || 'Unknown' }}</strong>
          <small>{{ formatNumber(n.distance) }}</small>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue'
import { formatNumber } from '../../domain/provinceVisualizations'

export default {
  name: 'ConnectivityOrbit',
  props: {
    centerName: { type: String, default: '' },
    closestProvinces: { type: Array, default: () => [] },
    eyebrow: { type: String, default: '' },
  },
  setup(props) {
    const size = 220
    const center = size / 2
    const rings = [40, 70, 100]
    const neighbors = computed(() =>
      [...props.closestProvinces]
        .map((c) => ({
          provinceName: c.provinceName || c.province_name || '',
          distance: Number(c.distance) || 0,
        }))
        .filter((c) => c.provinceName)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 6)
    )
    const maxDistance = computed(() => Math.max(1, ...neighbors.value.map((n) => n.distance)))
    const placedNeighbors = computed(() => {
      const ringMax = 96
      const ringMin = 36
      return neighbors.value.map((n, i) => {
        const angle = (-Math.PI / 2) + (i * (2 * Math.PI / Math.max(1, neighbors.value.length)))
        const r = ringMin + (n.distance / maxDistance.value) * (ringMax - ringMin)
        const x = center + Math.cos(angle) * r
        const y = center + Math.sin(angle) * r
        return { ...n, x, y, label: n.provinceName.slice(0, 8) }
      })
    })
    const averageDistance = computed(() => {
      if (!neighbors.value.length) return 0
      return neighbors.value.reduce((sum, n) => sum + n.distance, 0) / neighbors.value.length
    })
    const centerInitial = computed(() => (props.centerName || '?').slice(0, 2).toUpperCase())
    const ariaLabel = computed(() => `Connectivity orbit for ${props.centerName}`)
    return { size, center, rings, neighbors, placedNeighbors, averageDistance, centerInitial, ariaLabel, formatNumber }
  },
}
</script>

<style scoped>
.connectivity-orbit { display: flex; flex-direction: column; gap: 8px; }
.orbit-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.eyebrow { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted, #a9a39a); margin: 0; }
.orbit-head small { font-size: 0.7rem; color: var(--text-muted, #a9a39a); }
.empty-inline { font-size: 0.78rem; color: var(--text-muted, #a9a39a); padding: 8px; }
.orbit-svg { width: 100%; max-width: 240px; height: auto; align-self: center; }
.orbit-ladder { display: flex; flex-direction: column; gap: 4px; }
.orbit-row { display: grid; grid-template-columns: 18px 1fr auto; align-items: center; gap: 8px; padding: 4px 8px; font-size: 0.75rem; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 4px; }
.orbit-row span { color: var(--text-muted, #a9a39a); font-weight: 700; }
.orbit-row small { color: var(--text-muted, #a9a39a); }
</style>

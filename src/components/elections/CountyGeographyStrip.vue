<template>
  <section class="county-geo election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Geography</p>
        <h3>County Terrain & Resources</h3>
      </div>
    </div>
    <div class="county-geo-strips">
      <div v-for="strip in strips" :key="strip.label" class="county-geo-row">
        <span class="county-geo-label">{{ strip.label }}</span>
        <div class="county-geo-bar">
          <i
            v-for="seg in strip.segments"
            :key="seg.name"
            :style="{ flex: seg.count, backgroundColor: seg.color }"
            :title="`${seg.name}: ${seg.count}`"
          ></i>
        </div>
        <div class="county-geo-legend">
          <span v-for="seg in strip.segments" :key="seg.name" class="county-geo-legend-item">
            <i :style="{ backgroundColor: seg.color }"></i>
            {{ seg.name }} ({{ seg.count }})
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { computed } from 'vue'

const TERRAIN_COLORS = {
  Grassland: '#4a7c59', Plains: '#8b9d4a', Desert: '#c9a84c', Tundra: '#7a8fa0',
  Coast: '#4a8db7', Ocean: '#2c5f8a', Mountain: '#6b6b80', Hills: '#8a7d5a',
  Forest: '#2d6a3f', Jungle: '#1a5c2a', Marsh: '#5a7a6a', Snow: '#b0c4d0',
  Floodplains: '#6a9a5a', Lake: '#3a7aaa',
}
const RESOURCE_COLORS = {
  Iron: '#8b8b8b', Coal: '#4a4a4a', Horses: '#a0724a', Niter: '#7a7a3a',
  Oil: '#2a2a2a', Aluminum: '#c0c0c0', Uranium: '#3a8a3a',
  Gold: '#d4a843', Silver: '#c0c0c0', Diamonds: '#87ceeb', Marble: '#ddd0c0',
  Ivory: '#f5f0e0', Silk: '#9a4a6a', Spices: '#b05a3a', Wine: '#6a2a3a',
  Wheat: '#d4b050', Rice: '#e0d090', Cattle: '#8a5a3a', Fish: '#5a8ab0',
  Deer: '#7a5a3a', Stone: '#9a9a9a', Copper: '#b07040', Tea: '#5a8a5a',
  Coffee: '#5a3a2a', Sugar: '#e0c080', Cotton: '#e0e0e0', Dyes: '#8a3a8a',
  Incense: '#c0a050', Furs: '#6a4a3a', Citrus: '#e0a030', Tobacco: '#7a5a3a',
  Cocoa: '#4a2a1a', Truffles: '#3a3a3a', Jade: '#5a8a5a', Mercury: '#aaa',
  Salt: '#e0e0e0', Amber: '#d0a040',
}
const IMPROVEMENT_COLORS = {
  Farm: '#5a8a3a', Mine: '#6a6a7a', Camp: '#8a6a4a', Plantation: '#3a7a3a',
  'Fishing Boats': '#4a7aaa', Pasture: '#7a9a5a', Quarry: '#8a8a8a',
  'Lumber Mill': '#5a4a3a', 'Oil Well': '#3a3a3a',
}
const FALLBACK_PALETTE = ['#5a6a7a', '#7a5a6a', '#6a7a5a', '#8a7a5a', '#5a7a8a', '#7a6a8a', '#8a6a5a', '#6a8a7a']

function buildSegments(items, colorMap) {
  const counts = {}
  for (const item of items) {
    const key = item || 'None'
    counts[key] = (counts[key] || 0) + 1
  }
  let fallbackIdx = 0
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      color: colorMap[name] || FALLBACK_PALETTE[fallbackIdx++ % FALLBACK_PALETTE.length],
    }))
}

export default {
  name: 'CountyGeographyStrip',
  props: {
    counties: { type: Array, required: true },
  },
  setup(props) {
    const strips = computed(() => {
      const counties = props.counties
      const terrains = counties.map((c) => {
        const t = String(c.terrain || '')
        return t.split('_')[0] || t || 'Unknown'
      })
      const resources = counties.map((c) => c.resource || 'None')
      const improvements = counties.map((c) => c.improvement_name || c.political_features?.improvement_name || 'None')

      return [
        { label: 'Terrain', segments: buildSegments(terrains, TERRAIN_COLORS) },
        { label: 'Resources', segments: buildSegments(resources, RESOURCE_COLORS) },
        { label: 'Improvements', segments: buildSegments(improvements, IMPROVEMENT_COLORS) },
      ]
    })

    return { strips }
  },
}
</script>

<style scoped>
.county-geo-strips {
  display: grid;
  gap: 16px;
}

.county-geo-row {
  display: grid;
  gap: 6px;
}

.county-geo-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.county-geo-bar {
  display: flex;
  height: 16px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-input);
}

.county-geo-bar i {
  display: block;
  height: 100%;
  transition: flex 0.3s ease;
}

.county-geo-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
}

.county-geo-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.county-geo-legend-item i {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
</style>

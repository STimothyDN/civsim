<template>
  <div class="county-terrain-heatmap">
    <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
    <div v-if="!hasData" class="empty-inline">No county composition data</div>
    <ProvinceChart v-else :option="option" :aria-label="ariaLabel || 'County terrain treemap'" />
  </div>
</template>

<script>
import { computed } from 'vue'
import ProvinceChart from '../ProvinceChart.vue'

export default {
  name: 'CountyTerrainHeatmap',
  components: { ProvinceChart },
  props: {
    eyebrow: { type: String, default: '' },
    terrainCounts: { type: Object, default: () => ({}) },
    improvementCounts: { type: Object, default: () => ({}) },
    ariaLabel: { type: String, default: '' },
  },
  setup(props) {
    const buildBranch = (label, source, palette) => {
      const children = Object.entries(source || {})
        .map(([name, count]) => ({ name: name || 'Unspecified', value: Number(count) || 0 }))
        .filter((e) => e.value > 0)
      if (!children.length) return null
      return { name: label, value: children.reduce((sum, c) => sum + c.value, 0), children, itemStyle: { color: palette } }
    }

    const data = computed(() => {
      const branches = []
      const terrain = buildBranch('Terrain', props.terrainCounts, '#2dd4bf')
      const improvement = buildBranch('Improvements', props.improvementCounts, '#d4a843')
      if (terrain) branches.push(terrain)
      if (improvement) branches.push(improvement)
      return branches
    })

    const hasData = computed(() => data.value.length > 0)

    const option = computed(() => ({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: '#181a24', borderColor: '#30333f', textStyle: { color: '#f1eee8' } },
      series: [
        {
          type: 'treemap',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: { show: true, color: '#f1eee8', fontSize: 11, formatter: '{b}\n{c}' },
          upperLabel: { show: true, height: 18, color: '#f1eee8', fontSize: 10 },
          itemStyle: { borderColor: '#181a24', borderWidth: 2, gapWidth: 1 },
          levels: [
            { itemStyle: { borderWidth: 0, gapWidth: 4 } },
            { itemStyle: { borderWidth: 2, gapWidth: 1 }, upperLabel: { show: true } },
            { colorSaturation: [0.35, 0.6], itemStyle: { borderWidth: 1, gapWidth: 1 } },
          ],
          data: data.value,
        },
      ],
    }))

    return { option, hasData }
  },
}
</script>

<style scoped>
.county-terrain-heatmap { display: flex; flex-direction: column; gap: 6px; }
.eyebrow { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted, #a9a39a); margin: 0; }
.county-terrain-heatmap :deep(.echarts-shell) { min-height: 220px; }
.empty-inline { font-size: 0.78rem; color: var(--text-muted, #a9a39a); padding: 8px; }
</style>

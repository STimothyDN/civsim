<template>
  <section class="county-heatmap election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Feature Indices</p>
        <h3>County Political Feature Heatmap</h3>
      </div>
    </div>
    <div class="election-chart-shell" :style="{ height: chartHeight + 'px' }">
      <ProvinceChart :option="heatmapOption" aria-label="County feature heatmap" />
    </div>
  </section>
</template>

<script>
import { computed } from 'vue'
import ProvinceChart from '../ProvinceChart.vue'

const FEATURE_KEYS = [
  'urban_index', 'rural_index', 'industrial_index', 'agricultural_index',
  'commercial_index', 'cultural_elite_index', 'intellectual_index', 'spiritual_index',
  'military_index', 'worker_index', 'infrastructure_index', 'appeal_index',
  'localist_index', 'traditionalist_index', 'restorationist_index',
  'coastal_index', 'maritime_index', 'mountain_index', 'wilderness_index',
  'residential_index', 'extractive_index', 'leisure_tourism_index', 'civic_monument_index',
  'yield_diversity_index', 'resource_development_index',
]

function featureLabel(key) {
  return key.replace(/_index$/, '').replace(/_/g, ' ')
}

export default {
  name: 'CountyFeatureHeatmap',
  components: { ProvinceChart },
  props: {
    counties: { type: Array, required: true },
  },
  setup(props) {
    const chartHeight = computed(() => Math.max(320, props.counties.length * 22 + 120))

    const heatmapOption = computed(() => {
      const sorted = [...props.counties].sort(
        (a, b) => (b.county_population || 0) - (a.county_population || 0)
      )
      const yLabels = sorted.map((c) => c.name || c.tile_id || 'County')
      const xLabels = FEATURE_KEYS.map(featureLabel)

      const data = []
      sorted.forEach((county, yi) => {
        const features = county.political_features || {}
        FEATURE_KEYS.forEach((key, xi) => {
          const val = Number(features[key] || 0)
          data.push([xi, yi, +val.toFixed(3)])
        })
      })

      return {
        tooltip: {
          formatter(params) {
            const [xi, yi, val] = params.data
            return `<strong>${yLabels[yi]}</strong><br/>${xLabels[xi]}: ${val}`
          },
        },
        grid: { left: 120, right: 20, top: 80, bottom: 20 },
        xAxis: {
          type: 'category',
          data: xLabels,
          position: 'top',
          axisLabel: { rotate: 55, fontSize: 9, color: '#a0a0b0' },
          splitArea: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'category',
          data: yLabels,
          axisLabel: { fontSize: 10, color: '#a0a0b0' },
          splitArea: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
        },
        visualMap: {
          min: 0,
          max: 1,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          top: 0,
          itemWidth: 12,
          itemHeight: 120,
          textStyle: { color: '#a0a0b0', fontSize: 10 },
          inRange: { color: ['#1a1a2e', '#2a2050', '#6b3fa0', '#d4a843', '#f0d878'] },
        },
        series: [
          {
            type: 'heatmap',
            data,
            label: { show: false },
            emphasis: {
              itemStyle: { shadowBlur: 6, shadowColor: 'rgba(212, 168, 67, 0.5)' },
            },
          },
        ],
      }
    })

    return { heatmapOption, chartHeight }
  },
}
</script>

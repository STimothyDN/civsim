<template>
  <div class="yield-radar">
    <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
    <ProvinceChart :option="option" :aria-label="ariaLabel || 'Yield radar'" />
    <div class="yield-tally">
      <div v-for="key in PROVINCE_YIELD_KEYS" :key="key" class="yield-tally-cell">
        <span>{{ labelFor(key) }}</span>
        <strong>{{ formatNumber(yields[key] || 0) }}</strong>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import ProvinceChart from '../ProvinceChart.vue'
import { PROVINCE_YIELD_KEYS, formatNumber } from '../../domain/provinceVisualizations'

function labelFor(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default {
  name: 'YieldRadar',
  components: { ProvinceChart },
  props: {
    yields: { type: Object, default: () => ({}) },
    benchmark: { type: Object, default: null },
    benchmarkLabel: { type: String, default: 'Benchmark' },
    primaryLabel: { type: String, default: 'Yields' },
    eyebrow: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
  },
  setup(props) {
    const option = computed(() => {
      const keys = PROVINCE_YIELD_KEYS
      const max = Math.max(
        1,
        ...keys.map((k) => Number(props.yields[k]) || 0),
        ...(props.benchmark ? keys.map((k) => Number(props.benchmark[k]) || 0) : [0])
      )
      const indicator = keys.map((k) => ({ name: labelFor(k), max }))
      const series = [{ value: keys.map((k) => Number(props.yields[k]) || 0), name: props.primaryLabel, areaStyle: { opacity: 0.25 } }]
      if (props.benchmark) {
        series.push({ value: keys.map((k) => Number(props.benchmark[k]) || 0), name: props.benchmarkLabel, areaStyle: { opacity: 0.08 } })
      }
      return {
        backgroundColor: 'transparent',
        textStyle: { color: '#f1eee8', fontFamily: 'Inter, system-ui, sans-serif' },
        tooltip: { trigger: 'item', backgroundColor: '#181a24', borderColor: '#30333f', textStyle: { color: '#f1eee8' } },
        legend: { show: !!props.benchmark, top: 0, textStyle: { color: '#a9a39a' } },
        radar: {
          indicator,
          center: ['50%', '54%'],
          radius: '64%',
          axisName: { color: '#a9a39a', fontSize: 11 },
          splitLine: { lineStyle: { color: '#30333f' } },
          splitArea: { show: false },
          axisLine: { lineStyle: { color: '#30333f' } },
        },
        color: ['#d4a843', '#2dd4bf'],
        series: [{ type: 'radar', data: series }],
      }
    })
    return { option, PROVINCE_YIELD_KEYS, labelFor, formatNumber }
  },
}
</script>

<style scoped>
.yield-radar { display: flex; flex-direction: column; gap: 8px; }
.eyebrow { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted, #a9a39a); margin: 0; }
.yield-radar :deep(.echarts-shell) { min-height: 260px; }
.yield-tally { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 4px; }
.yield-tally-cell { display: flex; flex-direction: column; padding: 4px 6px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 4px; }
.yield-tally-cell span { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #a9a39a); font-weight: 700; }
.yield-tally-cell strong { font-size: 0.85rem; }
</style>

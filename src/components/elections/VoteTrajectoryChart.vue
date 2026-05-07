<template>
  <section v-if="hasMultiplePoints" class="trajectory-panel election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Trend Analysis</p>
        <h3>Vote Share Trajectory</h3>
      </div>
    </div>
    <div class="election-chart-shell" style="height: 300px">
      <ProvinceChart :option="chartOption" aria-label="Vote trajectory chart" />
    </div>
  </section>
</template>

<script>
import { computed } from 'vue'
import ProvinceChart from '../ProvinceChart.vue'
import { PARTIES, formatShare } from '../../domain/elections'

export default {
  name: 'VoteTrajectoryChart',
  components: { ProvinceChart },
  props: {
    baselineShares: { type: Object, required: true },
    currentShares: { type: Object, required: true },
    previousShares: { type: Object, default: null },
    electionNumber: { type: Number, required: true },
    partyMeta: { type: Object, required: true },
  },
  setup(props) {
    const hasMultiplePoints = computed(() => props.electionNumber > 0 || true)

    const chartOption = computed(() => {
      const years = ['Baseline']
      if (props.electionNumber > 0 && props.previousShares) {
        years.push(`Year ${2026 + props.electionNumber * 2}`)
      }
      years.push('Current Preview')

      const series = PARTIES
        .filter((p) => (props.currentShares[p] || 0) > 0.01)
        .map((party) => {
          const data = [Number(props.baselineShares[party] || 0) * 100]
          if (props.electionNumber > 0 && props.previousShares) {
            data.push(Number(props.previousShares[party] || 0) * 100)
          }
          data.push(Number(props.currentShares[party] || 0) * 100)

          const color = props.partyMeta[party]?.color || '#666'
          return {
            name: props.partyMeta[party]?.name || party,
            type: 'line',
            data,
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: { color, width: 2 },
            itemStyle: { color },
            areaStyle: { color, opacity: 0.06 },
          }
        })

      return {
        tooltip: {
          trigger: 'axis',
          formatter(params) {
            let html = `<strong>${params[0].axisValue}</strong>`
            for (const p of params) {
              html += `<br/>${p.marker} ${p.seriesName}: ${p.value.toFixed(1)}%`
            }
            return html
          },
        },
        legend: {
          bottom: 0,
          textStyle: { color: '#a0a0b0', fontSize: 10 },
          itemWidth: 12,
          itemHeight: 8,
        },
        grid: { left: 50, right: 20, top: 20, bottom: 40 },
        xAxis: {
          type: 'category',
          data: years,
          axisLabel: { color: '#a0a0b0', fontSize: 10 },
          axisLine: { lineStyle: { color: '#ffffff10' } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#a0a0b0', fontSize: 10, formatter: '{value}%' },
          splitLine: { lineStyle: { color: '#ffffff08' } },
        },
        series,
      }
    })

    return { hasMultiplePoints, chartOption }
  },
}
</script>

<template>
  <section class="prov-scatter election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Province Analysis</p>
        <h3>Population vs Vote Margin</h3>
      </div>
    </div>
    <div class="election-chart-shell" style="height: 320px">
      <ProvinceChart :option="scatterOption" aria-label="Province scatter plot" />
    </div>
  </section>
</template>

<script>
import { computed } from 'vue'
import ProvinceChart from '../ProvinceChart.vue'
import { PARTIES, formatShare } from '../../domain/elections'
import { formatCompactNumber } from '../../domain/formatting'
import { topParty } from '../../domain/elections/viewHelpers'

export default {
  name: 'ProvinceScatterPlot',
  components: { ProvinceChart },
  props: {
    provinces: { type: Array, required: true },
    partyMeta: { type: Object, required: true },
  },
  setup(props) {
    const scatterOption = computed(() => {
      const seriesMap = {}

      for (const prov of props.provinces) {
        const shares = prov.assembly?.vote_shares || {}
        const sorted = PARTIES
          .map((p) => ({ party: p, share: shares[p] || 0 }))
          .sort((a, b) => b.share - a.share)
        const winner = sorted[0]?.party || PARTIES[0]
        const margin = (sorted[0]?.share || 0) - (sorted[1]?.share || 0)
        const pop = prov.provincial_population || 0
        const seats = Object.values(prov.assembly?.seats || {}).reduce((s, v) => s + v, 0)

        if (!seriesMap[winner]) {
          seriesMap[winner] = {
            name: props.partyMeta[winner]?.name || winner,
            type: 'scatter',
            data: [],
            itemStyle: { color: props.partyMeta[winner]?.color || '#666', opacity: 0.75 },
            emphasis: { itemStyle: { opacity: 1, shadowBlur: 8 } },
          }
        }
        seriesMap[winner].data.push({
          value: [pop, margin * 100],
          name: prov.name,
          symbolSize: Math.max(8, Math.min(28, Math.sqrt(seats) * 4)),
          seats,
        })
      }

      return {
        tooltip: {
          formatter(params) {
            const d = params.data
            return `<strong>${d.name}</strong><br/>Pop: ${formatCompactNumber(d.value[0])}<br/>Margin: ${d.value[1].toFixed(1)}%<br/>Seats: ${d.seats}`
          },
        },
        legend: {
          bottom: 0,
          textStyle: { color: '#a0a0b0', fontSize: 10 },
          itemWidth: 10,
          itemHeight: 10,
        },
        grid: { left: 60, right: 20, top: 20, bottom: 40 },
        xAxis: {
          name: 'Population',
          nameLocation: 'middle',
          nameGap: 30,
          nameTextStyle: { color: '#a0a0b0', fontSize: 11 },
          type: 'value',
          axisLabel: { color: '#a0a0b0', fontSize: 10, formatter: (v) => formatCompactNumber(v) },
          splitLine: { lineStyle: { color: '#ffffff08' } },
        },
        yAxis: {
          name: 'Win Margin (%)',
          nameTextStyle: { color: '#a0a0b0', fontSize: 11 },
          type: 'value',
          min: 0,
          axisLabel: { color: '#a0a0b0', fontSize: 10 },
          splitLine: { lineStyle: { color: '#ffffff08' } },
        },
        series: Object.values(seriesMap),
      }
    })

    return { scatterOption }
  },
}
</script>

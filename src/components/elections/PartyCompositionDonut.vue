<template>
  <section class="donut-panel election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Composition</p>
        <h3>Party Breakdown</h3>
      </div>
    </div>
    <div class="election-chart-shell election-chart-shell--compact">
      <ProvinceChart :option="donutOption" aria-label="Party composition donut" />
    </div>
  </section>
</template>

<script>
import { computed } from 'vue'
import ProvinceChart from '../ProvinceChart.vue'
import { PARTIES } from '../../domain/elections'

export default {
  name: 'PartyCompositionDonut',
  components: { ProvinceChart },
  props: {
    representatives: { type: Array, required: true },
    partyMeta: { type: Object, required: true },
  },
  setup(props) {
    const donutOption = computed(() => {
      const counts = {}
      for (const rep of props.representatives) {
        counts[rep.party] = (counts[rep.party] || 0) + 1
      }

      const data = PARTIES
        .filter((p) => counts[p] > 0)
        .map((p) => ({
          name: props.partyMeta[p]?.name || p,
          value: counts[p],
          itemStyle: { color: props.partyMeta[p]?.color || '#666' },
        }))
        .sort((a, b) => b.value - a.value)

      return {
        tooltip: {
          formatter: '{b}: {c} ({d}%)',
        },
        series: [
          {
            type: 'pie',
            radius: ['45%', '75%'],
            avoidLabelOverlap: true,
            padAngle: 2,
            itemStyle: { borderRadius: 4 },
            label: {
              show: true,
              formatter: '{b}\n{c}',
              fontSize: 10,
              color: '#a0a0b0',
            },
            emphasis: {
              label: { show: true, fontSize: 12, fontWeight: 'bold' },
              itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
            },
            data,
          },
        ],
      }
    })

    return { donutOption }
  },
}
</script>

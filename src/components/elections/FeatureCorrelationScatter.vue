<template>
  <section class="feat-scatter election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Correlation</p>
        <h3>Feature vs Vote Share</h3>
      </div>
      <div class="feat-scatter-controls">
        <label class="feat-scatter-select">
          <span>Feature</span>
          <select v-model="selectedFeature">
            <option v-for="f in featureKeys" :key="f" :value="f">{{ featureLabel(f) }}</option>
          </select>
        </label>
        <label class="feat-scatter-select">
          <span>Party</span>
          <select v-model="selectedParty">
            <option v-for="p in partiesWithVotes" :key="p" :value="p">{{ partyLabel(p) }}</option>
          </select>
        </label>
      </div>
    </div>
    <div class="election-chart-shell" style="height: 320px">
      <ProvinceChart :option="scatterOption" aria-label="Feature correlation scatter" />
    </div>
  </section>
</template>

<script>
import { computed, ref } from 'vue'
import ProvinceChart from '../ProvinceChart.vue'
import { PARTIES, formatShare } from '../../domain/elections'

const FEATURE_KEYS = [
  'urban_index', 'rural_index', 'industrial_index', 'agricultural_index',
  'commercial_index', 'cultural_elite_index', 'intellectual_index', 'spiritual_index',
  'military_index', 'worker_index', 'infrastructure_index', 'appeal_index',
  'localist_index', 'traditionalist_index', 'restorationist_index',
  'coastal_index', 'maritime_index', 'mountain_index', 'wilderness_index',
  'residential_index', 'extractive_index',
]

function featureLabel(key) {
  return key.replace(/_index$/, '').replace(/_/g, ' ')
}

export default {
  name: 'FeatureCorrelationScatter',
  components: { ProvinceChart },
  props: {
    counties: { type: Array, required: true },
    partyMeta: { type: Object, required: true },
  },
  setup(props) {
    const selectedFeature = ref('urban_index')
    const selectedParty = ref(PARTIES[0])
    const featureKeys = FEATURE_KEYS

    const partiesWithVotes = computed(() =>
      PARTIES.filter((p) =>
        props.counties.some((c) => (c.vote_shares?.[p] || 0) > 0.001)
      )
    )

    function partyLabel(p) {
      return props.partyMeta[p]?.abbreviation || props.partyMeta[p]?.name || p
    }

    const scatterOption = computed(() => {
      const party = selectedParty.value
      const feat = selectedFeature.value
      const color = props.partyMeta[party]?.color || '#d4a843'

      const data = props.counties.map((c) => {
        const x = Number(c.political_features?.[feat] || 0)
        const y = Number(c.vote_shares?.[party] || 0)
        return { value: [x, y], name: c.name || c.tile_id, pop: c.county_population }
      })

      return {
        tooltip: {
          formatter(params) {
            const d = params.data
            return `<strong>${d.name}</strong><br/>${featureLabel(feat)}: ${d.value[0].toFixed(3)}<br/>${partyLabel(party)} vote: ${formatShare(d.value[1])}`
          },
        },
        grid: { left: 60, right: 20, top: 20, bottom: 50 },
        xAxis: {
          name: featureLabel(feat),
          nameLocation: 'middle',
          nameGap: 30,
          nameTextStyle: { color: '#a0a0b0', fontSize: 11 },
          type: 'value',
          min: 0,
          max: 1,
          axisLabel: { color: '#a0a0b0', fontSize: 10 },
          splitLine: { lineStyle: { color: '#ffffff08' } },
        },
        yAxis: {
          name: 'Vote Share',
          nameTextStyle: { color: '#a0a0b0', fontSize: 11 },
          type: 'value',
          min: 0,
          axisLabel: { color: '#a0a0b0', fontSize: 10, formatter: (v) => (v * 100).toFixed(0) + '%' },
          splitLine: { lineStyle: { color: '#ffffff08' } },
        },
        series: [
          {
            type: 'scatter',
            data,
            symbolSize(val, params) {
              return Math.max(6, Math.min(24, Math.sqrt(params.data.pop || 100) / 8))
            },
            itemStyle: { color, opacity: 0.7 },
            emphasis: { itemStyle: { opacity: 1, shadowBlur: 8, shadowColor: color + '66' } },
          },
        ],
      }
    })

    return { selectedFeature, selectedParty, featureKeys, featureLabel, partiesWithVotes, partyLabel, scatterOption }
  },
}
</script>

<style scoped>
.feat-scatter-controls {
  display: flex;
  gap: 10px;
}

.feat-scatter-select {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.feat-scatter-select span {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.feat-scatter-select select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 0.78rem;
  color: var(--text-primary);
  text-transform: capitalize;
}
</style>

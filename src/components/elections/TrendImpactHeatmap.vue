<template>
  <section v-if="trends.length" class="trend-heatmap election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Trend Effects</p>
        <h3>Trend Impact Matrix</h3>
      </div>
    </div>
    <div class="trend-matrix">
      <div class="trend-matrix-header">
        <span class="trend-matrix-label"></span>
        <span v-for="party in visibleParties" :key="party" class="trend-matrix-party">
          <PartyBadge :party="party" short />
        </span>
      </div>
      <div v-for="trend in trends" :key="trend.id" class="trend-matrix-row">
        <span class="trend-matrix-label" :title="trend.description || ''">{{ trend.label }}</span>
        <span
          v-for="party in visibleParties"
          :key="`${trend.id}-${party}`"
          class="trend-matrix-cell"
          :class="cellClass(trend, party)"
          :style="cellStyle(trend, party)"
        >{{ cellLabel(trend, party) }}</span>
      </div>
    </div>
  </section>
</template>

<script>
import { computed } from 'vue'
import PartyBadge from './PartyBadge.vue'
import { PARTIES } from '../../domain/elections'

export default {
  name: 'TrendImpactHeatmap',
  components: { PartyBadge },
  props: {
    trends: { type: Array, required: true },
    partyMeta: { type: Object, required: true },
  },
  setup(props) {
    const visibleParties = computed(() =>
      PARTIES.filter((p) => props.partyMeta[p])
    )

    function getImpact(trend, party) {
      if (trend.party === party) return trend.magnitude || 0.5
      const effects = trend.effects || []
      for (const e of effects) {
        if (e.party === party) return e.magnitude || 0
      }
      if (trend.party && trend.party !== party) return -(trend.magnitude || 0.5) * 0.3
      return 0
    }

    function cellClass(trend, party) {
      const v = getImpact(trend, party)
      if (v > 0.05) return 'trend-cell--positive'
      if (v < -0.05) return 'trend-cell--negative'
      return 'trend-cell--neutral'
    }

    function cellStyle(trend, party) {
      const v = Math.abs(getImpact(trend, party))
      const opacity = Math.min(0.7, v * 1.5)
      return { '--cell-intensity': opacity }
    }

    function cellLabel(trend, party) {
      const v = getImpact(trend, party)
      if (Math.abs(v) < 0.02) return ''
      return v > 0 ? '+' : '-'
    }

    return { visibleParties, cellClass, cellStyle, cellLabel }
  },
}
</script>

<style scoped>
.trend-matrix {
  display: grid;
  gap: 4px;
}

.trend-matrix-header,
.trend-matrix-row {
  display: grid;
  grid-template-columns: minmax(140px, 1.5fr) repeat(v-bind('visibleParties.length'), 1fr);
  gap: 4px;
  align-items: center;
}

.trend-matrix-header {
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-subtle);
}

.trend-matrix-party {
  display: flex;
  justify-content: center;
}

.trend-matrix-label {
  font-size: 0.76rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trend-matrix-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 800;
}

.trend-cell--positive {
  background: rgba(76, 175, 80, var(--cell-intensity, 0.2));
  color: #81c784;
}

.trend-cell--negative {
  background: rgba(244, 67, 54, var(--cell-intensity, 0.2));
  color: #ef9a9a;
}

.trend-cell--neutral {
  background: var(--bg-input);
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .trend-matrix-label {
    font-size: 0.68rem;
  }
}
</style>

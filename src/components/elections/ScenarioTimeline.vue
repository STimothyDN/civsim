<template>
  <section v-if="nodes.length > 1" class="timeline-panel election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Election History</p>
        <h3>Scenario Timeline</h3>
      </div>
    </div>
    <div class="timeline-track">
      <div class="timeline-line"></div>
      <div
        v-for="(node, i) in nodes"
        :key="i"
        class="timeline-node"
        :class="{ 'timeline-node--current': node.isCurrent, 'timeline-node--confirmed': !node.isCurrent }"
        :style="{ '--node-color': node.color }"
      >
        <div class="timeline-dot">
          <i v-if="node.isCurrent" class="timeline-pulse"></i>
        </div>
        <div class="timeline-label">
          <strong>{{ node.year }}</strong>
          <span>{{ node.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'ScenarioTimeline',
  props: {
    electionNumber: { type: Number, required: true },
    trendHistory: { type: Array, required: true },
    scenarioName: { type: String, default: '' },
    partyMeta: { type: Object, required: true },
  },
  setup(props) {
    const nodes = computed(() => {
      const result = []
      const baseYear = 2026

      result.push({ year: baseYear, label: 'Baseline', isCurrent: false, color: 'var(--text-muted)' })

      for (let i = 0; i < props.trendHistory.length; i++) {
        const trends = props.trendHistory[i]
        const year = baseYear + (i + 1) * 2
        const topTrend = trends[0]
        const color = topTrend ? (props.partyMeta[topTrend.party]?.color || 'var(--accent)') : 'var(--accent)'
        const label = trends.length ? `${trends.length} trend${trends.length > 1 ? 's' : ''}` : 'No trends'
        result.push({ year, label, isCurrent: false, color })
      }

      const currentYear = baseYear + (props.electionNumber + 1) * 2
      result.push({
        year: currentYear,
        label: props.scenarioName || 'Preview',
        isCurrent: true,
        color: 'var(--accent)',
      })

      return result
    })

    return { nodes }
  },
}
</script>

<style scoped>
.timeline-track {
  display: flex;
  align-items: flex-start;
  gap: 0;
  position: relative;
  padding: 12px 0 0;
  overflow-x: auto;
}

.timeline-line {
  position: absolute;
  top: 22px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--border-subtle);
}

.timeline-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 80px;
  position: relative;
  z-index: 1;
}

.timeline-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--node-color);
  border: 2px solid var(--bg-surface);
  position: relative;
}

.timeline-node--confirmed .timeline-dot {
  opacity: 0.7;
}

.timeline-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  animation: tl-pulse 2s ease-in-out infinite;
}

@keyframes tl-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.3); }
}

.timeline-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  text-align: center;
}

.timeline-label strong {
  font-size: 0.82rem;
  color: var(--text-primary);
}

.timeline-label span {
  font-size: 0.68rem;
  color: var(--text-muted);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

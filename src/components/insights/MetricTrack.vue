<template>
  <div class="metric-track" :class="`metric-track--${tone}`">
    <div class="metric-track-line">
      <span class="metric-track-label">{{ label }}</span>
      <strong class="metric-track-value">{{ display }}</strong>
    </div>
    <div class="metric-track-bar" :class="{ 'metric-track-bar--negative': numeric < 0 }">
      <i :style="{ width: `${barWidth}%` }"></i>
    </div>
    <small v-if="hint" class="metric-track-hint">{{ hint }}</small>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'MetricTrack',
  props: {
    label: { type: String, required: true },
    value: { type: [Number, String], default: 0 },
    max: { type: Number, default: 100 },
    min: { type: Number, default: 0 },
    display: { type: String, default: '' },
    tone: { type: String, default: 'neutral' },
    hint: { type: String, default: '' },
  },
  setup(props) {
    const numeric = computed(() => {
      const n = Number(props.value)
      return Number.isFinite(n) ? n : 0
    })
    const barWidth = computed(() => {
      const span = props.max - props.min || 1
      const pct = ((numeric.value - props.min) / span) * 100
      return Math.max(0, Math.min(100, pct))
    })
    const display = computed(() => props.display || String(props.value))
    return { numeric, barWidth, display }
  },
}
</script>

<style scoped>
.metric-track { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 6px; }
.metric-track-line { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.metric-track-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #a9a39a); font-weight: 700; }
.metric-track-value { font-size: 0.95rem; font-weight: 700; color: var(--text-primary, #f1eee8); }
.metric-track-bar { position: relative; height: 4px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; }
.metric-track-bar i { display: block; height: 100%; border-radius: 999px; background: var(--accent, #d4a843); transition: width 0.3s ease; }
.metric-track-hint { font-size: 0.65rem; color: var(--text-muted, #a9a39a); }
.metric-track--good .metric-track-bar i { background: #4ade80; }
.metric-track--watch .metric-track-bar i { background: #facc15; }
.metric-track--risk .metric-track-bar i { background: #f87171; }
.metric-track--muted .metric-track-bar i { background: #6b7280; }
.metric-track--good .metric-track-value { color: #4ade80; }
.metric-track--watch .metric-track-value { color: #facc15; }
.metric-track--risk .metric-track-value { color: #f87171; }
.metric-track-bar--negative { background: rgba(248,113,113,0.16); }
</style>

<template>
  <div class="civic-gauge-strip" :class="{ 'civic-gauge-strip--compact': compact }">
    <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
    <div class="civic-gauge-grid">
      <MetricTrack
        v-for="metric in metrics"
        :key="metric.label"
        :label="metric.label"
        :value="metric.value"
        :min="metric.min"
        :max="metric.max"
        :display="metric.display"
        :tone="metric.tone"
        :hint="metric.hint"
      />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import MetricTrack from './MetricTrack.vue'
import { gaugeTone, formatNumber } from '../../domain/provinceVisualizations'

function pct(value) { return `${formatNumber(value)}%` }

export default {
  name: 'CivicGaugeStrip',
  components: { MetricTrack },
  props: {
    eyebrow: { type: String, default: '' },
    loyalty: { type: Number, default: 0 },
    happiness: { type: Number, default: 0 },
    growth: { type: Number, default: 0 },
    housing: { type: Number, default: 0 },
    netAmenities: { type: Number, default: 0 },
    netFood: { type: Number, default: 0 },
    compact: { type: Boolean, default: false },
    showInfra: { type: Boolean, default: true },
  },
  setup(props) {
    const metrics = computed(() => {
      const list = [
        { label: 'Loyalty', value: props.loyalty, min: 0, max: 100, display: pct(props.loyalty), tone: gaugeTone(props.loyalty) },
        { label: 'Happiness', value: props.happiness, min: 0, max: 100, display: pct(props.happiness), tone: gaugeTone(props.happiness) },
        { label: 'Growth', value: props.growth + 50, min: 0, max: 100, display: pct(props.growth), tone: gaugeTone(props.growth + 50, { goodAbove: 60, watchAbove: 45 }) },
      ]
      if (!props.showInfra) return list
      list.push(
        { label: 'Housing', value: Math.max(0, Math.min(20, props.housing)), min: 0, max: 20, display: formatNumber(props.housing), tone: props.housing > 0 ? 'good' : 'risk', hint: 'capacity buffer' },
        { label: 'Net Amenities', value: Math.max(-20, Math.min(20, props.netAmenities)) + 20, min: 0, max: 40, display: formatNumber(props.netAmenities), tone: props.netAmenities >= 0 ? 'good' : 'risk', hint: props.netAmenities >= 0 ? 'surplus' : 'deficit' },
        { label: 'Net Food', value: Math.max(-20, Math.min(20, props.netFood)) + 20, min: 0, max: 40, display: formatNumber(props.netFood), tone: props.netFood >= 0 ? 'good' : 'risk', hint: props.netFood >= 0 ? 'surplus' : 'deficit' },
      )
      return list
    })
    return { metrics }
  },
}
</script>

<style scoped>
.civic-gauge-strip { display: flex; flex-direction: column; gap: 8px; }
.eyebrow { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted, #a9a39a); margin: 0; }
.civic-gauge-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
.civic-gauge-strip--compact .civic-gauge-grid { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); }
</style>

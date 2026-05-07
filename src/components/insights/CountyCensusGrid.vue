<template>
  <div class="county-census-grid">
    <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
    <div class="census-summary">
      <div class="census-stat">
        <span>Counties</span>
        <strong>{{ formatNumber(countyCount) }}</strong>
        <small>{{ formatNumber(countyDetailCount) }} detailed</small>
      </div>
      <div class="census-stat">
        <span>Citizens Working</span>
        <strong>{{ formatNumber(citizensWorking) }}</strong>
        <small>across counties</small>
      </div>
      <div class="census-stat">
        <span>Avg Appeal</span>
        <strong>{{ formatNumber(averageAppeal) }}</strong>
        <small>{{ riverCount }} river · {{ railroadCount }} rail</small>
      </div>
    </div>
    <div class="census-bands">
      <section v-for="band in bands" :key="band.label" class="census-band">
        <div class="census-band-head">
          <strong>{{ band.label }}</strong>
          <small>{{ band.entries.length }} kinds</small>
        </div>
        <div v-if="!band.entries.length" class="empty-inline">No data</div>
        <div v-else class="census-pills">
          <span v-for="entry in band.entries.slice(0, 8)" :key="`${band.label}-${entry.name}`" class="census-pill">
            {{ entry.name }} <b>{{ entry.count }}</b>
          </span>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { formatNumber } from '../../domain/provinceVisualizations'

function rankCounts(map) {
  return Object.entries(map || {})
    .map(([name, count]) => ({ name: name || 'Unspecified', count: Number(count) || 0 }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)
}

export default {
  name: 'CountyCensusGrid',
  props: {
    eyebrow: { type: String, default: '' },
    countyCount: { type: Number, default: 0 },
    countyDetailCount: { type: Number, default: 0 },
    citizensWorking: { type: Number, default: 0 },
    averageAppeal: { type: Number, default: 0 },
    riverCount: { type: Number, default: 0 },
    railroadCount: { type: Number, default: 0 },
    terrainCounts: { type: Object, default: () => ({}) },
    featureCounts: { type: Object, default: () => ({}) },
    improvementCounts: { type: Object, default: () => ({}) },
    buildingCounts: { type: Object, default: () => ({}) },
    resourceCounts: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const bands = computed(() => [
      { label: 'Terrain', entries: rankCounts(props.terrainCounts) },
      { label: 'Features', entries: rankCounts(props.featureCounts) },
      { label: 'Improvements', entries: rankCounts(props.improvementCounts) },
      { label: 'Buildings', entries: rankCounts(props.buildingCounts) },
      { label: 'Resources', entries: rankCounts(props.resourceCounts) },
    ])
    return { bands, formatNumber }
  },
}
</script>

<style scoped>
.county-census-grid { display: flex; flex-direction: column; gap: 10px; }
.eyebrow { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted, #a9a39a); margin: 0; }
.census-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
.census-stat { display: flex; flex-direction: column; padding: 8px 10px; background: linear-gradient(135deg, rgba(212,168,67,0.08), transparent); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 6px; }
.census-stat span { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #a9a39a); font-weight: 700; }
.census-stat strong { font-size: 1.1rem; color: var(--accent, #d4a843); }
.census-stat small { font-size: 0.65rem; color: var(--text-muted, #a9a39a); }
.census-bands { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
.census-band { display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 6px; }
.census-band-head { display: flex; justify-content: space-between; align-items: baseline; }
.census-band-head strong { font-size: 0.78rem; font-weight: 700; }
.census-band-head small { font-size: 0.62rem; color: var(--text-muted, #a9a39a); }
.census-pills { display: flex; flex-wrap: wrap; gap: 4px; }
.census-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 0.7rem; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 999px; }
.census-pill b { color: var(--accent, #d4a843); font-weight: 700; }
.empty-inline { font-size: 0.7rem; color: var(--text-muted, #a9a39a); }
</style>

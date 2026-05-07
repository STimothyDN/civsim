<template>
  <div class="region-selector">
    <button
      v-for="region in enriched"
      :key="region.name"
      type="button"
      class="region-pill"
      :class="{ 'region-pill--active': region.name === modelValue }"
      :style="pillStyle(region)"
      @click="$emit('update:modelValue', region.name)"
    >
      <PartyBadge :party="region.controlParty" short />
      <div class="region-pill-info">
        <strong>{{ region.name }}</strong>
        <span>{{ formatCompactNumber(region.population) }} · {{ region.province_count }} prov</span>
      </div>
      <div class="region-pill-bar">
        <i
          v-for="seg in region.seatSegments"
          :key="seg.party"
          :style="{ flex: seg.seats, backgroundColor: seg.color }"
        ></i>
      </div>
    </button>
  </div>
</template>

<script>
import { computed } from 'vue'
import PartyBadge from './PartyBadge.vue'
import { PARTIES } from '../../domain/elections'
import { formatCompactNumber } from '../../domain/formatting'
import { topParty } from '../../domain/elections/viewHelpers'

export default {
  name: 'RegionSelectorPanel',
  components: { PartyBadge },
  props: {
    regions: { type: Array, required: true },
    partyMeta: { type: Object, required: true },
    modelValue: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  setup(props) {
    const enriched = computed(() =>
      props.regions.map((region) => {
        const controlParty = topParty(region.assembly?.vote_shares)
        const seats = region.assembly?.seats || {}
        const seatSegments = PARTIES
          .filter((p) => (seats[p] || 0) > 0)
          .map((p) => ({ party: p, seats: seats[p], color: props.partyMeta[p]?.color || '#666' }))
          .sort((a, b) => b.seats - a.seats)
        return { ...region, controlParty, seatSegments }
      })
    )

    function pillStyle(region) {
      if (region.name === props.modelValue) {
        const c = props.partyMeta[region.controlParty]?.color || '#666'
        return { borderColor: c + '55', boxShadow: `0 0 0 1px ${c}33` }
      }
      return {}
    }

    return { enriched, formatCompactNumber, pillStyle }
  },
}
</script>

<style scoped>
.region-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  padding: 4px 0;
}

.region-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.region-pill:hover {
  background: var(--bg-surface-overlay);
  border-color: var(--border);
}

.region-pill--active {
  background: var(--bg-surface-overlay);
}

.region-pill-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.region-pill-info strong {
  font-size: 0.82rem;
  color: var(--text-primary);
}

.region-pill-info span {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.region-pill-bar {
  display: flex;
  width: 48px;
  height: 4px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--bg-surface-overlay);
  flex-shrink: 0;
}

.region-pill-bar i {
  display: block;
  height: 100%;
}
</style>

<template>
  <section class="prov-selector election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Province Selection</p>
        <h3>Select a Province</h3>
      </div>
      <div class="prov-selector-search">
        <input
          v-model="search"
          type="text"
          placeholder="Filter provinces..."
          class="prov-selector-input"
        />
      </div>
    </div>

    <div class="prov-selector-groups">
      <details
        v-for="(group, gi) in groupedProvinces"
        :key="group.region"
        class="prov-selector-group"
        :open="gi === 0"
      >
        <summary class="prov-selector-region-summary">
          <span class="prov-selector-region-label">{{ group.region }}</span>
          <span class="prov-selector-region-count">{{ group.provinces.length }}</span>
        </summary>
        <div class="prov-selector-grid">
          <button
            v-for="prov in group.provinces"
            :key="prov.provinceIndex"
            type="button"
            class="prov-card"
            :class="{ 'prov-card--active': prov.provinceIndex === modelValue }"
            :style="cardBorderStyle(prov)"
            @click="$emit('update:modelValue', prov.provinceIndex)"
          >
            <div class="prov-card-top">
              <strong class="prov-card-name">{{ prov.name }}</strong>
              <PartyBadge :party="prov.controlParty" short />
            </div>
            <div class="prov-card-meta">
              <span>{{ formatCompactNumber(prov.provincial_population) }}</span>
              <span class="prov-card-dot"></span>
              <span>{{ prov.counties.length }} counties</span>
            </div>
            <div class="prov-card-bar">
              <i
                v-for="seg in prov.seatSegments"
                :key="seg.party"
                :style="{ flex: seg.seats, backgroundColor: seg.color }"
              ></i>
            </div>
          </button>
        </div>
      </details>
    </div>
  </section>
</template>

<script>
import { computed, ref } from 'vue'
import PartyBadge from './PartyBadge.vue'
import { PARTIES } from '../../domain/elections'
import { formatCompactNumber } from '../../domain/formatting'
import { topParty } from '../../domain/elections/viewHelpers'

export default {
  name: 'ProvinceSelectorGrid',
  components: { PartyBadge },
  props: {
    provinces: { type: Array, required: true },
    partyMeta: { type: Object, required: true },
    modelValue: { type: Number, default: 0 },
  },
  emits: ['update:modelValue'],
  setup(props) {
    const search = ref('')

    const enriched = computed(() =>
      props.provinces.map((prov) => {
        const controlParty = topParty(prov.assembly?.vote_shares)
        const seats = prov.assembly?.seats || {}
        const seatSegments = PARTIES
          .filter((p) => (seats[p] || 0) > 0)
          .map((p) => ({ party: p, seats: seats[p], color: props.partyMeta[p]?.color || '#666' }))
          .sort((a, b) => b.seats - a.seats)
        return { ...prov, controlParty, seatSegments }
      })
    )

    const groupedProvinces = computed(() => {
      const q = search.value.toLowerCase().trim()
      const filtered = q
        ? enriched.value.filter((p) => p.name.toLowerCase().includes(q) || (p.group || '').toLowerCase().includes(q))
        : enriched.value

      const groups = {}
      for (const prov of filtered) {
        const region = prov.group || 'Other'
        if (!groups[region]) groups[region] = { region, provinces: [] }
        groups[region].provinces.push(prov)
      }
      return Object.values(groups).sort((a, b) => a.region.localeCompare(b.region))
    })

    function cardBorderStyle(prov) {
      const color = props.partyMeta[prov.controlParty]?.color || '#666'
      if (prov.provinceIndex === props.modelValue) {
        return { borderColor: color, boxShadow: `0 0 0 1px ${color}44` }
      }
      return {}
    }

    return { search, groupedProvinces, formatCompactNumber, cardBorderStyle }
  },
}
</script>

<style scoped>
.prov-selector-search {
  min-width: 180px;
}

.prov-selector-input {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  font-size: 0.82rem;
  color: var(--text-primary);
}

.prov-selector-groups {
  display: grid;
  gap: 6px;
}

.prov-selector-group {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.prov-selector-region-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 12px;
  background: var(--bg-input);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.prov-selector-region-summary::-webkit-details-marker {
  display: none;
}

.prov-selector-region-summary::before {
  content: '▸';
  font-size: 0.6rem;
  color: var(--text-muted);
  transition: transform 0.15s;
  order: -1;
}

details[open] > .prov-selector-region-summary::before {
  transform: rotate(90deg);
}

.prov-selector-region-label {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  flex: 1;
}

.prov-selector-region-count {
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--bg-surface-overlay);
  border-radius: 999px;
  padding: 1px 7px;
}

.prov-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  padding: 8px;
}

.prov-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.prov-card:hover {
  background: var(--bg-surface-overlay);
  border-color: var(--border);
}

.prov-card--active {
  background: var(--bg-surface-overlay);
}

.prov-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.prov-card-name {
  font-size: 0.84rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prov-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.prov-card-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--text-muted);
}

.prov-card-bar {
  display: flex;
  height: 4px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--bg-surface-overlay);
}

.prov-card-bar i {
  display: block;
  height: 100%;
}

@media (max-width: 720px) {
  .prov-selector-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
</style>

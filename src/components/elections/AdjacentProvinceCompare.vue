<template>
  <section class="adj-compare election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Neighbors</p>
        <h3>Adjacent Province Comparison</h3>
      </div>
    </div>
    <div v-if="neighbors.length" class="adj-compare-grid">
      <div
        v-for="prov in allProvinces"
        :key="prov.name"
        class="adj-card"
        :class="{ 'adj-card--current': prov.isCurrent }"
        :style="cardStyle(prov)"
      >
        <div class="adj-card-header">
          <strong>{{ prov.name }}</strong>
          <span v-if="prov.isCurrent" class="adj-card-tag">Current</span>
        </div>
        <div class="adj-card-meta">
          <PartyBadge :party="prov.controlParty" short />
          <span>{{ formatCompactNumber(prov.population) }}</span>
        </div>
        <div class="adj-card-bars">
          <div v-for="seg in prov.partyBars" :key="seg.party" class="adj-bar-row">
            <span class="adj-bar-label">{{ seg.abbrev }}</span>
            <div class="adj-bar-track">
              <i :style="{ width: seg.pct + '%', backgroundColor: seg.color }"></i>
            </div>
            <span class="adj-bar-val">{{ seg.label }}</span>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="adj-empty">No adjacent provinces.</p>
  </section>
</template>

<script>
import { computed } from 'vue'
import PartyBadge from './PartyBadge.vue'
import { PARTIES, formatShare } from '../../domain/elections'
import { formatCompactNumber } from '../../domain/formatting'
import { topParty } from '../../domain/elections/viewHelpers'

function buildProvData(prov, partyMeta, isCurrent) {
  const voteShares = prov.assembly?.vote_shares || prov.political_features || {}
  const controlParty = topParty(voteShares)
  const partyBars = PARTIES
    .filter((p) => (voteShares[p] || 0) > 0.005)
    .map((p) => ({
      party: p,
      abbrev: partyMeta[p]?.abbreviation || p.slice(0, 3),
      color: partyMeta[p]?.color || '#666',
      pct: (voteShares[p] || 0) * 100,
      label: formatShare(voteShares[p] || 0),
    }))
    .sort((a, b) => b.pct - a.pct)

  return {
    name: prov.name,
    isCurrent,
    controlParty,
    population: prov.provincial_population || prov.population || 0,
    partyBars,
    color: partyMeta[controlParty]?.color || '#666',
  }
}

export default {
  name: 'AdjacentProvinceCompare',
  components: { PartyBadge },
  props: {
    province: { type: Object, required: true },
    partyMeta: { type: Object, required: true },
  },
  setup(props) {
    const neighbors = computed(() => props.province.adjacent_provinces || [])

    const allProvinces = computed(() => {
      const current = buildProvData(props.province, props.partyMeta, true)
      const adj = neighbors.value.map((n) => buildProvData(n, props.partyMeta, false))
      return [current, ...adj]
    })

    function cardStyle(prov) {
      if (prov.isCurrent) {
        return { borderColor: prov.color + '55', background: `linear-gradient(135deg, ${prov.color}0a, transparent 60%), var(--bg-input)` }
      }
      return {}
    }

    return { neighbors, allProvinces, formatCompactNumber, cardStyle }
  },
}
</script>

<style scoped>
.adj-compare-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.adj-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.adj-card--current {
  order: -1;
}

.adj-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.adj-card-header strong {
  font-size: 0.86rem;
  color: var(--text-primary);
}

.adj-card-tag {
  font-size: 0.62rem;
  font-weight: 800;
  color: var(--accent);
  background: rgba(212, 168, 67, 0.12);
  border: 1px solid rgba(212, 168, 67, 0.28);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.adj-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.74rem;
  color: var(--text-muted);
}

.adj-card-bars {
  display: grid;
  gap: 4px;
}

.adj-bar-row {
  display: grid;
  grid-template-columns: 32px 1fr 44px;
  gap: 6px;
  align-items: center;
}

.adj-bar-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}

.adj-bar-track {
  height: 6px;
  border-radius: 999px;
  background: var(--bg-surface-overlay);
  overflow: hidden;
}

.adj-bar-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.adj-bar-val {
  font-size: 0.72rem;
  color: var(--text-secondary);
  text-align: right;
}

.adj-empty {
  color: var(--text-muted);
  font-size: 0.86rem;
  text-align: center;
  padding: 16px;
}
</style>

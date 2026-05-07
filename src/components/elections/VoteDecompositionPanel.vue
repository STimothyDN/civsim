<template>
  <section class="decomp-panel election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Vote Blend</p>
        <h3>Local vs Climate Decomposition</h3>
      </div>
      <div class="decomp-weights">
        <span>{{ localPct }} local</span>
        <span class="decomp-divider">/</span>
        <span>{{ climatePct }} climate</span>
      </div>
    </div>

    <div class="decomp-rows">
      <div class="decomp-header">
        <span>Party</span>
        <span>Local</span>
        <span>Climate</span>
        <span>Final</span>
        <span>Delta</span>
      </div>
      <div v-for="row in rows" :key="row.party" class="decomp-row">
        <div class="decomp-party"><PartyBadge :party="row.party" short /></div>
        <div class="decomp-cell">
          <div class="decomp-bar">
            <i :style="{ width: row.localPct + '%', backgroundColor: row.color + '88' }"></i>
          </div>
          <span>{{ row.localLabel }}</span>
        </div>
        <div class="decomp-cell">
          <div class="decomp-bar">
            <i :style="{ width: row.climatePct + '%', backgroundColor: row.color + '88' }"></i>
          </div>
          <span>{{ row.climateLabel }}</span>
        </div>
        <div class="decomp-cell decomp-cell--final">
          <div class="decomp-bar decomp-bar--final">
            <i :style="{ width: row.finalPct + '%', backgroundColor: row.color }"></i>
          </div>
          <strong>{{ row.finalLabel }}</strong>
        </div>
        <div class="decomp-delta" :class="deltaClass(row.delta)">{{ row.deltaLabel }}</div>
      </div>
    </div>
  </section>
</template>

<script>
import { computed } from 'vue'
import PartyBadge from './PartyBadge.vue'
import { PARTIES, formatShare } from '../../domain/elections'

export default {
  name: 'VoteDecompositionPanel',
  components: { PartyBadge },
  props: {
    results: { type: Object, required: true },
    partyMeta: { type: Object, required: true },
  },
  setup(props) {
    const assembly = computed(() => props.results.national.assembly)

    const localPct = computed(() => formatShare(assembly.value.vote_blend?.local_weight || 0))
    const climatePct = computed(() => formatShare(assembly.value.vote_blend?.climate_weight || 0))

    const rows = computed(() => {
      const maxShare = Math.max(
        ...PARTIES.map(p => Math.max(
          Number(assembly.value.local_vote_shares?.[p] || 0),
          Number(assembly.value.climate_vote_shares?.[p] || 0),
          Number(assembly.value.vote_shares?.[p] || 0),
        ))
      )
      const scale = maxShare > 0 ? 100 / maxShare : 1

      return PARTIES.map((party) => {
        const local = Number(assembly.value.local_vote_shares?.[party] || 0)
        const climate = Number(assembly.value.climate_vote_shares?.[party] || 0)
        const final_ = Number(assembly.value.vote_shares?.[party] || 0)
        const delta = final_ - local
        return {
          party,
          color: props.partyMeta[party]?.color || '#666',
          localPct: local * scale,
          climatePct: climate * scale,
          finalPct: final_ * scale,
          localLabel: formatShare(local),
          climateLabel: formatShare(climate),
          finalLabel: formatShare(final_),
          delta,
          deltaLabel: `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`,
        }
      })
        .filter(r => Number(r.finalPct) > 0.1)
        .sort((a, b) => b.finalPct - a.finalPct)
    })

    function deltaClass(delta) {
      return delta > 0.001 ? 'delta-positive' : delta < -0.001 ? 'delta-negative' : 'delta-neutral'
    }

    return { localPct, climatePct, rows, deltaClass }
  },
}
</script>

<style scoped>
.decomp-weights {
  display: flex;
  gap: 6px;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.decomp-divider { color: var(--border); }

.decomp-rows {
  display: grid;
  gap: 6px;
}

.decomp-header,
.decomp-row {
  display: grid;
  grid-template-columns: 100px 1fr 1fr 1fr 60px;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.decomp-header {
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.decomp-row {
  padding: 6px 4px;
  border-radius: var(--radius-sm);
}

.decomp-row:hover {
  background: rgba(255, 255, 255, 0.025);
}

.decomp-cell {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.decomp-cell span,
.decomp-cell strong {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.decomp-cell strong {
  color: var(--text-primary);
}

.decomp-bar {
  height: 8px;
  border-radius: 999px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
}

.decomp-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.3s ease;
}

.decomp-bar--final {
  height: 10px;
}

.decomp-delta {
  font-size: 0.78rem;
  font-weight: 700;
  text-align: right;
}

@media (max-width: 720px) {
  .decomp-header,
  .decomp-row {
    grid-template-columns: 80px 1fr 1fr 1fr 50px;
    gap: 6px;
  }
}
</style>

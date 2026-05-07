<template>
  <section class="power-strip">
    <div v-for="chamber in chambers" :key="chamber.label" class="power-strip-chamber">
      <span class="power-strip-label">{{ chamber.label }}</span>
      <div class="power-strip-bar">
        <div
          v-for="seg in chamber.segments"
          :key="seg.party"
          class="power-strip-seg"
          :class="{ 'power-strip-seg--dim': highlightedParty && highlightedParty !== seg.party }"
          :style="{ width: seg.pct + '%', backgroundColor: seg.color }"
          :title="`${partyMeta[seg.party]?.name || seg.party}: ${seg.count} seats (${seg.pct.toFixed(1)}%)`"
          @click="uiStore.setHighlightedParty(seg.party)"
        />
      </div>
      <span class="power-strip-total">{{ chamber.total }}</span>
    </div>
  </section>
</template>

<script>
import { computed } from 'vue'
import { PARTIES } from '../../domain/elections'
import { useUiStore } from '../../stores/uiStore'

export default {
  name: 'PowerBalanceStrip',
  props: {
    results: { type: Object, required: true },
    partyMeta: { type: Object, required: true },
  },
  setup(props) {
    const uiStore = useUiStore()
    const highlightedParty = computed(() => uiStore.highlightedParty)

    function makeSegments(seats, seatCount) {
      const total = Math.max(1, seatCount)
      return PARTIES
        .map((party) => ({
          party,
          count: seats[party] || 0,
          color: props.partyMeta[party]?.color || '#666',
          pct: ((seats[party] || 0) / total) * 100,
        }))
        .filter((s) => s.count > 0)
        .sort((a, b) => b.count - a.count)
    }

    const chambers = computed(() => [
      {
        label: 'Assembly',
        total: props.results.national.assembly.seat_count,
        segments: makeSegments(props.results.national.assembly.seats, props.results.national.assembly.seat_count),
      },
      {
        label: 'Council',
        total: props.results.national.prelates.seat_count,
        segments: makeSegments(props.results.national.prelates.seats, props.results.national.prelates.seat_count),
      },
    ])

    return { chambers, uiStore, highlightedParty }
  },
}
</script>

<style scoped>
.power-strip {
  display: grid;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.power-strip-chamber {
  display: grid;
  grid-template-columns: 70px 1fr 40px;
  gap: 10px;
  align-items: center;
}

.power-strip-label {
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.power-strip-bar {
  display: flex;
  height: 18px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
}

.power-strip-seg {
  height: 100%;
  min-width: 2px;
  cursor: pointer;
  transition: opacity var(--transition-fast), filter var(--transition-fast);
}

.power-strip-seg:hover {
  filter: brightness(1.2);
}

.power-strip-seg--dim {
  opacity: 0.25;
}

.power-strip-total {
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 700;
  text-align: right;
}
</style>

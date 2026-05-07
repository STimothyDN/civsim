<template>
  <section class="coalition-panel election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">Coalition Arithmetic</p>
        <h3>Possible Majorities</h3>
      </div>
      <div class="coalition-toggle">
        <button
          v-for="ch in chamberOptions"
          :key="ch.key"
          type="button"
          class="btn-sm"
          :class="{ 'btn-sm--active': activeChamber === ch.key }"
          @click="activeChamber = ch.key"
        >{{ ch.label }}</button>
      </div>
    </div>

    <div v-if="coalitions.length" class="coalition-list">
      <div
        v-for="(c, i) in coalitions"
        :key="i"
        class="coalition-row"
        :class="{ 'coalition-row--governing': c.isGoverning }"
      >
        <div class="coalition-parties">
          <PartyBadge v-for="p in c.parties" :key="p" :party="p" short />
        </div>
        <div class="coalition-seats">
          <strong>{{ c.totalSeats }}</strong>
          <span>/ {{ majorityTarget }}</span>
        </div>
        <span v-if="c.isGoverning" class="coalition-badge">Current</span>
        <div class="coalition-bar">
          <i :style="{ width: c.pct + '%' }"></i>
          <i v-if="c.pct < 100" class="coalition-bar-threshold" :style="{ left: '50%' }"></i>
        </div>
      </div>
    </div>
    <p v-else class="coalition-empty">No coalition can form a majority.</p>
  </section>
</template>

<script>
import { computed, ref } from 'vue'
import PartyBadge from './PartyBadge.vue'
import { PARTIES } from '../../domain/elections'

export default {
  name: 'CoalitionArithmeticPanel',
  components: { PartyBadge },
  props: {
    results: { type: Object, required: true },
    partyMeta: { type: Object, required: true },
  },
  setup(props) {
    const activeChamber = ref('assembly')
    const chamberOptions = [
      { key: 'assembly', label: 'Assembly' },
      { key: 'prelates', label: 'Council' },
    ]

    const chamberData = computed(() =>
      activeChamber.value === 'assembly'
        ? props.results.national.assembly
        : props.results.national.prelates
    )

    const totalSeats = computed(() => chamberData.value.seat_count)
    const majorityTarget = computed(() => Math.floor(totalSeats.value / 2) + 1)
    const governingParty = computed(() => chamberData.value.control?.leaderParty)
    const governingCoalition = computed(() => {
      const parties = chamberData.value.control?.parties || []
      return new Set(parties.length ? parties : [governingParty.value])
    })

    const coalitions = computed(() => {
      const seats = chamberData.value.seats
      const partiesWithSeats = PARTIES.filter(p => (seats[p] || 0) > 0)
        .sort((a, b) => (seats[b] || 0) - (seats[a] || 0))

      const results = []
      const target = majorityTarget.value

      for (let i = 0; i < partiesWithSeats.length; i++) {
        const a = partiesWithSeats[i]
        const aSeats = seats[a] || 0
        if (aSeats >= target) {
          results.push({ parties: [a], totalSeats: aSeats, isGoverning: false })
        }
        for (let j = i + 1; j < partiesWithSeats.length; j++) {
          const b = partiesWithSeats[j]
          const sum2 = aSeats + (seats[b] || 0)
          if (sum2 >= target) {
            results.push({ parties: [a, b], totalSeats: sum2, isGoverning: false })
          }
          for (let k = j + 1; k < partiesWithSeats.length; k++) {
            const c = partiesWithSeats[k]
            const sum3 = sum2 + (seats[c] || 0)
            if (sum3 >= target) {
              results.push({ parties: [a, b, c], totalSeats: sum3, isGoverning: false })
            }
          }
        }
      }

      return results
        .map(c => {
          const isGov = c.parties.length === governingCoalition.value.size &&
            c.parties.every(p => governingCoalition.value.has(p))
          return {
            ...c,
            isGoverning: isGov,
            pct: (c.totalSeats / totalSeats.value) * 100,
          }
        })
        .sort((a, b) => {
          if (a.isGoverning !== b.isGoverning) return a.isGoverning ? -1 : 1
          return a.parties.length - b.parties.length || b.totalSeats - a.totalSeats
        })
        .slice(0, 12)
    })

    return { activeChamber, chamberOptions, coalitions, majorityTarget }
  },
}
</script>

<style scoped>
.coalition-toggle {
  display: flex;
  gap: 4px;
}

.btn-sm--active {
  color: var(--accent) !important;
  background: rgba(212, 168, 67, 0.12) !important;
  border-color: rgba(212, 168, 67, 0.28) !important;
}

.coalition-list {
  display: grid;
  gap: 8px;
}

.coalition-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.coalition-row--governing {
  border-color: rgba(212, 168, 67, 0.35);
  background:
    linear-gradient(135deg, rgba(212, 168, 67, 0.08), transparent 60%),
    var(--bg-input);
}

.coalition-parties {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.coalition-seats {
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}

.coalition-seats strong {
  font-size: 1rem;
  color: var(--text-primary);
}

.coalition-seats span {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.coalition-badge {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--accent);
  background: rgba(212, 168, 67, 0.12);
  border: 1px solid rgba(212, 168, 67, 0.28);
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.coalition-bar {
  grid-column: 1 / -1;
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: var(--bg-surface-overlay);
  overflow: hidden;
}

.coalition-bar i:first-child {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  opacity: 0.6;
}

.coalition-bar-threshold {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: var(--text-muted);
}

.coalition-empty {
  color: var(--text-muted);
  font-size: 0.86rem;
  text-align: center;
  padding: 16px;
}
</style>

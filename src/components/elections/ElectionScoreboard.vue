<template>
  <section class="scoreboard" :style="gradientStyle">
    <div class="scoreboard-chamber scoreboard-chamber--left">
      <span class="scoreboard-label">Assembly</span>
      <div class="scoreboard-call">
        <PartyBadge :party="assemblyControl.leaderParty" short />
        <strong class="scoreboard-call-text" :style="{ color: assemblyColor }">{{ assemblyControl.label }}</strong>
      </div>
      <div class="scoreboard-seats">
        <span>{{ assemblySeatCount }} seats</span>
        <span class="scoreboard-majority">{{ assemblyMajority }} majority</span>
      </div>
      <div v-if="assemblyLeaderName" class="scoreboard-leader">
        <span class="scoreboard-leader-title">Prime Minister</span>
        <span class="scoreboard-leader-name">
          {{ assemblyLeaderName }}
          <IncumbencyBadge :is-incumbent="assemblyLeaderIncumbent" />
        </span>
      </div>
    </div>

    <div class="scoreboard-center">
      <span class="scoreboard-year">{{ electionYear }}</span>
      <strong class="scoreboard-country">{{ countryName }}</strong>
      <span class="scoreboard-subtitle">{{ formatCompactNumber(population) }} people · {{ provinceCount }} provinces · {{ regionCount }} regions</span>
    </div>

    <div class="scoreboard-chamber scoreboard-chamber--right">
      <span class="scoreboard-label">Council</span>
      <div class="scoreboard-call">
        <PartyBadge :party="councilControl.leaderParty" short />
        <strong class="scoreboard-call-text" :style="{ color: councilColor }">{{ councilControl.label }}</strong>
      </div>
      <div class="scoreboard-seats">
        <span>{{ councilSeatCount }} seats</span>
        <span class="scoreboard-majority">{{ councilMajority }} majority</span>
      </div>
      <div v-if="councilLeaderName" class="scoreboard-leader">
        <span class="scoreboard-leader-title">Principal Chancellor</span>
        <span class="scoreboard-leader-name">
          {{ councilLeaderName }}
          <IncumbencyBadge :is-incumbent="councilLeaderIncumbent" />
        </span>
      </div>
    </div>
  </section>
</template>

<script>
import { computed } from 'vue'
import PartyBadge from './PartyBadge.vue'
import IncumbencyBadge from './IncumbencyBadge.vue'
import { formatCompactNumber } from '../../domain/formatting'

export default {
  name: 'ElectionScoreboard',
  components: { PartyBadge, IncumbencyBadge },
  props: {
    results: { type: Object, required: true },
    partyMeta: { type: Object, required: true },
    countryName: { type: String, default: '' },
    electionYear: { type: [Number, String], default: '' },
    assemblyLeaderName: { type: String, default: '' },
    councilLeaderName: { type: String, default: '' },
    assemblyLeaderIncumbent: { type: Boolean, default: null },
    councilLeaderIncumbent: { type: Boolean, default: null },
  },
  setup(props) {
    const assemblyControl = computed(() => props.results.national.assembly.control)
    const councilControl = computed(() => props.results.national.prelates.control)
    const assemblyColor = computed(() => props.partyMeta[assemblyControl.value.leaderParty]?.color || '#d4a843')
    const councilColor = computed(() => props.partyMeta[councilControl.value.leaderParty]?.color || '#d4a843')
    const assemblySeatCount = computed(() => props.results.national.assembly.seat_count)
    const councilSeatCount = computed(() => props.results.national.prelates.seat_count)
    const assemblyMajority = computed(() => props.results.national.assembly.control.majority)
    const councilMajority = computed(() => props.results.national.prelates.control.majority)
    const population = computed(() => props.results.national.population)
    const provinceCount = computed(() => props.results.provinces.length)
    const regionCount = computed(() => Object.keys(props.results.regions).length)

    const gradientStyle = computed(() => ({
      '--sb-left': assemblyColor.value,
      '--sb-right': councilColor.value,
    }))

    return {
      assemblyControl,
      councilControl,
      assemblyColor,
      councilColor,
      assemblySeatCount,
      councilSeatCount,
      assemblyMajority,
      councilMajority,
      population,
      provinceCount,
      regionCount,
      gradientStyle,
      formatCompactNumber,
    }
  },
}
</script>

<style scoped>
.scoreboard {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: center;
  padding: 20px 24px;
  background:
    linear-gradient(90deg,
      color-mix(in srgb, var(--sb-left) 10%, transparent) 0%,
      transparent 35%,
      transparent 65%,
      color-mix(in srgb, var(--sb-right) 10%, transparent) 100%
    ),
    var(--el-panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--el-radius-panel);
  position: relative;
  overflow: hidden;
}

.scoreboard::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--sb-left) 35%, transparent),
    transparent 30%,
    transparent 70%,
    color-mix(in srgb, var(--sb-right) 35%, transparent)
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

.scoreboard-chamber {
  display: grid;
  gap: 6px;
}

.scoreboard-chamber--right {
  text-align: right;
  justify-items: end;
}

.scoreboard-label {
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.scoreboard-call {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scoreboard-chamber--right .scoreboard-call {
  flex-direction: row-reverse;
}

.scoreboard-call-text {
  font-family: 'Cinzel', serif;
  font-size: 1.15rem;
  font-weight: 700;
}

.scoreboard-seats {
  display: flex;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.scoreboard-chamber--right .scoreboard-seats {
  justify-content: flex-end;
}

.scoreboard-majority {
  color: var(--text-muted);
}

.scoreboard-leader {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-top: 4px;
  border-top: 1px solid var(--border-subtle);
}

.scoreboard-leader-title {
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.scoreboard-leader-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
}

.scoreboard-chamber--right .scoreboard-leader {
  align-items: flex-end;
}

.scoreboard-center {
  display: grid;
  justify-items: center;
  gap: 2px;
  text-align: center;
  padding: 0 12px;
}

.scoreboard-year {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--accent);
  text-transform: uppercase;
}

.scoreboard-country {
  font-family: 'Cinzel', serif;
  font-size: 1.1rem;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.scoreboard-subtitle {
  color: var(--text-muted);
  font-size: 0.76rem;
}

@media (max-width: 720px) {
  .scoreboard {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .scoreboard-center {
    grid-column: 1 / -1;
    order: -1;
    padding: 0;
  }
  .scoreboard-call-text {
    font-size: 0.95rem;
  }
}
</style>

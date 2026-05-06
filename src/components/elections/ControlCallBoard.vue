<template>
  <div class="election-call-board" :class="boardClass">
    <article
      v-for="unit in sortedUnits"
      :key="unitKey(unit)"
      class="election-call-card winner-control-card"
      :style="controlCardStyle(unit.assembly?.control)"
    >
      <div class="election-call-card-main">
        <strong>{{ unit.name }}</strong>
        <span>{{ unitMeta(unit) }}</span>
      </div>
      <div class="election-call-card-chambers">
        <div>
          <small>Assembly</small>
          <PartyBadge :party="unit.assembly?.control?.leaderParty || fallbackParty" short />
          <b>{{ unit.assembly?.control?.label }}</b>
        </div>
        <div :style="controlCardStyle(unit.prelates?.control)">
          <small>Council</small>
          <PartyBadge :party="unit.prelates?.control?.leaderParty || fallbackParty" short />
          <b>{{ unit.prelates?.control?.label }}</b>
        </div>
      </div>
    </article>
  </div>
</template>

<script>
import { computed } from 'vue'
import { formatCompactNumber } from '../../domain/formatting'
import { winnerControlStyle } from '../../domain/elections'
import PartyBadge from './PartyBadge.vue'

export default {
  name: 'ControlCallBoard',
  components: { PartyBadge },
  props: {
    units: { type: Array, default: () => [] },
    kind: { type: String, default: 'province' },
    partyMeta: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const sortedUnits = computed(() => [...props.units].sort((a, b) => {
      const aPopulation = Number(a.population ?? a.provincial_population ?? 0)
      const bPopulation = Number(b.population ?? b.provincial_population ?? 0)
      return bPopulation - aPopulation || String(a.name || '').localeCompare(String(b.name || ''))
    }))
    const boardClass = computed(() => props.kind === 'region' ? 'election-call-board--regions' : 'election-call-board--provinces')

    function unitKey(unit) {
      return props.kind === 'region' ? unit.name : unit.provinceIndex ?? unit.name
    }

    function unitMeta(unit) {
      if (props.kind === 'region') {
        return `${formatCompactNumber(unit.population)} people · ${unit.province_count || 0} provinces`
      }
      return `${unit.group || 'Unassigned'} · ${formatCompactNumber(unit.provincial_population)}`
    }

    function controlCardStyle(control) {
      return winnerControlStyle(control, props.partyMeta)
    }

    return { boardClass, controlCardStyle, fallbackParty: 'yellow', sortedUnits, unitKey, unitMeta }
  },
}
</script>

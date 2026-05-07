<template>
  <div v-if="partyShifts.length" class="party-shift-list">
    <div v-for="shift in partyShifts" :key="shift.party" class="party-shift-card" :style="shift.style">
      <PartyBadge :party="shift.party" short />
      <strong>{{ shift.shiftFormatted }}</strong>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useCivilizationStore } from '../../stores/civilizationStore'
import { PARTIES } from '../../domain/elections'
import PartyBadge from './PartyBadge.vue'

export default {
  name: 'PartySwingCards',
  components: { PartyBadge },
  props: {
    currentShares: { type: Object, default: () => ({}) },
    baselineShares: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const civStore = useCivilizationStore()

    const partyShifts = computed(() => {
      return PARTIES.map((party) => {
        const current = Number(props.currentShares?.[party] || 0)
        const baseline = Number(props.baselineShares?.[party] || 0)
        const diff = current - baseline
        return {
          party,
          diff,
          shiftFormatted: `${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)}%`,
          style: {
            '--shift-color': civStore.partyMeta[party]?.color || '#888',
            '--shift-bg': `${civStore.partyMeta[party]?.color || '#888'}15`,
            '--shift-border': `${civStore.partyMeta[party]?.color || '#888'}40`,
          },
        }
      }).filter((p) => Math.abs(p.diff) >= 0.0005).sort((a, b) => b.diff - a.diff)
    })

    return { partyShifts }
  },
}
</script>

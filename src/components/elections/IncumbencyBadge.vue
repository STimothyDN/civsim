<template>
  <span
    v-if="status !== null"
    class="incumbency-badge"
    :class="status ? 'incumbency-badge--incumbent' : 'incumbency-badge--new'"
  >
    {{ status ? 'INCUMBENT' : 'NEW' }}
  </span>
</template>

<script>
import { computed } from 'vue'
import { useElectionStore } from '../../stores/electionStore'

export default {
  name: 'IncumbencyBadge',
  props: {
    party: { type: String, default: null },
    seatIndex: { type: Number, default: null },
    isIncumbent: { type: Boolean, default: null },
  },
  setup(props) {
    const electionStore = useElectionStore()

    const status = computed(() => {
      if (electionStore.isBaseline) return null
      if (props.isIncumbent !== null && props.isIncumbent !== undefined) {
        return Boolean(props.isIncumbent)
      }
      if (!props.party || props.seatIndex === null || props.seatIndex === undefined) return null
      return electionStore.isRepresentativeIncumbent(props.party, props.seatIndex)
    })

    return { status }
  },
}
</script>

<style scoped>
.incumbency-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  border-radius: var(--radius-sm, 4px);
  vertical-align: middle;
  white-space: nowrap;
}

.incumbency-badge--incumbent {
  background: linear-gradient(135deg, #3b82f622, #3b82f611);
  border: 1px solid #3b82f666;
  color: #3b82f6;
}

.incumbency-badge--new {
  background: linear-gradient(135deg, #2dd4bf22, #2dd4bf11);
  border: 1px solid #2dd4bf66;
  color: #2dd4bf;
}
</style>

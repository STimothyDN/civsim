<template>
  <span class="party-badge" :style="badgeStyle">
    <span class="party-badge-dot" :style="{ backgroundColor: meta.color }"></span>
    <span>{{ short ? partyLabel : meta.name }}</span>
  </span>
</template>

<script>
import { computed } from 'vue'
import { useFormStore } from '../../stores/formStore'

export default {
  name: 'PartyBadge',
  props: {
    party: { type: String, required: true },
    short: { type: Boolean, default: false },
  },
  setup(props) {
    const store = useFormStore()
    const meta = computed(() => store.partyMeta[props.party] || { name: props.party, color: '#9b9a97' })
    const partyLabel = computed(() => props.party.charAt(0).toUpperCase() + props.party.slice(1))
    const badgeStyle = computed(() => ({
      borderColor: `${meta.value.color}55`,
      color: meta.value.color,
      backgroundColor: `${meta.value.color}16`,
    }))

    return { badgeStyle, meta, partyLabel }
  },
}
</script>

<template>
  <span
    v-if="status"
    class="leader-status-badge"
    :class="`leader-status-badge--${status}`"
  >
    {{ label }}
  </span>
</template>

<script>
import { computed } from 'vue'

const LABELS = {
  'incumbent': 'INCUMBENT',
  'new-leader': 'NEW LEADER',
  'new-government': 'NEW GOVERNMENT',
}

export default {
  name: 'LeaderStatusBadge',
  props: {
    // One of: 'incumbent' | 'new-leader' | 'new-government' | null
    status: { type: String, default: null },
  },
  setup(props) {
    const label = computed(() => LABELS[props.status] || '')
    return { label }
  },
}
</script>

<style scoped>
.leader-status-badge {
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

/* Same party, same person — blue */
.leader-status-badge--incumbent {
  background: linear-gradient(135deg, #3b82f622, #3b82f611);
  border: 1px solid #3b82f666;
  color: #3b82f6;
}

/* Same party, different person — orange */
.leader-status-badge--new-leader {
  background: linear-gradient(135deg, #f59e0b22, #f59e0b11);
  border: 1px solid #f59e0b66;
  color: #f59e0b;
}

/* Different party in power — red */
.leader-status-badge--new-government {
  background: linear-gradient(135deg, #ef444422, #ef444411);
  border: 1px solid #ef444466;
  color: #ef4444;
}
</style>

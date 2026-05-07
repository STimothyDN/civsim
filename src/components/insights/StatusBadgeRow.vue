<template>
  <div class="status-badge-row">
    <span
      v-for="badge in resolved"
      :key="badge.label"
      class="status-badge"
      :class="`status-badge--${badge.tone}`"
    >{{ badge.label }}</span>
  </div>
</template>

<script>
import { computed } from 'vue'

const STATUS_DEFS = [
  { key: 'is_national_capital', label: 'National Capital', tone: 'gold' },
  { key: 'is_regional_capital', label: 'Regional Capital', tone: 'teal' },
  { key: 'is_founded', label: 'Founded', tone: 'green' },
  { key: 'is_joined', label: 'Joined', tone: 'blue' },
  { key: 'is_conquered', label: 'Conquered', tone: 'red' },
]

export default {
  name: 'StatusBadgeRow',
  props: {
    status: { type: Object, default: () => ({}) },
    badges: { type: Array, default: null },
    fallback: { type: String, default: 'Unmarked' },
  },
  setup(props) {
    const resolved = computed(() => {
      if (Array.isArray(props.badges) && props.badges.length) return props.badges
      const list = STATUS_DEFS.filter((def) => props.status?.[def.key]).map((def) => ({ label: def.label, tone: def.tone }))
      return list.length ? list : [{ label: props.fallback, tone: 'muted' }]
    })
    return { resolved }
  },
}
</script>

<style scoped>
.status-badge-row { display: flex; flex-wrap: wrap; gap: 6px; }
.status-badge { display: inline-flex; align-items: center; padding: 3px 8px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; border-radius: 999px; border: 1px solid currentColor; background: rgba(255,255,255,0.02); }
.status-badge--gold { color: #d4a843; background: rgba(212,168,67,0.12); }
.status-badge--teal { color: #2dd4bf; background: rgba(45,212,191,0.12); }
.status-badge--green { color: #4ade80; background: rgba(74,222,128,0.12); }
.status-badge--blue { color: #60a5fa; background: rgba(96,165,250,0.12); }
.status-badge--red { color: #f87171; background: rgba(248,113,113,0.12); }
.status-badge--muted { color: #94a3b8; background: rgba(148,163,184,0.08); }
</style>

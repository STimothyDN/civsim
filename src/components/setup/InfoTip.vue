<template>
  <span class="info-tip" tabindex="0" role="note" :aria-label="text">
    <Info :size="13" />
    <span class="info-tip__bubble">{{ text }}</span>
  </span>
</template>

<script>
import { Info } from 'lucide-vue-next'

export default {
  name: 'InfoTip',
  components: { Info },
  props: {
    text: { type: String, required: true },
  },
}
</script>

<style scoped>
.info-tip {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: var(--text-muted, #94a3b8);
  cursor: help;
  vertical-align: middle;
  outline: none;
}
.info-tip:hover,
.info-tip:focus-visible {
  color: var(--accent, #818cf8);
}
.info-tip__bubble {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: 260px;
  padding: 8px 10px;
  background: var(--bg-surface, #0f172a);
  color: var(--text-secondary, #cbd5e1);
  border: 1px solid var(--border, #2a3344);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  font-size: 0.72rem;
  font-weight: 400;
  line-height: 1.35;
  letter-spacing: normal;
  text-transform: none;
  white-space: normal;
  opacity: 0;
  visibility: hidden;
  transition: opacity 120ms ease;
  z-index: 50;
  pointer-events: none;
}
.info-tip:hover .info-tip__bubble,
.info-tip:focus-visible .info-tip__bubble {
  opacity: 1;
  visibility: visible;
}
</style>

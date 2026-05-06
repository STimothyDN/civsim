<template>
  <Teleport to="body">
    <Transition name="seat-tooltip">
      <div
        v-if="visible"
        ref="tooltipRef"
        class="seat-tooltip"
        :style="tooltipStyle"
        role="tooltip"
      >
        <div class="seat-tooltip-content">
          <div class="seat-tooltip-header">
            <PartyBadge v-if="party" :party="party" size="sm" />
            <span v-if="partyName" class="seat-tooltip-party">{{ partyName }}</span>
          </div>
          <div class="seat-tooltip-body">
            <div v-if="representativeName" class="seat-tooltip-representative">
              <span class="seat-tooltip-label">{{ representativeTitle }}</span>
              <span class="seat-tooltip-value representative-name">{{ representativeName }}</span>
            </div>
            <div class="seat-tooltip-jurisdiction">
              <span class="seat-tooltip-label">{{ jurisdictionLabel }}</span>
              <span class="seat-tooltip-value">{{ jurisdiction }}</span>
            </div>
            <div v-if="voteShare !== null" class="seat-tooltip-vote-share">
              <span class="seat-tooltip-label">Vote share</span>
              <span class="seat-tooltip-value">{{ formattedVoteShare }}</span>
            </div>
            <div v-if="supportMetric !== null" class="seat-tooltip-support">
              <span class="seat-tooltip-label">Seat safety</span>
              <span class="seat-tooltip-value">{{ formattedSupport }}</span>
            </div>
          </div>
        </div>
        <div class="seat-tooltip-arrow" :style="arrowStyle" />
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { computed, ref, nextTick, watch } from 'vue'
import PartyBadge from './PartyBadge.vue'

export default {
  name: 'SeatTooltip',
  components: { PartyBadge },
  props: {
    visible: { type: Boolean, default: false },
    targetEl: { type: Object, default: null }, // SVG element being hovered
    party: { type: String, default: null },
    partyName: { type: String, default: '' },
    jurisdiction: { type: String, default: '' },
    jurisdictionLabel: { type: String, default: 'Represents' },
    voteShare: { type: Number, default: null },
    supportMetric: { type: Number, default: null },
    chamberType: { type: String, default: 'assembly' }, // 'assembly' | 'prelates'
    representativeName: { type: String, default: '' },
    representativeTitle: { type: String, default: 'Representative' },
  },
  setup(props) {
    const tooltipRef = ref(null)
    const position = ref({ x: 0, y: 0 })
    const arrowOffset = ref({ x: 0, y: 0 })

    const formattedVoteShare = computed(() => {
      if (props.voteShare === null || props.voteShare === undefined) return ''
      return `${(props.voteShare * 100).toFixed(1)}%`
    })

    const formattedSupport = computed(() => {
      if (props.supportMetric === null || props.supportMetric === undefined) return ''
      return `${props.supportMetric.toFixed(1)}%`
    })

    const tooltipStyle = computed(() => ({
      left: `${position.value.x}px`,
      top: `${position.value.y}px`,
    }))

    const arrowStyle = computed(() => ({
      transform: `translate(${arrowOffset.value.x}px, ${arrowOffset.value.y}px) rotate(45deg)`,
    }))

    function updatePosition() {
      if (!props.targetEl || !tooltipRef.value) return

      const tooltipRect = tooltipRef.value.getBoundingClientRect()
      const targetRect = props.targetEl.getBoundingClientRect()

      // Position tooltip above the seat by default
      let x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
      let y = targetRect.top - tooltipRect.height - 12

      // Adjust if going off screen
      const padding = 8
      const maxX = window.innerWidth - tooltipRect.width - padding
      const maxY = window.innerHeight - tooltipRect.height - padding

      x = Math.max(padding, Math.min(x, maxX))
      y = Math.max(padding, Math.min(y, maxY))

      // If tooltip would appear below target (not enough space above), flip it
      if (y < padding && targetRect.bottom + tooltipRect.height + 12 < window.innerHeight) {
        y = targetRect.bottom + 12
        arrowOffset.value = { x: 0, y: -tooltipRect.height - 6 }
      } else {
        arrowOffset.value = { x: 0, y: tooltipRect.height + 6 }
      }

      position.value = { x, y }
    }

    // Watch for visibility changes to update position
    watch(() => props.visible, (isVisible) => {
      if (isVisible) {
        nextTick(() => {
          updatePosition()
        })
      }
    })

    return {
      tooltipRef,
      tooltipStyle,
      arrowStyle,
      formattedVoteShare,
      formattedSupport,
    }
  },
}
</script>

<style scoped>
.seat-tooltip {
  position: fixed;
  z-index: 1000;
  pointer-events: none;
}

.seat-tooltip-content {
  background:
    linear-gradient(135deg, rgba(24, 25, 31, 0.98), rgba(17, 24, 39, 0.98)),
    var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  min-width: 160px;
  max-width: 240px;
}

.seat-tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.seat-tooltip-party {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.seat-tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.seat-tooltip-jurisdiction,
.seat-tooltip-vote-share,
.seat-tooltip-support {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.seat-tooltip-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 500;
}

.seat-tooltip-value {
  font-size: 0.82rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-align: right;
}

.seat-tooltip-value.representative-name {
  color: var(--accent);
  font-weight: 700;
}

.seat-tooltip-representative {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--border-subtle);
}

.seat-tooltip-arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  left: 50%;
  top: 100%;
  margin-left: -5px;
  margin-top: -5px;
}

/* Transition animations */
.seat-tooltip-enter-active,
.seat-tooltip-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.seat-tooltip-enter-from,
.seat-tooltip-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.seat-tooltip-enter-to,
.seat-tooltip-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>

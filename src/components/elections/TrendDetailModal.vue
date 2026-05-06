<template>
  <Teleport to="body">
    <div v-if="hoveredTrend" class="trend-detail-modal-overlay" :style="positionStyle">
      <section class="modal trend-detail-modal" @mouseenter="keepOpen" @mouseleave="scheduleClose">
        <header class="modal-header">
          <div class="trend-detail-header-content">
            <PartyBadge :party="hoveredTrend.party" short />
            <div>
              <p class="eyebrow">{{ formatComplexity(hoveredTrend.complexity) }}</p>
              <h2>{{ hoveredTrend.label }}</h2>
            </div>
          </div>
        </header>

        <div class="trend-detail-body">
          <div class="trend-detail-section">
            <p class="trend-detail-description">{{ hoveredTrend.description }}</p>
          </div>

          <div class="trend-detail-grid">
            <div class="trend-detail-meta">
              <span class="trend-detail-label">Family</span>
              <span class="trend-detail-value">{{ hoveredTrend.family }}</span>
            </div>
            <div class="trend-detail-meta">
              <span class="trend-detail-label">Scope</span>
              <span class="trend-detail-value">{{ Array.isArray(hoveredTrend.scope) ? hoveredTrend.scope.join(', ') : hoveredTrend.scope }}</span>
            </div>
            <div class="trend-detail-meta">
              <span class="trend-detail-label">Level</span>
              <span class="trend-detail-value">{{ hoveredTrend.level }}</span>
            </div>
          </div>

          <div v-if="hoveredTrend.tags?.length" class="trend-detail-tags">
            <span v-for="tag in hoveredTrend.tags" :key="tag" class="trend-detail-tag">{{ tag }}</span>
          </div>

          <div v-if="hoveredTrend.effects?.length" class="trend-detail-section">
            <h3>Effects</h3>
            <div class="trend-effect-list">
              <div v-for="(effect, index) in hoveredTrend.effects" :key="effect.id || index" class="trend-effect-card">
                <div class="trend-effect-header">
                  <PartyBadge :party="effect.party" short />
                  <span class="trend-effect-scope">{{ formatScope(effect.level) }}</span>
                  <span v-if="effect.mode === 'suppress'" class="trend-effect-mode trend-effect-mode--suppress">Suppress</span>
                </div>
                <div class="trend-effect-details">
                  <div v-if="effect.magnitudeFactor !== undefined" class="trend-effect-magnitude">
                    <span class="trend-effect-label">Magnitude</span>
                    <span class="trend-effect-value">{{ effect.magnitudeFactor }}</span>
                  </div>
                  <div v-if="effect.weightBy" class="trend-effect-weight">
                    <span class="trend-effect-label">Weighted By</span>
                    <span class="trend-effect-value">{{ formatWeightBy(effect.weightBy) }}</span>
                  </div>
                  <div v-if="!effect.magnitudeFactor && !effect.weightBy" class="trend-effect-base">
                    <span class="trend-effect-label">Effect</span>
                    <span class="trend-effect-value">Base effect</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="hoveredTrend.interactions?.length" class="trend-detail-section">
            <h3>Interactions</h3>
            <div class="trend-interaction-list">
              <div v-for="(interaction, index) in hoveredTrend.interactions" :key="index" class="trend-interaction-card">
                <span class="trend-interaction-tags">{{ interaction.withTags?.join(', ') }}</span>
                <span class="trend-interaction-levels">{{ formatScope(interaction.levels) }}</span>
                <span class="trend-interaction-multiplier">×{{ interaction.multiplier?.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div v-if="hoveredTrend.narrative" class="trend-detail-section trend-detail-section--narrative">
            <h3>Narrative</h3>
            <p v-if="hoveredTrend.narrative.reason" class="trend-detail-narrative-reason">{{ hoveredTrend.narrative.reason }}</p>
            <div v-if="hoveredTrend.narrative.phrases?.length" class="trend-detail-narrative-phrases">
              <span v-for="phrase in hoveredTrend.narrative.phrases" :key="phrase" class="trend-detail-phrase">"{{ phrase }}"</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { computed, onUnmounted, ref } from 'vue'
import PartyBadge from './PartyBadge.vue'

export default {
  name: 'TrendDetailModal',
  components: { PartyBadge },
  setup() {
    const hoveredTrend = ref(null)
    const position = ref({ x: 0, y: 0 })
    let closeTimeout = null

    function showTrend(trend, event) {
      if (closeTimeout) {
        clearTimeout(closeTimeout)
        closeTimeout = null
      }
      hoveredTrend.value = trend
      const rect = event.target.getBoundingClientRect()
      position.value = {
        x: rect.right + 12,
        y: rect.top,
      }
    }

    function hideTrend() {
      closeTimeout = setTimeout(() => {
        hoveredTrend.value = null
      }, 150)
    }

    function keepOpen() {
      if (closeTimeout) {
        clearTimeout(closeTimeout)
        closeTimeout = null
      }
    }

    function scheduleClose() {
      closeTimeout = setTimeout(() => {
        hoveredTrend.value = null
      }, 150)
    }

    const positionStyle = computed(() => ({
      left: `${position.value.x}px`,
      top: `${position.value.y}px`,
    }))

    onUnmounted(() => {
      if (closeTimeout) {
        clearTimeout(closeTimeout)
      }
    })

    function formatComplexity(complexity) {
      const map = {
        SIMPLE: 'Simple',
        COMPOUND: 'Compound',
        STORYLINE: 'Storyline',
      }
      return map[complexity] || complexity
    }

    function formatScope(scope) {
      if (Array.isArray(scope)) {
        return scope.join(', ')
      }
      return scope
    }

    function formatMagnitudeRange(range) {
      if (!range) return 'N/A'
      if (Array.isArray(range) && range.length >= 2) {
        const min = range[0]
        const max = range[1]
        return `${min} - ${max}`
      }
      return String(range)
    }

    function formatWeightBy(weightBy) {
      if (!weightBy) return 'N/A'
      if (typeof weightBy === 'string') {
        return weightBy
      }
      if (weightBy.feature && typeof weightBy.feature === 'string') {
        const feature = weightBy.feature
        if (weightBy.minMultiplier !== undefined && weightBy.maxMultiplier !== undefined) {
          const min = (weightBy.minMultiplier * 100).toFixed(0)
          const max = (weightBy.maxMultiplier * 100).toFixed(0)
          return `${feature}\n(${min}-${max}%)`
        }
        return feature
      }
      if (Array.isArray(weightBy)) {
        const features = weightBy
          .map(w => {
            if (w.feature && typeof w.feature === 'string') {
              if (w.minMultiplier !== undefined && w.maxMultiplier !== undefined) {
                const min = (w.minMultiplier * 100).toFixed(0)
                const max = (w.maxMultiplier * 100).toFixed(0)
                return `${w.feature} (${min}-${max}%)`
              }
              return w.feature
            }
            return ''
          })
          .filter(f => f)
          .join(', ')
        return features || 'N/A'
      }
      return 'N/A'
    }

    return {
      hoveredTrend,
      positionStyle,
      showTrend,
      hideTrend,
      keepOpen,
      scheduleClose,
      formatComplexity,
      formatScope,
      formatMagnitudeRange,
      formatWeightBy,
    }
  },
}
</script>

<style scoped>
.trend-detail-modal-overlay {
  position: fixed;
  z-index: 10000;
  pointer-events: none;
}

.trend-detail-modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  width: 420px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.trend-detail-header-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.trend-detail-header-content h2 {
  margin: 0;
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  color: var(--text-primary);
}

.trend-detail-body {
  display: grid;
  gap: 14px;
}

.trend-detail-section {
  display: grid;
  gap: 8px;
}

.trend-detail-section h3 {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.trend-detail-description {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.trend-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 12px;
}

.trend-detail-meta {
  display: grid;
  gap: 2px;
}

.trend-detail-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.trend-detail-value {
  font-size: 0.8rem;
  color: var(--text-primary);
  font-weight: 500;
}

.trend-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.trend-detail-tag {
  font-size: 0.7rem;
  padding: 3px 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  color: var(--text-secondary);
  font-weight: 500;
}

.trend-effect-list {
  display: grid;
  gap: 8px;
}

.trend-effect-card {
  padding: 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  display: grid;
  gap: 8px;
}

.trend-effect-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trend-effect-scope {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.trend-effect-mode {
  font-size: 0.68rem;
  padding: 2px 6px;
  border-radius: 999px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.trend-effect-mode--suppress {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.trend-effect-details {
  display: grid;
  gap: 6px;
  padding-left: 4px;
  border-left: 2px solid var(--border-subtle);
}

.trend-effect-magnitude,
.trend-effect-weight,
.trend-effect-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.trend-effect-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 500;
}

.trend-effect-value {
  font-size: 0.75rem;
  color: var(--text-primary);
  font-weight: 600;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  word-break: break-word;
  overflow-wrap: break-word;
}

.trend-interaction-list {
  display: grid;
  gap: 6px;
}

.trend-interaction-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
}

.trend-interaction-tags {
  color: var(--text-secondary);
}

.trend-interaction-levels {
  color: var(--text-muted);
}

.trend-interaction-multiplier {
  color: var(--accent);
  font-weight: 600;
  margin-left: auto;
}

.trend-detail-section--narrative {
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}

.trend-detail-narrative-reason {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-secondary);
  font-style: italic;
}

.trend-detail-narrative-phrases {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.trend-detail-phrase {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
  padding: 2px 6px;
  background: var(--bg-surface-raised);
  border-radius: var(--radius-sm);
}
</style>

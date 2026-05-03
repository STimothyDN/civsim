<template>
  <section v-if="isVisible" class="election-ticker-card" aria-live="polite">
    <header class="election-ticker-header">
      <div class="broadcast-signal election-ticker-signal">
        <Radio :size="16" class="broadcast-blink" />
        <span>{{ tickerTitle }}</span>
      </div>
      <Loader2 v-if="isLoading" class="broadcast-spin" :size="16" />
    </header>

    <div class="election-ticker-screen">
      <LlmStatusIndicator
        v-if="isLoading"
        :status="llmStatus"
        title="Ticker Generator"
        variant="ticker"
      />
      <p v-else class="election-ticker-copy">
        <span>{{ currentText }}</span><span v-if="isTyping" class="broadcast-cursor"></span>
      </p>
    </div>
  </section>
</template>

<script>
import { computed, onUnmounted, ref, watch } from 'vue'
import { Loader2, Radio } from 'lucide-vue-next'
import { useElectionResults } from '../../composables/useElectionResults'
import { usePolls } from '../../composables/usePolls'
import { requestElectionTicker } from '../../domain/elections/narrativePlanner'
import { useUiStore } from '../../stores/uiStore'
import LlmStatusIndicator from './LlmStatusIndicator.vue'
import { tickerLlmStatus } from './llmStatusCopy'

export default {
  name: 'ElectionTickerCard',
  components: { LlmStatusIndicator, Loader2, Radio },
  props: {
    requestId: { type: Number, default: 0 },
    scope: { type: String, default: 'national' },
    targetName: { type: String, default: null },
    tickerKey: { type: String, default: '' },
  },
  setup(props) {
    const { baselineResults, results } = useElectionResults()
    const { pollingPayloadFor } = usePolls()
    const uiStore = useUiStore()
    const isVisible = ref(false)
    const isLoading = ref(false)
    const isTyping = ref(false)
    const llmStatus = ref(null)
    const currentText = ref('')
    let typingInterval = null
    let activeRequest = 0
    const TYPING_SPEED = 12

    const tickerTitle = computed(() => {
      if (props.scope === 'overview') return 'ELECTION TICKER - OVERVIEW'
      if (props.scope === 'national') return 'ELECTION TICKER - NATIONAL'
      return `ELECTION TICKER - ${String(props.targetName || props.scope).toUpperCase()}`
    })

    function clearTyping() {
      clearInterval(typingInterval)
      typingInterval = null
      isTyping.value = false
    }

    function resetTicker() {
      clearTyping()
      isVisible.value = false
      isLoading.value = false
      llmStatus.value = null
      currentText.value = ''
      activeRequest += 1
    }

    function typeText(text) {
      clearTyping()
      currentText.value = ''
      isTyping.value = true
      let charIndex = 0

      typingInterval = setInterval(() => {
        if (charIndex < text.length) {
          currentText.value += text[charIndex]
          charIndex += 1
          return
        }

        clearTyping()
      }, TYPING_SPEED)
    }

    async function loadTicker() {
      if (!props.requestId) return
      const requestToken = activeRequest + 1
      activeRequest = requestToken
      clearTyping()
      isVisible.value = true
      isLoading.value = true
      llmStatus.value = null
      currentText.value = ''

      try {
        const text = await requestElectionTicker({
          results: results.value,
          baselineResults: baselineResults.value,
          scope: props.scope,
          targetName: props.targetName,
          polling: pollingPayloadFor(props.scope, props.targetName),
          onStatus: (status) => {
            llmStatus.value = tickerLlmStatus(status)
          },
        })
        if (activeRequest !== requestToken) return
        isLoading.value = false
        typeText(text)
      } catch (error) {
        if (activeRequest !== requestToken) return
        resetTicker()
        uiStore.showToast(error.message || 'Election ticker could not be generated.', 'error')
      }
    }

    watch(() => props.requestId, () => {
      loadTicker()
    })

    watch(() => props.tickerKey, () => {
      resetTicker()
    })

    onUnmounted(() => {
      clearTyping()
      activeRequest += 1
    })

    return {
      currentText,
      isLoading,
      isTyping,
      isVisible,
      llmStatus,
      tickerTitle,
    }
  },
}
</script>

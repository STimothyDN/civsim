<template>
  <Teleport to="body">
    <div v-if="uiStore.pollBreakdownModalOpen" class="modal-overlay broadcast-modal-overlay" @click.self="close">
      <section class="modal broadcast-modal poll-breakdown-modal" role="dialog" aria-modal="true" aria-labelledby="poll-breakdown-title">
        <header class="broadcast-modal-header">
          <div class="broadcast-signal">
            <Radio :size="18" class="broadcast-blink" />
            <span id="poll-breakdown-title">
              {{ roundtableTitle }}
              POLL BREAKDOWN - CIVITAS NEWS ROUNDTABLE
            </span>
          </div>
          <button type="button" class="close-btn" aria-label="Close poll breakdown" @click="close">
            <X :size="20" />
          </button>
        </header>

        <div class="broadcast-screen">
          <div ref="scrollArea" class="broadcast-content">
            <div v-for="(p, index) in displayedParagraphs" :key="index" class="broadcast-paragraph">
              {{ p }}
            </div>
            <div v-if="currentParagraphText" class="broadcast-paragraph broadcast-typing">
              {{ currentParagraphText }}<span class="broadcast-cursor">_</span>
            </div>

            <div v-if="isLoading" class="broadcast-loading-state">
              <LlmStatusIndicator
                :status="llmStatus"
                title="Poll Breakdown Generator"
                variant="broadcast"
              />
            </div>
          </div>
        </div>

        <footer class="broadcast-footer">
          <div class="broadcast-controls">
            <button
              v-if="isTyping"
              type="button"
              class="btn-broadcast-control btn-broadcast-skip"
              @click="fastForward"
            >
              <FastForward :size="18" />
              FAST FORWARD
            </button>
            <button
              v-else-if="hasNextParagraph"
              type="button"
              class="btn-broadcast-control btn-broadcast-next"
              @click="nextParagraph"
            >
              CONTINUE
              <ArrowRight :size="18" />
            </button>
            <button
              v-else-if="isFinished"
              type="button"
              class="btn-broadcast-control btn-broadcast-close"
              @click="close"
            >
              END BREAKDOWN
            </button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { ArrowRight, FastForward, Radio, X } from 'lucide-vue-next'
import { useElectionResults } from '../../composables/useElectionResults'
import { usePolls } from '../../composables/usePolls'
import { requestPollBreakdown } from '../../domain/elections/narrativePlanner'
import { useUiStore } from '../../stores/uiStore'
import LlmStatusIndicator from './LlmStatusIndicator.vue'
import { pollBreakdownLlmStatus } from './llmStatusCopy'

export default {
  name: 'PollBreakdownModal',
  components: { ArrowRight, FastForward, LlmStatusIndicator, Radio, X },
  setup() {
    const uiStore = useUiStore()
    const { results, baselineResults } = useElectionResults()
    const { currentScope } = usePolls()

    const fullText = ref('')
    const paragraphs = ref([])
    const displayedParagraphs = ref([])
    const currentParagraphIndex = ref(-1)
    const currentParagraphText = ref('')
    const isTyping = ref(false)
    const isLoading = ref(false)
    const llmStatus = ref(null)
    const scrollArea = ref(null)

    let typingInterval = null
    const TYPING_SPEED = 12

    const hasNextParagraph = computed(() => currentParagraphIndex.value < paragraphs.value.length - 1)
    const isFinished = computed(() => (
      paragraphs.value.length > 0 &&
      currentParagraphIndex.value === paragraphs.value.length - 1 &&
      !isTyping.value
    ))
    const roundtableTitle = computed(() => String(currentScope.value?.scopeLabel || 'National').toUpperCase())

    async function startBreakdown() {
      isLoading.value = true
      fullText.value = ''
      paragraphs.value = []
      displayedParagraphs.value = []
      currentParagraphIndex.value = -1
      currentParagraphText.value = ''
      llmStatus.value = null

      try {
        if (!currentScope.value) {
          throw new Error('No polling board is available for the breakdown.')
        }

        const text = await requestPollBreakdown({
          results: results.value,
          baselineResults: baselineResults.value,
          polling: currentScope.value,
          onStatus: (status) => {
            llmStatus.value = pollBreakdownLlmStatus(status)
          },
        })
        fullText.value = text
        paragraphs.value = text.split(/\n\s*\n/).map((p) => p.replace(/\n/g, ' ').trim()).filter((p) => p)
        isLoading.value = false
        await nextTick()
        nextParagraph()
      } catch (error) {
        console.error(error)
        uiStore.showToast(error.message || 'Failed to start poll breakdown.', 'error')
        close()
      }
    }

    function nextParagraph() {
      if (!hasNextParagraph.value) return
      currentParagraphIndex.value += 1
      typeText(paragraphs.value[currentParagraphIndex.value])
    }

    function typeText(text) {
      isTyping.value = true
      currentParagraphText.value = ''
      let charIndex = 0

      clearInterval(typingInterval)
      typingInterval = setInterval(() => {
        if (charIndex < text.length) {
          currentParagraphText.value += text[charIndex]
          charIndex += 1
          if (charIndex % 3 === 0) scrollToBottom()
        } else {
          finishParagraph()
        }
      }, TYPING_SPEED)
    }

    function finishParagraph() {
      clearInterval(typingInterval)
      displayedParagraphs.value.push(currentParagraphText.value)
      currentParagraphText.value = ''
      isTyping.value = false
      scrollToBottom()
    }

    function fastForward() {
      if (!isTyping.value) return
      clearInterval(typingInterval)
      displayedParagraphs.value.push(paragraphs.value[currentParagraphIndex.value])
      currentParagraphText.value = ''
      isTyping.value = false

      if (hasNextParagraph.value) {
        nextParagraph()
      } else {
        scrollToBottom()
      }
    }

    async function scrollToBottom() {
      await nextTick()
      if (scrollArea.value) {
        scrollArea.value.scrollTop = scrollArea.value.scrollHeight
      }
    }

    function close() {
      clearInterval(typingInterval)
      uiStore.closePollBreakdownModal()
    }

    watch(() => uiStore.pollBreakdownModalOpen, (isOpen) => {
      if (isOpen) startBreakdown()
    })

    onUnmounted(() => {
      clearInterval(typingInterval)
    })

    return {
      close,
      currentParagraphText,
      displayedParagraphs,
      fastForward,
      hasNextParagraph,
      isFinished,
      isLoading,
      isTyping,
      llmStatus,
      nextParagraph,
      paragraphs,
      roundtableTitle,
      scrollArea,
      uiStore,
    }
  },
}
</script>

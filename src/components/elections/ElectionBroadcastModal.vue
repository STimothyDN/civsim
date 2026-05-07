<template>
  <Teleport to="body">
    <div v-if="uiStore.electionBroadcastModalOpen" class="modal-overlay broadcast-modal-overlay" @click.self="close">
      <section class="modal broadcast-modal" role="dialog" aria-modal="true" aria-labelledby="broadcast-title">
        <header class="broadcast-modal-header">
          <div class="broadcast-signal">
            <Radio :size="18" class="broadcast-blink" />
            <span id="broadcast-title">
              {{ broadcastTitle }}
              BROADCAST — KHMER STATE TELEVISION
            </span>
          </div>
          <button type="button" class="close-btn" aria-label="Close broadcast" @click="close">
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
                title="Broadcast Generator"
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
              END TRANSMISSION
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
import { useUiStore } from '../../stores/uiStore'
import { useElectionStore } from '../../stores/electionStore'
import { useElectionResults } from '../../composables/useElectionResults'
import { usePolls } from '../../composables/usePolls'
import { requestElectionBroadcast } from '../../domain/elections/narrativePlanner'
import { generateSeatDetails } from '../../domain/elections/chambers/jurisdictionLabels'
import { SEAT_OFFSETS } from '../../domain/elections/constants/seatOffsets'
import LlmStatusIndicator from './LlmStatusIndicator.vue'
import { broadcastLlmStatus } from './llmStatusCopy'

export default {
  name: 'ElectionBroadcastModal',
  components: { ArrowRight, FastForward, LlmStatusIndicator, Radio, X },
  setup() {
    const uiStore = useUiStore()
    const electionStore = useElectionStore()
    const { results, baselineResults, previousElectionResults } = useElectionResults()
    const { pollingPayloadFor } = usePolls()

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
    const TYPING_SPEED = 12 // ms per character

    const hasNextParagraph = computed(() => {
      return currentParagraphIndex.value < paragraphs.value.length - 1
    })

    const isFinished = computed(() => {
      return paragraphs.value.length > 0 && currentParagraphIndex.value === paragraphs.value.length - 1 && !isTyping.value
    })

    const broadcastTitle = computed(() => {
      if (uiStore.broadcastScope === 'overview') return 'ELECTION OVERVIEW'
      if (uiStore.broadcastScope === 'national') return 'NATIONAL'
      return String(uiStore.broadcastTargetName || uiStore.broadcastScope || 'ELECTION').toUpperCase()
    })

    async function startBroadcast() {
      isLoading.value = true
      fullText.value = ''
      paragraphs.value = []
      displayedParagraphs.value = []
      currentParagraphIndex.value = -1
      currentParagraphText.value = ''
      llmStatus.value = null

      try {
        // Generate seat details based on current scope
        let seatDetails = []
        const scope = uiStore.broadcastScope
        const targetName = uiStore.broadcastTargetName
        
        if (scope === 'national' || scope === 'overview') {
          const assemblyDetails = generateSeatDetails({
            seats: results.value?.national?.assembly?.seats || {},
            chamberType: 'assembly',
            scope: 'national',
            provinces: results.value?.provinces || [],
          })
          const councilDetails = generateSeatDetails({
            seats: results.value?.national?.prelates?.seats || {},
            chamberType: 'prelates',
            scope: 'national',
            provinces: results.value?.provinces || [],
          })
          seatDetails = [...assemblyDetails.map(s => ({ ...s, seatIndex: s.seatIndex + SEAT_OFFSETS.national.assembly })), ...councilDetails.map(s => ({ ...s, seatIndex: s.seatIndex + SEAT_OFFSETS.national.prelates }))]
        } else if (scope === 'regional') {
          const region = results.value?.regions?.[targetName]
          if (region) {
            const assemblyDetails = generateSeatDetails({
              seats: region?.assembly?.seats || {},
              chamberType: 'assembly',
              scope: 'regional',
              provinces: results.value?.provinces || [],
              selectedRegionName: targetName,
            })
            const councilDetails = generateSeatDetails({
              seats: region?.prelates?.seats || {},
              chamberType: 'prelates',
              scope: 'regional',
              provinces: results.value?.provinces || [],
              selectedRegionName: targetName,
            })
            seatDetails = [...assemblyDetails.map(s => ({ ...s, seatIndex: s.seatIndex + SEAT_OFFSETS.regional.assembly })), ...councilDetails.map(s => ({ ...s, seatIndex: s.seatIndex + SEAT_OFFSETS.regional.prelates }))]
          }
        } else if (scope === 'provincial') {
          const province = (results.value?.provinces || []).find(p => p.name === targetName)
          if (province) {
            const assemblyDetails = generateSeatDetails({
              seats: province?.assembly?.seats || {},
              chamberType: 'assembly',
              scope: 'provincial',
              provinces: results.value?.provinces || [],
              selectedProvince: province,
            })
            const councilDetails = generateSeatDetails({
              seats: province?.prelates?.seats || {},
              chamberType: 'prelates',
              scope: 'provincial',
              provinces: results.value?.provinces || [],
              selectedProvince: province,
            })
            seatDetails = [...assemblyDetails.map(s => ({ ...s, seatIndex: s.seatIndex + SEAT_OFFSETS.provincial.assembly })), ...councilDetails.map(s => ({ ...s, seatIndex: s.seatIndex + SEAT_OFFSETS.provincial.prelates }))]
          }
        }

        const text = await requestElectionBroadcast({
          results: results.value,
          baselineResults: electionStore.electionNumber > 0 ? previousElectionResults.value : baselineResults.value,
          scope: uiStore.broadcastScope,
          targetName: uiStore.broadcastTargetName,
          polling: pollingPayloadFor(uiStore.broadcastScope, uiStore.broadcastTargetName),
          seatDetails,
          representativeNames: electionStore.representativeNames,
          incumbentRoster: electionStore.incumbentRoster,
          electionNumber: electionStore.electionNumber,
          onStatus: (status) => {
            llmStatus.value = broadcastLlmStatus(status)
          },
        })
        fullText.value = text
        paragraphs.value = text.split(/\n\s*\n/).map(p => p.replace(/\n/g, ' ').trim()).filter(p => p)
        isLoading.value = false
        await nextTick()
        nextParagraph()
      } catch (error) {
        console.error(error)
        uiStore.showToast(error.message || 'Failed to receive broadcast signal.', 'error')
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
      uiStore.closeElectionBroadcastModal()
    }

    watch(() => uiStore.electionBroadcastModalOpen, (isOpen) => {
      if (isOpen) startBroadcast()
    })

    onUnmounted(() => {
      clearInterval(typingInterval)
    })

    return {
      close,
      broadcastTitle,
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
      scrollArea,
      uiStore,
    }
  }
}
</script>

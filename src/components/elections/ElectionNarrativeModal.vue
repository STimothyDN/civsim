<template>
  <Teleport to="body">
    <div v-if="uiStore.electionNarrativeModalOpen" class="modal-overlay narrative-modal-overlay" @click.self="close">
      <section class="modal narrative-modal" role="dialog" aria-modal="true" aria-labelledby="election-narrative-title">
        <header class="modal-header">
          <div>
            <p class="eyebrow">Election Narrative</p>
            <h2 id="election-narrative-title">Shape The Election Climate</h2>
          </div>
          <button type="button" class="close-btn" aria-label="Close election narrative modal" @click="close">
            <X :size="18" />
          </button>
        </header>

        <form class="narrative-form" @submit.prevent="submitNarrative">
          <label class="narrative-field">
            <span>Describe the electoral narrative you want to portray</span>
            <textarea
              ref="textareaRef"
              v-model="narrative"
              :disabled="isLoading"
              rows="7"
              placeholder="Example: A cost-of-living crisis is hurting the imperial center, while industrial counties are organizing around labor and distant American provinces are pushing home rule."
              @keydown.enter.exact.prevent="submitNarrative"
            ></textarea>
          </label>

          <div class="narrative-actions">
            <button type="submit" class="btn-primary" :disabled="isLoading || !narrative.trim() || !formStore.currentData">
              <Sparkles :size="16" />
              Apply Narrative
            </button>
            <button type="button" :disabled="isLoading" @click="close">Close</button>
          </div>
        </form>

        <div v-if="!formStore.currentData" class="narrative-warning">
          Load or create a template before applying an election narrative.
        </div>

        <LlmStatusIndicator
          v-if="isLoading && llmStatus"
          :status="llmStatus"
          title="Narrative Planner"
          variant="compact"
        />

        <div v-if="statusItems.length" class="narrative-status-list">
          <div v-for="item in statusItems" :key="item.id" class="narrative-status-item" :class="`narrative-status-item--${item.type}`">
            <CheckCircle2 v-if="item.type === 'success'" :size="15" />
            <TriangleAlert v-else-if="item.type === 'error'" :size="15" />
            <Loader2 v-else class="narrative-spin" :size="15" />
            <span>{{ item.message }}</span>
          </div>
        </div>

        <section v-if="appliedPackage" class="narrative-result">
          <div>
            <p class="eyebrow">Applied Scenario</p>
            <h3>{{ appliedPackage.title || 'Election Narrative' }}</h3>
            <p>{{ appliedPackage.summary || 'Narrative climate applied.' }}</p>
          </div>
          <div class="trend-chip-list">
            <span v-for="trend in appliedPackage.trends" :key="trend.id" class="trend-chip" :title="trend.narrative?.reason || trend.description">
              <PartyBadge :party="trend.party" short />
              {{ trend.label }}
            </span>
          </div>
        </section>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { computed, nextTick, ref, watch } from 'vue'
import { CheckCircle2, Loader2, Sparkles, TriangleAlert, X } from 'lucide-vue-next'
import { requestElectionNarrativePlan } from '../../domain/elections/narrativePlanner'
import { useElectionStore } from '../../stores/electionStore'
import { useFormStore } from '../../stores/formStore'
import { useUiStore } from '../../stores/uiStore'
import LlmStatusIndicator from './LlmStatusIndicator.vue'
import PartyBadge from './PartyBadge.vue'

let statusId = 0

export default {
  name: 'ElectionNarrativeModal',
  components: { CheckCircle2, LlmStatusIndicator, Loader2, PartyBadge, Sparkles, TriangleAlert, X },
  setup() {
    const uiStore = useUiStore()
    const formStore = useFormStore()
    const electionStore = useElectionStore()
    const narrative = ref('')
    const statusItems = ref([])
    const appliedPackage = ref(null)
    const textareaRef = ref(null)
    const phase = ref('idle')
    const llmStatus = ref(null)
    const isLoading = computed(() => phase.value === 'loading')

    watch(
      () => uiStore.electionNarrativeModalOpen,
      async (isOpen) => {
        if (!isOpen) return
        await nextTick()
        textareaRef.value?.focus()
      }
    )

    function pushStatus(message, type = 'pending') {
      statusId += 1
      statusItems.value = [...statusItems.value, { id: statusId, message, type }]
    }

    function close() {
      if (isLoading.value) return
      uiStore.closeElectionNarrativeModal()
    }

    async function submitNarrative() {
      const prompt = narrative.value.trim()
      if (!prompt || isLoading.value) return
      if (!formStore.currentData) {
        uiStore.showToast('Load or create a template before applying an election narrative.', 'error')
        return
      }

      phase.value = 'loading'
      statusItems.value = []
      appliedPackage.value = null
      llmStatus.value = null

      const MAX_ATTEMPTS = 3
      let lastError = null
      let packageDef = null

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          if (attempt > 1) {
            pushStatus(`Retrying narrative generation (attempt ${attempt} of ${MAX_ATTEMPTS})…`, 'pending')
          }

          const result = await requestElectionNarrativePlan({
            narrative: prompt,
            data: formStore.currentData,
            onStatus: (status) => {
              llmStatus.value = status
            },
          })

          if (!result.packageDef.trends.length) {
            throw new Error('The model did not select any valid trend templates.')
          }

          packageDef = result.packageDef
          break
        } catch (error) {
          lastError = error
          if (attempt < MAX_ATTEMPTS) {
            pushStatus(`Attempt ${attempt} failed: ${error.message || 'unknown error'}.`, 'pending')
          }
        }
      }

      try {
        if (!packageDef) {
          throw lastError || new Error('Election narrative failed after 3 attempts.')
        }

        statusItems.value = []
        electionStore.applyTrendPackage(packageDef)
        appliedPackage.value = packageDef
        pushStatus(`Applied ${packageDef.trends.length} narrative trends.`, 'success')
        uiStore.showToast('Election narrative applied', 'success')
      } catch (error) {
        pushStatus(error.message || 'Election narrative failed.', 'error')
        uiStore.showToast('Election narrative could not be applied', 'error')
      } finally {
        phase.value = 'idle'
      }
    }

    return {
      appliedPackage,
      close,
      formStore,
      isLoading,
      llmStatus,
      narrative,
      statusItems,
      submitNarrative,
      textareaRef,
      uiStore,
    }
  },
}
</script>

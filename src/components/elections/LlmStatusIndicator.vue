<template>
  <article
    class="llm-status"
    :class="[`llm-status--${variant}`, `llm-status--${phase}`]"
    aria-live="polite"
    :aria-busy="phase !== 'complete' && phase !== 'error'"
  >
    <div class="llm-status-orb" aria-hidden="true">
      <span></span>
      <i></i>
    </div>

    <div class="llm-status-main">
      <div class="llm-status-kicker">
        <span>{{ title }}</span>
        <small>{{ phaseLabel }}</small>
      </div>
      <strong>{{ statusMessage }}</strong>
      <p v-if="statusDetail">{{ statusDetail }}</p>
      <div class="llm-status-meter" :class="{ 'llm-status-meter--indeterminate': progress === null }">
        <i :style="progressStyle"></i>
      </div>
    </div>
  </article>
</template>

<script>
import { computed } from 'vue'

const PHASE_LABELS = {
  preparing: 'Preparing',
  connecting: 'Connecting',
  chat: 'Chat',
  model_load: 'Model Load',
  prompt_processing: 'Prompt',
  reasoning: 'Reasoning',
  message: 'Message',
  tool_call: 'Tool',
  streaming: 'Streaming',
  receiving: 'Receiving',
  parsing: 'Parsing',
  compiling: 'Compiling',
  complete: 'Complete',
  error: 'Error',
  working: 'Working',
}

export default {
  name: 'LlmStatusIndicator',
  props: {
    status: { type: Object, default: null },
    title: { type: String, default: 'Local Model' },
    variant: { type: String, default: 'default' },
  },
  setup(props) {
    const phase = computed(() => props.status?.phase || 'working')
    const progress = computed(() => {
      const value = Number(props.status?.progress)
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null
    })
    const phaseLabel = computed(() => props.status?.label || PHASE_LABELS[phase.value] || PHASE_LABELS.working)
    const statusMessage = computed(() => props.status?.message || 'Waiting for the local model.')
    const statusDetail = computed(() => props.status?.detail || 'LM Studio is processing the request.')
    const progressStyle = computed(() => (
      progress.value === null ? {} : { width: `${Math.round(progress.value * 100)}%` }
    ))

    return {
      phase,
      phaseLabel,
      progress,
      progressStyle,
      statusDetail,
      statusMessage,
    }
  },
}
</script>

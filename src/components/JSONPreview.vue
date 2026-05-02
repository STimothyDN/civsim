<template>
  <section class="preview-panel">
    <div class="preview-header">
      <h2>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        JSON Preview
      </h2>
      <button type="button" @click="copyJson" :disabled="!hasData">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
    </div>
    <textarea id="json-preview" readonly spellcheck="false" :value="json"></textarea>
  </section>
</template>

<script>
import { computed } from 'vue'
import { useFormStore } from '../stores/formStore'

export default {
  name: 'JSONPreview',
  setup() {
    const store = useFormStore()
    const exportData = computed(() => store.exportTemplate())
    const json = computed(() => (exportData.value ? JSON.stringify(exportData.value, null, 2) : ''))
    const hasData = computed(() => !!exportData.value)

    async function copyJson() {
      if (!exportData.value) return
      try {
        await navigator.clipboard.writeText(json.value)
        store.showToast('JSON copied to clipboard', 'success')
      } catch (err) {
        store.showToast('Copy failed: ' + (err && err.message ? err.message : err), 'error')
      }
    }

    return { json, copyJson, hasData }
  }
}
</script>

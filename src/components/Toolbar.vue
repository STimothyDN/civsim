<template>
  <div class="toolbar">
    <button type="button" class="btn-primary" @click="openNewTemplate">
      <FilePlus2 :size="16" />
      New Realm
    </button>

    <button type="button" :disabled="!hasData" @click="openWizard">
      <Wand2 :size="16" />
      Revise in Wizard
    </button>

    <label class="file-input">
      <span>
        <Upload :size="16" />
        Load JSON
      </span>
      <input type="file" accept=".json" @change="onFileChange" />
    </label>

    <button type="button" :disabled="!hasData" @click="downloadJson">
      <Download :size="16" />
      Download JSON
    </button>

    <button type="button" @click="downloadExample">
      <Download :size="16" />
      Download Example
    </button>
  </div>
</template>

<script>
import { computed } from 'vue'
import { Download, FilePlus2, Upload, Wand2 } from 'lucide-vue-next'
import { useFormStore } from '../stores/formStore'
import { useElectionStore } from '../stores/electionStore'
import { useUiStore } from '../stores/uiStore'
import { useElectionPipeline } from '../composables/electionPipeline'
import { extractElectionState } from '../domain/templateCodec'
import exampleData from '../../jayavarman.json'

export default {
  name: 'Toolbar',
  components: { Download, FilePlus2, Upload, Wand2 },
  setup() {
    const store = useFormStore()
    const hasData = computed(() => !!store.currentData)

    function openNewTemplate() {
      useUiStore().openNewTemplateModal()
    }

    function openWizard() {
      useUiStore().openWizardModal()
    }

    function downloadJson() {
      const electionStore = useElectionStore()
      // Capture the full computed state for the current scenario so the export
      // is a complete snapshot of what the app is rendering.
      let computedSnapshot = {}
      try {
        const pipeline = useElectionPipeline()
        computedSnapshot = {
          results: pipeline.results?.value || null,
          baselineResults: pipeline.baselineResults?.value || null,
        }
      } catch (err) {
        computedSnapshot = {}
      }
      store.downloadJsonWithElection(electionStore.snapshotElectionState(), computedSnapshot)
    }

    function downloadExample() {
      const blob = new Blob([JSON.stringify(exampleData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'jayavarman.json'
      a.click()
      URL.revokeObjectURL(url)
    }

    function onFileChange(e) {
      const file = e.target.files?.[0]
      if (!file) { e.target.value = ''; return }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result)
          const electionState = extractElectionState(parsed)
          store.loadTemplate(parsed)
          const electionStore = useElectionStore()
          if (electionState) electionStore.hydrateElectionState(electionState)
          else electionStore.resetScenario()
        } catch (err) {
          store.showToast('Invalid JSON file. Please choose a valid realm file.', 'error')
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    }

    return { openNewTemplate, openWizard, onFileChange, downloadJson, downloadExample, hasData }
  }
}
</script>

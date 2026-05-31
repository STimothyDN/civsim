<template>
  <header class="topbar">
    <button type="button" class="btn btn--ghost btn--icon rail__toggle" title="Menu" @click="$emit('toggle-rail')">
      <Menu :size="16" />
    </button>

    <nav class="topbar__crumbs" aria-label="Breadcrumb">
      <template v-for="(crumb, i) in crumbs" :key="crumb">
        <component v-if="i === crumbs.length - 1" :is="'b'">{{ crumb }}</component>
        <span v-else>{{ crumb }}</span>
        <ChevronRight v-if="i < crumbs.length - 1" :size="12" />
      </template>
    </nav>

    <div class="topbar__spacer" />

    <label class="searchbox">
      <Search :size="14" />
      <input type="text" placeholder="Seek a province, faction, or region…" aria-label="Search" />
      <kbd>⌘K</kbd>
    </label>

    <label class="file-input">
      <span class="btn btn--ghost btn--sm" title="Load a realm from a JSON file">
        <Upload :size="14" />
        Import
      </span>
      <input type="file" accept=".json" @change="onFileChange" />
    </label>

    <button type="button" class="btn btn--sm" :disabled="!hasData" title="Download the current realm as JSON" @click="downloadJson">
      <Download :size="14" />
      Export
    </button>

    <button type="button" class="btn btn--primary btn--sm" title="Found a new realm" @click="openNewTemplate">
      <Plus :size="14" />
      New Realm
    </button>
  </header>
</template>

<script>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronRight, Download, Menu, Plus, Search, Upload } from 'lucide-vue-next'
import { useFormStore } from '../stores/formStore'
import { useElectionStore } from '../stores/electionStore'
import { useUiStore } from '../stores/uiStore'
import { useElectionPipeline } from '../composables/electionPipeline'
import { extractElectionState } from '../domain/templateCodec'

const CRUMB_MAP = {
  '/': ['Atlas', 'Command Center'],
  '/overview': ['Atlas', 'Country Overview'],
  '/builder': ['Builder', 'Provinces & Counties'],
  '/elections/pre-election': ['Elections', 'Pre-Election'],
  '/elections/overview': ['Elections', 'Overview'],
  '/elections/national': ['Elections', 'National Results'],
  '/elections/regional': ['Elections', 'Regional Results'],
  '/elections/provincial': ['Elections', 'Provincial Results'],
  '/elections/directory': ['Elections', 'Representative Directory'],
}

export default {
  name: 'AppHeader',
  components: { ChevronRight, Download, Menu, Plus, Search, Upload },
  emits: ['toggle-rail'],
  setup() {
    const route = useRoute()
    const store = useFormStore()

    const hasData = computed(() => !!store.currentData)

    const crumbs = computed(() => {
      if (CRUMB_MAP[route.path]) return CRUMB_MAP[route.path]
      if (route.path.startsWith('/elections')) return ['Elections', 'Simulator']
      return ['Atlas']
    })

    function openNewTemplate() {
      useUiStore().openNewTemplateModal()
    }

    function downloadJson() {
      const electionStore = useElectionStore()
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

    return { crumbs, hasData, openNewTemplate, downloadJson, onFileChange }
  },
}
</script>

<template>
  <section id="form-container" class="space-y-5">
    <div v-if="!store.currentData" class="empty-workspace">
      <Globe2 :size="52" class="text-[var(--accent)]" />
      <div>
        <h2>No Realm Loaded</h2>
        <p>An empty atlas</p>
      </div>
      <button type="button" class="btn-primary" @click="openNewTemplate">
        <FilePlus2 :size="16" />
        New Realm
      </button>
    </div>

    <div v-else class="builder-workspace">
      <div class="builder-tabs" role="tablist" aria-label="Builder sections">
        <button
          v-for="section in sections"
          :key="section.id"
          type="button"
          class="builder-tab"
          :class="{ 'builder-tab--active': activeSection === section.id }"
          :aria-selected="activeSection === section.id"
          role="tab"
          @click="activeSection = section.id"
        >
          <component :is="section.icon" :size="16" />
          <span>{{ section.label }}</span>
        </button>
      </div>

      <section v-if="activeSection === 'province-grid'" class="workspace-panel workspace-panel--flush">
        <ProvinceGrid />
      </section>

      <section v-else-if="activeSection === 'regional-details'" class="workspace-panel workspace-panel--flush">
        <RegionalDetails />
      </section>

      <section v-else-if="activeSection === 'province-details'" class="workspace-panel workspace-panel--flush">
        <ProvinceDetails />
      </section>

      <section v-else-if="activeSection === 'country'" class="workspace-panel">
        <FieldsetGroup path="country" label="Country Data" :depth="0" />
      </section>

      <section v-else-if="activeSection === 'provinces'" class="workspace-panel">
        <ArraySection path="provinces" label="Provinces Data" :depth="0" />
      </section>

      <section v-else-if="activeSection === 'reference'" class="workspace-panel">
        <ReferenceDataSection />
      </section>

      <section v-else-if="activeSection === 'advanced'" class="workspace-panel">
        <AdvancedSetup />
      </section>

      <section v-else-if="activeSection === 'json'" class="workspace-panel">
        <JSONPreview />
      </section>
    </div>
  </section>
</template>

<script>
import { defineAsyncComponent, markRaw, ref, watch } from 'vue'
import { Braces, ChartNoAxesColumnIncreasing, FilePlus2, Flag, Globe2, Grid3x3, Layers, MapPinned, Network, SlidersHorizontal } from 'lucide-vue-next'
import { useFormStore } from '../stores/formStore'
import { useUiStore } from '../stores/uiStore'

const AdvancedSetup = defineAsyncComponent(() => import('./setup/AdvancedSetup.vue'))
const ArraySection = defineAsyncComponent(() => import('./ArraySection.vue'))
const FieldsetGroup = defineAsyncComponent(() => import('./FieldsetGroup.vue'))
const ProvinceGrid = defineAsyncComponent(() => import('./builder/ProvinceGrid.vue'))
const JSONPreview = defineAsyncComponent(() => import('./JSONPreview.vue'))
const ProvinceDetails = defineAsyncComponent(() => import('../pages/ProvinceDetails.vue'))
const ReferenceDataSection = defineAsyncComponent(() => import('./ReferenceDataSection.vue'))
const RegionalDetails = defineAsyncComponent(() => import('../pages/RegionalDetails.vue'))

export default {
  name: 'FormContainer',
  components: {
    AdvancedSetup,
    ArraySection,
    FieldsetGroup,
    FilePlus2,
    Globe2,
    JSONPreview,
    Network,
    ProvinceDetails,
    ProvinceGrid,
    ReferenceDataSection,
    RegionalDetails,
  },
  props: {
    initialSection: {
      type: String,
      default: 'province-grid',
    },
  },
  setup(props) {
    const store = useFormStore()
    const sections = [
      { id: 'province-grid', label: 'Province Grid', icon: markRaw(Grid3x3) },
      { id: 'regional-details', label: 'Regional Details', icon: markRaw(Network) },
      { id: 'province-details', label: 'Province Details', icon: markRaw(ChartNoAxesColumnIncreasing) },
      { id: 'country', label: 'Country Data', icon: markRaw(Flag) },
      { id: 'provinces', label: 'Provinces Data', icon: markRaw(MapPinned) },
      { id: 'reference', label: 'Reference Data', icon: markRaw(Layers) },
      { id: 'advanced', label: 'Advanced Setup', icon: markRaw(SlidersHorizontal) },
      { id: 'json', label: 'JSON Preview', icon: markRaw(Braces) },
    ]
    const sectionIds = new Set(sections.map((section) => section.id))
    const sectionAliases = {
      'regional-overview': 'regional-details',
      'provincial-overview': 'province-details',
    }
    const normalizeSection = (section) => {
      const normalized = sectionAliases[section] || section
      return sectionIds.has(normalized) ? normalized : 'province-grid'
    }
    const activeSection = ref(normalizeSection(props.initialSection))

    watch(
      () => props.initialSection,
      (section) => {
        activeSection.value = normalizeSection(section)
      }
    )

    function handleNavigate(payload) {
      if (payload?.tab) activeSection.value = normalizeSection(payload.tab)
    }

    function openNewTemplate() {
      useUiStore().openNewTemplateModal()
    }

    return {
      activeSection,
      handleNavigate,
      openNewTemplate,
      sections,
      store,
    }
  }
}
</script>

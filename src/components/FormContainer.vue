<template>
  <section id="form-container" class="space-y-5">
    <div v-if="!store.currentData" class="empty-workspace">
      <Globe2 :size="52" class="text-[var(--accent)]" />
      <div>
        <h2>No Template Loaded</h2>
        <p>Blank workspace</p>
      </div>
      <button type="button" class="btn-primary" @click="store.loadDefault">
        <FilePlus2 :size="16" />
        New Template
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

      <section v-if="activeSection === 'country-overview'" class="workspace-panel">
        <div class="section-header">
          <div>
            <p class="eyebrow">Country Overview</p>
            <h2>{{ countryName }}</h2>
          </div>
          <BadgeCheck class="panel-icon" />
        </div>

        <div class="country-overview-hero">
          <div class="country-identity-panel">
            <div class="country-identity-grid">
              <div v-for="item in countryIdentity" :key="item.label" class="identity-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>

          <div class="country-total-panel">
            <div>
              <span class="stat-label">Provincial Population</span>
              <strong>{{ formatCompactNumber(totalProvincialPopulation) }}</strong>
              <small>{{ formatNumber(totalRawPopulation) }} raw population</small>
            </div>
            <div>
              <span class="stat-label">Economy Output</span>
              <strong>{{ formatNumber(totalEconomyOutput) }}</strong>
              <small>Gold, faith, culture, and science</small>
            </div>
          </div>
        </div>

        <div class="stat-grid country-stat-grid">
          <div v-for="card in countrySummaryCards" :key="card.label" class="stat-card">
            <span class="stat-label">{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <small>{{ card.detail }}</small>
          </div>
        </div>

        <div class="country-overview-grid">
          <div class="overview-panel">
            <h3>Economy</h3>
            <div v-for="metric in economyMetrics" :key="metric.label" class="metric-row">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </div>
          </div>

          <div class="overview-panel">
            <h3>Representation</h3>
            <div v-for="metric in representationMetrics" :key="metric.label" class="metric-row">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </div>
          </div>

          <div class="overview-panel">
            <h3>Civic Health</h3>
            <div v-for="metric in civicMetrics" :key="metric.label" class="metric-row">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </div>
          </div>

          <div class="overview-panel">
            <h3>Religion</h3>
            <div v-for="metric in religionMetrics" :key="metric.label" class="metric-row">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </div>
          </div>
        </div>

        <div class="overview-panel regional-summary-panel">
          <div class="overview-panel-heading">
            <h3>Regions</h3>
            <span>{{ regionSummaries.length }} groups</span>
          </div>
          <div class="region-summary-list">
            <article v-for="region in regionSummaries" :key="region.name" class="region-summary-row">
              <div>
                <strong>{{ region.name }}</strong>
                <span>{{ region.provinceCount }} provinces</span>
              </div>
              <div>
                <span>Population</span>
                <strong>{{ formatCompactNumber(region.provincialPopulation) }}</strong>
              </div>
              <div>
                <span>Assemblypeople</span>
                <strong>{{ formatNumber(region.assemblypeople) }}</strong>
              </div>
              <div>
                <span>Top Yield</span>
                <strong>{{ region.topYieldLabel }}</strong>
              </div>
            </article>
          </div>
        </div>
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

      <section v-else-if="activeSection === 'json'" class="workspace-panel">
        <JSONPreview />
      </section>
    </div>
  </section>
</template>

<script>
import { defineAsyncComponent, markRaw, ref, watch } from 'vue'
import { BadgeCheck, Braces, ChartNoAxesColumnIncreasing, FilePlus2, Flag, Globe2, Layers, MapPinned, Network } from 'lucide-vue-next'
import { useBuilderOverview } from '../composables/useBuilderOverview'
import { useFormStore } from '../stores/formStore'

const ArraySection = defineAsyncComponent(() => import('./ArraySection.vue'))
const FieldsetGroup = defineAsyncComponent(() => import('./FieldsetGroup.vue'))
const JSONPreview = defineAsyncComponent(() => import('./JSONPreview.vue'))
const ProvinceDetails = defineAsyncComponent(() => import('../pages/ProvinceDetails.vue'))
const ReferenceDataSection = defineAsyncComponent(() => import('./ReferenceDataSection.vue'))
const RegionalDetails = defineAsyncComponent(() => import('../pages/RegionalDetails.vue'))

export default {
  name: 'FormContainer',
  components: {
    ArraySection,
    BadgeCheck,
    FieldsetGroup,
    FilePlus2,
    Globe2,
    JSONPreview,
    Network,
    ProvinceDetails,
    ReferenceDataSection,
    RegionalDetails,
  },
  props: {
    initialSection: {
      type: String,
      default: 'country-overview',
    },
  },
  setup(props) {
    const store = useFormStore()
    const sections = [
      { id: 'country-overview', label: 'Country Overview', icon: markRaw(BadgeCheck) },
      { id: 'regional-details', label: 'Regional Details', icon: markRaw(Network) },
      { id: 'province-details', label: 'Province Details', icon: markRaw(ChartNoAxesColumnIncreasing) },
      { id: 'country', label: 'Country Data', icon: markRaw(Flag) },
      { id: 'provinces', label: 'Provinces Data', icon: markRaw(MapPinned) },
      { id: 'reference', label: 'Reference Data', icon: markRaw(Layers) },
      { id: 'json', label: 'JSON Preview', icon: markRaw(Braces) },
    ]
    const sectionIds = new Set(sections.map((section) => section.id))
    const sectionAliases = {
      'regional-overview': 'regional-details',
      'provincial-overview': 'province-details',
    }
    const normalizeSection = (section) => {
      const normalized = sectionAliases[section] || section
      return sectionIds.has(normalized) ? normalized : 'country-overview'
    }
    const activeSection = ref(normalizeSection(props.initialSection))

    watch(
      () => props.initialSection,
      (section) => {
        activeSection.value = normalizeSection(section)
      }
    )

    const {
      civicMetrics,
      countryIdentity,
      countryName,
      countrySummaryCards,
      economyMetrics,
      formatCompactNumber,
      formatNumber,
      regionSummaries,
      religionMetrics,
      representationMetrics,
      totalEconomyOutput,
      totalProvincialPopulation,
      totalRawPopulation,
    } = useBuilderOverview(store)

    return {
      activeSection,
      civicMetrics,
      countryIdentity,
      countryName,
      countrySummaryCards,
      economyMetrics,
      formatCompactNumber,
      formatNumber,
      regionSummaries,
      religionMetrics,
      representationMetrics,
      sections,
      store,
      totalEconomyOutput,
      totalProvincialPopulation,
      totalRawPopulation,
    }
  }
}
</script>

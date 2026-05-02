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

      <section v-else-if="activeSection === 'regional-overview'" class="workspace-panel">
        <div class="section-header">
          <div>
            <p class="eyebrow">Regional Overview</p>
            <h2>{{ orderedRegionSummaries.length }} Province Groups</h2>
          </div>
          <Network class="panel-icon" />
        </div>

        <div class="province-overview-list">
          <div v-if="!orderedRegionSummaries.length" class="empty-inline">
            No province groups available.
          </div>

          <article
            v-for="(region, orderIndex) in orderedRegionSummaries"
            :key="region.name"
            class="province-overview-card"
            :class="{
              'province-overview-card--dragging': draggedRegionName === region.name,
              'province-overview-card--drop-target': dropTargetRegionName === region.name && draggedRegionName !== region.name,
            }"
            draggable="true"
            @dragstart="onRegionDragStart($event, region.name)"
            @dragenter.prevent="onRegionDragEnter(region.name)"
            @dragover.prevent
            @drop.prevent="onRegionDrop(region.name)"
            @dragend="onRegionDragEnd"
          >
            <header class="province-overview-card-header">
              <span class="province-drag-handle" title="Drag to reorder">
                <GripVertical :size="18" />
              </span>
              <div>
                <p class="eyebrow">#{{ orderIndex + 1 }}</p>
                <h3>{{ region.name }}</h3>
                <small>{{ region.provinceCount }} provinces</small>
              </div>
              <div class="province-overview-pop">
                <span>Regional Pop</span>
                <strong>{{ formatCompactNumber(region.provincialPopulation) }}</strong>
              </div>
            </header>

            <div class="province-status-strip">
              <span v-for="badge in region.badges" :key="badge.label" :class="`province-status-chip province-status-chip--${badge.tone}`">
                {{ badge.label }}
              </span>
            </div>

            <div class="province-overview-metrics region-overview-metrics">
              <div v-for="metric in region.topMetrics" :key="metric.label" class="province-metric-tile">
                <span>{{ metric.label }}</span>
                <strong>{{ metric.value }}</strong>
              </div>
            </div>

            <div class="province-detail-grid">
              <section class="province-detail-block">
                <h4>Civic</h4>
                <div v-for="metric in region.civicMetrics" :key="metric.label" class="metric-row">
                  <span>{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                </div>
              </section>

              <section class="province-detail-block">
                <h4>Yields</h4>
                <div class="yield-bar-list">
                  <div v-for="yieldItem in region.yieldMetrics" :key="yieldItem.key" class="yield-bar-row">
                    <span>{{ yieldItem.label }}</span>
                    <div class="yield-bar-track">
                      <i :style="{ width: `${yieldItem.share}%` }"></i>
                    </div>
                    <strong>{{ formatNumber(yieldItem.value) }}</strong>
                  </div>
                </div>
              </section>

              <section class="province-detail-block">
                <h4>Religion</h4>
                <div class="metric-row">
                  <span>Dominant</span>
                  <strong>{{ region.religionName }}</strong>
                </div>
                <div class="metric-row">
                  <span>Followers</span>
                  <strong>{{ formatNumber(region.religionFollowers) }}</strong>
                </div>
              </section>

              <section class="province-detail-block">
                <h4>Provinces</h4>
                <div class="metric-row">
                  <span>County Records</span>
                  <strong>{{ region.countyDetailCount }} / {{ region.countyCount }}</strong>
                </div>
                <div class="region-province-list">
                  <span v-for="provinceName in region.provinceNames" :key="provinceName">{{ provinceName }}</span>
                  <span v-if="!region.provinceNames.length">No assigned provinces</span>
                </div>
              </section>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="activeSection === 'provincial-overview'" class="workspace-panel">
        <div class="section-header">
          <div>
            <p class="eyebrow">Provincial Overview</p>
            <h2>{{ provinceCount }} Provinces</h2>
          </div>
          <Rows3 class="panel-icon" />
        </div>

        <div class="province-overview-list">
          <div v-if="!orderedProvinceSummaries.length" class="empty-inline">
            No provinces available.
          </div>

          <article
            v-for="(province, orderIndex) in orderedProvinceSummaries"
            :key="province.index"
            class="province-overview-card"
            :class="{
              'province-overview-card--dragging': draggedProvinceIndex === province.index,
              'province-overview-card--drop-target': dropTargetProvinceIndex === province.index && draggedProvinceIndex !== province.index,
            }"
            draggable="true"
            @dragstart="onProvinceDragStart($event, province.index)"
            @dragenter.prevent="onProvinceDragEnter(province.index)"
            @dragover.prevent
            @drop.prevent="onProvinceDrop(province.index)"
            @dragend="onProvinceDragEnd"
          >
            <header class="province-overview-card-header">
              <span class="province-drag-handle" title="Drag to reorder">
                <GripVertical :size="18" />
              </span>
              <div>
                <p class="eyebrow">#{{ orderIndex + 1 }}</p>
                <h3>{{ province.name }}</h3>
                <small>{{ province.group }}</small>
              </div>
              <div class="province-overview-pop">
                <span>Provincial Pop</span>
                <strong>{{ formatCompactNumber(province.provincialPopulation) }}</strong>
              </div>
            </header>

            <div class="province-status-strip">
              <span v-for="badge in province.badges" :key="badge.label" :class="`province-status-chip province-status-chip--${badge.tone}`">
                {{ badge.label }}
              </span>
            </div>

            <div class="province-overview-metrics">
              <div v-for="metric in province.topMetrics" :key="metric.label" class="province-metric-tile">
                <span>{{ metric.label }}</span>
                <strong>{{ metric.value }}</strong>
              </div>
            </div>

            <div class="province-detail-grid">
              <section class="province-detail-block">
                <h4>Civic</h4>
                <div v-for="metric in province.civicMetrics" :key="metric.label" class="metric-row">
                  <span>{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                </div>
              </section>

              <section class="province-detail-block">
                <h4>Yields</h4>
                <div class="yield-bar-list">
                  <div v-for="yieldItem in province.yieldMetrics" :key="yieldItem.key" class="yield-bar-row">
                    <span>{{ yieldItem.label }}</span>
                    <div class="yield-bar-track">
                      <i :style="{ width: `${yieldItem.share}%` }"></i>
                    </div>
                    <strong>{{ formatNumber(yieldItem.value) }}</strong>
                  </div>
                </div>
              </section>

              <section class="province-detail-block">
                <h4>Religion</h4>
                <div class="metric-row">
                  <span>Dominant</span>
                  <strong>{{ province.religionName }}</strong>
                </div>
                <div class="metric-row">
                  <span>Followers</span>
                  <strong>{{ formatNumber(province.religionFollowers) }}</strong>
                </div>
              </section>

              <section class="province-detail-block">
                <h4>County Data</h4>
                <div class="metric-row">
                  <span>Records</span>
                  <strong>{{ province.countyDetailCount }} / {{ province.countyCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>County Yield</span>
                  <strong>{{ formatNumber(province.totalCountyYield) }}</strong>
                </div>
              </section>
            </div>

            <p v-if="province.notes" class="province-overview-notes">{{ province.notes }}</p>
          </article>
        </div>
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
import { defineAsyncComponent, markRaw, ref } from 'vue'
import { BadgeCheck, Braces, FilePlus2, Flag, Globe2, GripVertical, Layers, MapPinned, Network, Rows3 } from 'lucide-vue-next'
import { useBuilderCardOrder } from '../composables/useBuilderCardOrder'
import { useBuilderOverview } from '../composables/useBuilderOverview'
import { useFormStore } from '../stores/formStore'

const ArraySection = defineAsyncComponent(() => import('./ArraySection.vue'))
const FieldsetGroup = defineAsyncComponent(() => import('./FieldsetGroup.vue'))
const JSONPreview = defineAsyncComponent(() => import('./JSONPreview.vue'))
const ReferenceDataSection = defineAsyncComponent(() => import('./ReferenceDataSection.vue'))

export default {
  name: 'FormContainer',
  components: {
    ArraySection,
    BadgeCheck,
    FieldsetGroup,
    FilePlus2,
    Globe2,
    GripVertical,
    JSONPreview,
    Network,
    ReferenceDataSection,
    Rows3,
  },
  setup() {
    const store = useFormStore()
    const activeSection = ref('country-overview')
    const sections = [
      { id: 'country-overview', label: 'Country Overview', icon: markRaw(BadgeCheck) },
      { id: 'regional-overview', label: 'Regional Overview', icon: markRaw(Network) },
      { id: 'provincial-overview', label: 'Provincial Overview', icon: markRaw(Rows3) },
      { id: 'country', label: 'Country Data', icon: markRaw(Flag) },
      { id: 'provinces', label: 'Provinces Data', icon: markRaw(MapPinned) },
      { id: 'reference', label: 'Reference Data', icon: markRaw(Layers) },
      { id: 'json', label: 'JSON Preview', icon: markRaw(Braces) },
    ]

    const {
      civicMetrics,
      countryIdentity,
      countryName,
      countrySummaryCards,
      economyMetrics,
      formatCompactNumber,
      formatNumber,
      groupCount,
      provinceCount,
      provinceSummaries,
      regionSummaries,
      religionMetrics,
      representationMetrics,
      sidebarProvinceOrder,
      totalEconomyOutput,
      totalProvincialPopulation,
      totalRawPopulation,
    } = useBuilderOverview(store)

    const {
      draggedProvinceIndex,
      draggedRegionName,
      dropTargetProvinceIndex,
      dropTargetRegionName,
      onProvinceDragEnd,
      onProvinceDragEnter,
      onProvinceDragStart,
      onProvinceDrop,
      onRegionDragEnd,
      onRegionDragEnter,
      onRegionDragStart,
      onRegionDrop,
      orderedProvinceSummaries,
      orderedRegionSummaries,
    } = useBuilderCardOrder({ provinceSummaries, regionSummaries, sidebarProvinceOrder })

    return {
      activeSection,
      civicMetrics,
      countryIdentity,
      countryName,
      countrySummaryCards,
      draggedProvinceIndex,
      draggedRegionName,
      dropTargetProvinceIndex,
      dropTargetRegionName,
      economyMetrics,
      formatCompactNumber,
      formatNumber,
      groupCount,
      onProvinceDragEnd,
      onProvinceDragEnter,
      onProvinceDragStart,
      onProvinceDrop,
      onRegionDragEnd,
      onRegionDragEnter,
      onRegionDragStart,
      onRegionDrop,
      orderedProvinceSummaries,
      orderedRegionSummaries,
      provinceCount,
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

<template>
  <section class="province-details-page">
    <div v-if="!hasData" class="empty-workspace">
      <ChartNoAxesColumnIncreasing :size="52" class="text-[var(--accent)]" />
      <div>
        <h2>No Province Data</h2>
        <p>Load or create a template to compare provinces.</p>
      </div>
      <button type="button" class="btn-primary" @click="store.loadDefault">
        <FilePlus2 :size="16" />
        New Template
      </button>
    </div>

    <template v-else>
      <header class="province-details-header">
        <div class="province-title-block">
          <p class="eyebrow">Province Details</p>
          <h2>{{ currentMode.label }}</h2>
          <div class="province-context-chips">
            <span>{{ selectedRows.length }} selected</span>
            <span>{{ selectedGroupCount }} groups</span>
            <span :class="{ 'is-muted': !selectedCountyDetailCount }">
              County detail {{ selectedCountyDetailCount ? `${selectedCountyDetailCount}/${selectedCountyCount}` : 'empty' }}
            </span>
          </div>
        </div>

        <label class="visualization-select">
          <span>Visualization</span>
          <select v-model="selectedMode">
            <option v-for="mode in modes" :key="mode.id" :value="mode.id">{{ mode.label }}</option>
          </select>
        </label>
      </header>

      <section class="province-summary-grid" aria-label="Province selection summary">
        <article v-for="card in summaryCards" :key="card.label" class="province-summary-card">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <small>{{ card.detail }}</small>
        </article>
      </section>

      <div class="province-details-layout">
        <aside class="province-details-controls">
          <section class="control-panel">
            <div class="control-panel-header">
              <span>Province Set</span>
              <div class="control-actions">
                <button type="button" :disabled="!visibleRows.length" @click="selectVisible">
                  <CheckCheck :size="14" />
                  Visible
                </button>
                <button type="button" :disabled="!visibleRows.length" @click="selectTopSix">
                  <Trophy :size="14" />
                  Top 6
                </button>
                <button type="button" :disabled="!selectedRows.length" @click="clearSelection">
                  <XIcon :size="14" />
                  Clear
                </button>
              </div>
            </div>

            <div class="province-filter-stack">
              <label class="province-search-field">
                <Search :size="15" />
                <input v-model="query" type="search" placeholder="Search provinces" />
              </label>

              <div class="province-filter-row">
                <label class="control-field">
                  <span>Group</span>
                  <select v-model="groupFilter">
                    <option value="all">All Groups</option>
                    <option v-for="group in allGroups" :key="group" :value="group">{{ group }}</option>
                  </select>
                </label>

                <label class="control-field">
                  <span>Sort</span>
                  <select v-model="sortMode">
                    <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
              </div>

              <div class="visible-selection-count">
                {{ selectedVisibleCount }} / {{ visibleRows.length }} visible selected
              </div>
            </div>

            <div class="province-toggle-list">
              <label
                v-for="row in visibleRows"
                :key="row.index"
                class="province-toggle"
                :class="{ 'province-toggle--selected': selectedIndices.includes(row.index) }"
              >
                <input type="checkbox" :value="row.index" v-model="selectedIndices" />
                <span class="province-toggle-main">
                  <strong>{{ row.name }}</strong>
                  <small>{{ row.group }}</small>
                </span>
                <span class="province-toggle-stats">
                  <small>{{ formatCompactNumber(row.provincialPopulation) }}</small>
                  <small>{{ formatNumber(row.totalYield) }} yield</small>
                </span>
              </label>

              <div v-if="!visibleRows.length" class="empty-inline">
                No provinces match the current filters.
              </div>
            </div>
          </section>

          <section class="control-panel compact-metrics">
            <div class="metric-row">
              <span>Selected</span>
              <strong>{{ selectedRows.length }} / {{ rows.length }}</strong>
            </div>
            <div class="metric-row">
              <span>Groups</span>
              <strong>{{ selectedGroupCount }}</strong>
            </div>
            <div class="metric-row">
              <span>Population</span>
              <strong>{{ formatNumber(selectedPopulation) }}</strong>
            </div>
            <div class="metric-row">
              <span>Calculated Pop</span>
              <strong>{{ formatNumber(selectedProvincialPopulation) }}</strong>
            </div>
            <div class="metric-row">
              <span>Counties</span>
              <strong>{{ selectedCountyDetailCount }} / {{ selectedCountyCount }}</strong>
            </div>
          </section>
        </aside>

        <section class="province-visualization-panel">
          <div class="chart-panel-header">
            <div>
              <p class="eyebrow">{{ currentMode.category }}</p>
              <h3>{{ currentMode.label }}</h3>
            </div>
            <div class="chart-panel-meta">
              <span>{{ chartRows.length }} provinces</span>
              <span>{{ formatCompactNumber(selectedProvincialPopulation) }} pop</span>
            </div>
          </div>

          <div class="mode-board" aria-label="Province visualization modes">
            <section v-for="group in modeGroups" :key="group.category" class="mode-cluster">
              <span>{{ group.category }}</span>
              <div class="mode-chip-list">
                <button
                  v-for="mode in group.modes"
                  :key="mode.id"
                  type="button"
                  class="mode-chip"
                  :class="{ 'mode-chip--active': mode.id === selectedMode }"
                  @click="selectedMode = mode.id"
                >
                  {{ mode.label }}
                </button>
              </div>
            </section>
          </div>

          <div class="chart-shell">
            <ProvinceChart :option="chartOption" :aria-label="currentMode.label" />
          </div>
        </section>
      </div>
    </template>
  </section>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { ChartNoAxesColumnIncreasing, CheckCheck, FilePlus2, Search, Trophy, X as XIcon } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import { useFormStore } from '../stores/formStore'
import {
  PROVINCE_YIELD_KEYS,
  PROVINCE_VISUALIZATION_MODES,
  buildProvinceComparisonRows,
  buildProvinceVisualizationOption,
  formatCompactNumber,
  formatNumber,
} from '../domain/provinceVisualizations'

const SORT_OPTIONS = [
  { value: 'provincial-population', label: 'Provincial Pop' },
  { value: 'total-yield', label: 'Total Yield' },
  { value: 'growth', label: 'Growth' },
  { value: 'happiness', label: 'Happiness' },
  { value: 'loyalty', label: 'Loyalty' },
  { value: 'name', label: 'Name' },
]

function labelForYield(key) {
  if (key === 'none') return 'None'
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export default {
  name: 'ProvinceDetails',
  components: { ChartNoAxesColumnIncreasing, CheckCheck, FilePlus2, ProvinceChart, Search, Trophy, XIcon },
  setup() {
    const store = useFormStore()
    const selectedMode = ref(PROVINCE_VISUALIZATION_MODES[0].id)
    const selectedIndices = ref([])
    const query = ref('')
    const groupFilter = ref('all')
    const sortMode = ref('provincial-population')

    const rows = computed(() => buildProvinceComparisonRows(store.currentData, store.provinceCalcs))
    const hasData = computed(() => rows.value.length > 0)
    const modes = PROVINCE_VISUALIZATION_MODES
    const currentMode = computed(() => modes.find((mode) => mode.id === selectedMode.value) || modes[0])
    const sortOptions = SORT_OPTIONS
    const allGroups = computed(() => [...new Set(rows.value.map((row) => row.group))].sort((a, b) => a.localeCompare(b)))

    const modeGroups = computed(() => {
      return modes.reduce((groups, mode) => {
        let group = groups.find((item) => item.category === mode.category)
        if (!group) {
          group = { category: mode.category, modes: [] }
          groups.push(group)
        }
        group.modes.push(mode)
        return groups
      }, [])
    })

    const selectedRows = computed(() => {
      const selected = new Set(selectedIndices.value)
      return rows.value.filter((row) => selected.has(row.index))
    })

    function sortRows(inputRows) {
      const sorted = [...inputRows]
      const compareByName = (a, b) => a.name.localeCompare(b.name)

      switch (sortMode.value) {
        case 'total-yield':
          return sorted.sort((a, b) => b.totalYield - a.totalYield || compareByName(a, b))
        case 'growth':
          return sorted.sort((a, b) => b.growthPercentage - a.growthPercentage || compareByName(a, b))
        case 'happiness':
          return sorted.sort((a, b) => b.happinessPercentage - a.happinessPercentage || compareByName(a, b))
        case 'loyalty':
          return sorted.sort((a, b) => b.loyalty - a.loyalty || compareByName(a, b))
        case 'name':
          return sorted.sort(compareByName)
        case 'provincial-population':
        default:
          return sorted.sort((a, b) => b.provincialPopulation - a.provincialPopulation || compareByName(a, b))
      }
    }

    const visibleRows = computed(() => {
      const normalizedQuery = query.value.trim().toLowerCase()
      return sortRows(
        rows.value.filter((row) => {
          const matchesQuery =
            !normalizedQuery ||
            row.name.toLowerCase().includes(normalizedQuery) ||
            row.group.toLowerCase().includes(normalizedQuery)
          const matchesGroup = groupFilter.value === 'all' || row.group === groupFilter.value
          return matchesQuery && matchesGroup
        })
      )
    })

    const chartRows = computed(() => sortRows(selectedRows.value))
    const chartOption = computed(() => buildProvinceVisualizationOption(selectedMode.value, chartRows.value))

    const selectedPopulation = computed(() => selectedRows.value.reduce((sum, row) => sum + row.population, 0))
    const selectedProvincialPopulation = computed(() => selectedRows.value.reduce((sum, row) => sum + row.provincialPopulation, 0))
    const selectedAssemblypeople = computed(() => selectedRows.value.reduce((sum, row) => sum + row.assemblypeople, 0))
    const selectedPrelates = computed(() => selectedRows.value.reduce((sum, row) => sum + row.prelates, 0))
    const selectedCountyCount = computed(() => selectedRows.value.reduce((sum, row) => sum + row.countyCount, 0))
    const selectedCountyDetailCount = computed(() => selectedRows.value.reduce((sum, row) => sum + row.countyDetailCount, 0))
    const selectedGroupCount = computed(() => new Set(selectedRows.value.map((row) => row.group)).size)
    const selectedVisibleCount = computed(() => {
      const selected = new Set(selectedIndices.value)
      return visibleRows.value.filter((row) => selected.has(row.index)).length
    })

    const topProvince = computed(() => {
      return [...selectedRows.value].sort((a, b) => b.provincialPopulation - a.provincialPopulation)[0] || null
    })

    const topYield = computed(() => {
      if (!selectedRows.value.length) return { key: 'none', total: 0 }

      const totals = PROVINCE_YIELD_KEYS.map((key) => ({
        key,
        total: selectedRows.value.reduce((sum, row) => sum + row.yields[key], 0),
      })).sort((a, b) => b.total - a.total)

      return totals[0] || { key: 'none', total: 0 }
    })

    const dominantReligion = computed(() => {
      const totals = {}
      selectedRows.value.forEach((row) => {
        row.religions.forEach((religion) => {
          if (religion.followers <= 0) return
          totals[religion.name] = (totals[religion.name] || 0) + religion.followers
        })
      })

      const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]
      return top ? top[0] : 'None'
    })

    const summaryCards = computed(() => [
      {
        label: 'Provinces',
        value: `${selectedRows.value.length} of ${rows.value.length}`,
        detail: `${selectedGroupCount.value} groups`,
      },
      {
        label: 'Provincial Pop',
        value: formatCompactNumber(selectedProvincialPopulation.value),
        detail: `${formatNumber(selectedPopulation.value)} raw pop`,
      },
      {
        label: 'Top Province',
        value: topProvince.value?.name || 'None',
        detail: topProvince.value ? `${formatCompactNumber(topProvince.value.provincialPopulation)} pop` : 'No selection',
      },
      {
        label: 'Top Yield',
        value: labelForYield(topYield.value.key),
        detail: `${formatNumber(topYield.value.total)} total`,
      },
      {
        label: 'Assemblypeople',
        value: formatNumber(selectedAssemblypeople.value),
        detail: `${formatNumber(selectedPrelates.value)} prelates`,
      },
      {
        label: 'Religion',
        value: dominantReligion.value,
        detail: selectedCountyDetailCount.value ? `${selectedCountyDetailCount.value} county records` : 'Province-level data',
      },
    ])

    watch(
      rows,
      (nextRows) => {
        const nextIndices = new Set(nextRows.map((row) => row.index))
        const retained = selectedIndices.value.filter((index) => nextIndices.has(index))
        selectedIndices.value = retained.length ? retained : nextRows.map((row) => row.index)
      },
      { immediate: true }
    )

    function selectAll() {
      selectedIndices.value = rows.value.map((row) => row.index)
    }

    function selectVisible() {
      selectedIndices.value = visibleRows.value.map((row) => row.index)
    }

    function selectTopSix() {
      selectedIndices.value = [...visibleRows.value]
        .sort((a, b) => b.provincialPopulation - a.provincialPopulation)
        .slice(0, 6)
        .map((row) => row.index)
    }

    function clearSelection() {
      selectedIndices.value = []
    }

    return {
      chartOption,
      chartRows,
      clearSelection,
      currentMode,
      allGroups,
      formatCompactNumber,
      formatNumber,
      groupFilter,
      hasData,
      modes,
      modeGroups,
      query,
      rows,
      selectAll,
      selectTopSix,
      selectVisible,
      selectedCountyCount,
      selectedCountyDetailCount,
      selectedGroupCount,
      selectedIndices,
      selectedMode,
      selectedPopulation,
      selectedProvincialPopulation,
      selectedRows,
      selectedVisibleCount,
      sortMode,
      sortOptions,
      store,
      summaryCards,
      visibleRows,
    }
  },
}
</script>

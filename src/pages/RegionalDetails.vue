<template>
  <section class="province-details-page regional-details-page">
    <div v-if="!hasData" class="empty-workspace">
      <Network :size="52" class="text-[var(--accent)]" />
      <div>
        <h2>No Regional Data</h2>
        <p>Load or create a template with province groups.</p>
      </div>
      <button type="button" class="btn-primary" @click="store.loadDefault">
        <FilePlus2 :size="16" />
        New Template
      </button>
    </div>

    <template v-else>
      <header class="province-details-header">
        <div class="province-title-block">
          <p class="eyebrow">Regional Details</p>
          <h2>Regional Decision Desk</h2>
          <p class="province-deck">{{ currentMode.label }} · {{ chartRows.length }} region sample</p>
          <div class="province-context-chips">
            <span>{{ selectedRows.length }} selected</span>
            <span>{{ selectedProvinceCount }} provinces</span>
            <span>{{ formatCompactNumber(selectedProvincialPopulation) }} people</span>
            <span>{{ selectedCountyDetailCount }}/{{ selectedCountyCount }} county records</span>
          </div>
        </div>

        <label class="visualization-select">
          <span>Visualization</span>
          <select v-model="selectedMode">
            <option v-for="mode in modes" :key="mode.id" :value="mode.id">{{ mode.label }}</option>
          </select>
        </label>
      </header>

      <section class="province-summary-grid" aria-label="Regional selection summary">
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
              <span>Region Set</span>
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
                <input v-model="query" type="search" placeholder="Search regions" />
              </label>

              <label class="control-field">
                <span>Sort</span>
                <select v-model="sortMode">
                  <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <div class="visible-selection-count">
                {{ selectedVisibleCount }} / {{ visibleRows.length }} visible selected
              </div>
            </div>

            <div class="province-toggle-list">
              <label
                v-for="row in visibleRows"
                :key="row.name"
                class="province-toggle"
                :class="{ 'province-toggle--selected': selectedNames.includes(row.name) }"
              >
                <input type="checkbox" :value="row.name" v-model="selectedNames" />
                <span class="province-toggle-main">
                  <strong>{{ row.name }}</strong>
                  <small>{{ row.dominantOrigin }} · {{ row.provinceCount }} provinces</small>
                </span>
                <span class="province-toggle-stats">
                  <small>{{ formatCompactNumber(row.provincialPopulation) }}</small>
                  <small>{{ formatNumber(row.totalYield) }} yield</small>
                </span>
              </label>

              <div v-if="!visibleRows.length" class="empty-inline">
                No regions match the current filters.
              </div>
            </div>
          </section>

          <section class="control-panel compact-metrics">
            <div class="metric-row">
              <span>Selected</span>
              <strong>{{ selectedRows.length }} / {{ rows.length }}</strong>
            </div>
            <div class="metric-row">
              <span>Provinces</span>
              <strong>{{ selectedProvinceCount }}</strong>
            </div>
            <div class="metric-row">
              <span>Assembly</span>
              <strong>{{ formatNumber(selectedAssemblypeople) }}</strong>
            </div>
            <div class="metric-row">
              <span>Council</span>
              <strong>{{ formatNumber(selectedPrelates) }}</strong>
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
              <span>{{ chartRows.length }} regions</span>
              <span>{{ formatCompactNumber(selectedProvincialPopulation) }} pop</span>
            </div>
          </div>

          <div class="mode-board" aria-label="Regional visualization modes">
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

          <div class="province-analysis-layout">
            <div class="chart-shell">
              <ProvinceChart :option="chartOption" :aria-label="currentMode.label" />
            </div>

            <aside class="province-readout-panel">
              <div class="readout-section">
                <p class="eyebrow">Desk Readout</p>
                <article v-for="item in deskInsights" :key="item.label" class="readout-card">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <small>{{ item.detail }}</small>
                </article>
              </div>

              <div class="readout-section">
                <p class="eyebrow">Current Board</p>
                <div class="readout-rank-list">
                  <div v-for="(row, index) in rankedReadoutRows" :key="row.name" class="readout-rank-row">
                    <span>{{ index + 1 }}</span>
                    <div>
                      <strong>{{ row.name }}</strong>
                      <small>{{ row.detail }}</small>
                    </div>
                    <b>{{ row.valueLabel }}</b>
                  </div>
                </div>
              </div>

              <div class="readout-section">
                <p class="eyebrow">Origin Blocs</p>
                <div class="origin-bloc-list">
                  <div v-for="origin in originRows.slice(0, 5)" :key="origin.origin" class="origin-bloc-row">
                    <span>{{ origin.origin }}</span>
                    <strong>{{ origin.provinces }}</strong>
                    <small>{{ formatCompactNumber(origin.provincialPopulation) }}</small>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </template>
  </section>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { CheckCheck, FilePlus2, Network, Search, Trophy, X as XIcon } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import { useFormStore } from '../stores/formStore'
import {
  PROVINCE_YIELD_KEYS,
  REGIONAL_VISUALIZATION_MODES,
  buildRegionalComparisonRows,
  buildRegionalVisualizationOption,
  civicRiskScore,
  countyReadinessScore,
  formatCompactNumber,
  formatNumber,
} from '../domain/provinceVisualizations'

const SORT_OPTIONS = [
  { value: 'provincial-population', label: 'Provincial Pop' },
  { value: 'risk', label: 'Civic Risk' },
  { value: 'readiness', label: 'County Readiness' },
  { value: 'connectivity', label: 'Frontier Distance' },
  { value: 'total-yield', label: 'Total Yield' },
  { value: 'province-count', label: 'Province Count' },
  { value: 'name', label: 'Name' },
]

function labelForYield(key) {
  if (key === 'none') return 'None'
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatPercent(value) {
  return `${formatNumber(value)}%`
}

export default {
  name: 'RegionalDetails',
  components: { CheckCheck, FilePlus2, Network, ProvinceChart, Search, Trophy, XIcon },
  setup() {
    const store = useFormStore()
    const selectedMode = ref(REGIONAL_VISUALIZATION_MODES[0].id)
    const selectedNames = ref([])
    const query = ref('')
    const sortMode = ref('provincial-population')

    const rows = computed(() => buildRegionalComparisonRows(store.currentData, store.provinceCalcs))
    const hasData = computed(() => rows.value.length > 0)
    const modes = REGIONAL_VISUALIZATION_MODES
    const currentMode = computed(() => modes.find((mode) => mode.id === selectedMode.value) || modes[0])
    const sortOptions = SORT_OPTIONS

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
      const selected = new Set(selectedNames.value)
      return rows.value.filter((row) => selected.has(row.name))
    })

    function sortRows(inputRows) {
      const sorted = [...inputRows]
      const compareByName = (a, b) => a.name.localeCompare(b.name)

      switch (sortMode.value) {
        case 'risk':
          return sorted.sort((a, b) => civicRiskScore(b) - civicRiskScore(a) || compareByName(a, b))
        case 'readiness':
          return sorted.sort((a, b) => countyReadinessScore(b) - countyReadinessScore(a) || compareByName(a, b))
        case 'connectivity':
          return sorted.sort((a, b) => b.averageClosestProvinceDistance - a.averageClosestProvinceDistance || compareByName(a, b))
        case 'total-yield':
          return sorted.sort((a, b) => b.totalYield - a.totalYield || compareByName(a, b))
        case 'province-count':
          return sorted.sort((a, b) => b.provinceCount - a.provinceCount || compareByName(a, b))
        case 'name':
          return sorted.sort(compareByName)
        case 'provincial-population':
        default:
          return sorted.sort((a, b) => b.provincialPopulation - a.provincialPopulation || compareByName(a, b))
      }
    }

    const visibleRows = computed(() => {
      const normalizedQuery = query.value.trim().toLowerCase()
      return sortRows(rows.value.filter((row) => !normalizedQuery || row.name.toLowerCase().includes(normalizedQuery) || row.dominantOrigin.toLowerCase().includes(normalizedQuery)))
    })

    const chartRows = computed(() => sortRows(selectedRows.value))
    const chartOption = computed(() => buildRegionalVisualizationOption(selectedMode.value, chartRows.value))
    const selectedProvinceCount = computed(() => selectedRows.value.reduce((sum, row) => sum + row.provinceCount, 0))
    const selectedProvincialPopulation = computed(() => selectedRows.value.reduce((sum, row) => sum + row.provincialPopulation, 0))
    const selectedAssemblypeople = computed(() => selectedRows.value.reduce((sum, row) => sum + row.assemblypeople, 0))
    const selectedPrelates = computed(() => selectedRows.value.reduce((sum, row) => sum + row.prelates, 0))
    const selectedCountyCount = computed(() => selectedRows.value.reduce((sum, row) => sum + row.countyCount, 0))
    const selectedCountyDetailCount = computed(() => selectedRows.value.reduce((sum, row) => sum + row.countyDetailCount, 0))
    const selectedVisibleCount = computed(() => {
      const selected = new Set(selectedNames.value)
      return visibleRows.value.filter((row) => selected.has(row.name)).length
    })

    const topRegion = computed(() => [...selectedRows.value].sort((a, b) => b.provincialPopulation - a.provincialPopulation)[0] || null)
    const topYield = computed(() => {
      if (!selectedRows.value.length) return { key: 'none', total: 0 }
      return PROVINCE_YIELD_KEYS.map((key) => ({
        key,
        total: selectedRows.value.reduce((sum, row) => sum + row.yields[key], 0),
      })).sort((a, b) => b.total - a.total)[0] || { key: 'none', total: 0 }
    })
    const averageRisk = computed(() => selectedRows.value.length ? selectedRows.value.reduce((sum, row) => sum + civicRiskScore(row), 0) / selectedRows.value.length : 0)
    const averageReadiness = computed(() => selectedRows.value.length ? selectedRows.value.reduce((sum, row) => sum + countyReadinessScore(row), 0) / selectedRows.value.length : 0)
    const frontierRegion = computed(() => [...selectedRows.value].sort((a, b) => b.averageClosestProvinceDistance - a.averageClosestProvinceDistance)[0] || null)

    const originRows = computed(() => {
      const totals = {}
      selectedRows.value.forEach((row) => {
        Object.entries(row.originalCountries || {}).forEach(([origin, provinces]) => {
          if (!totals[origin]) totals[origin] = { origin, provinces: 0, provincialPopulation: 0 }
          totals[origin].provinces += provinces
          totals[origin].provincialPopulation += row.provincialPopulation * (provinces / Math.max(1, row.provinceCount))
        })
      })
      return Object.values(totals).sort((a, b) => b.provincialPopulation - a.provincialPopulation)
    })
    const topOrigin = computed(() => originRows.value[0] || { origin: 'Unspecified', provinces: 0, provincialPopulation: 0 })

    const dominantReligion = computed(() => {
      const totals = {}
      selectedRows.value.forEach((row) => {
        Object.entries(row.religions || {}).forEach(([religion, followers]) => {
          totals[religion] = (totals[religion] || 0) + followers
        })
      })
      return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'
    })

    const summaryCards = computed(() => [
      {
        label: 'Regions',
        value: `${selectedRows.value.length} of ${rows.value.length}`,
        detail: `${selectedProvinceCount.value} provinces`,
      },
      {
        label: 'Provincial Pop',
        value: formatCompactNumber(selectedProvincialPopulation.value),
        detail: topRegion.value ? `${topRegion.value.name} leads` : 'No selection',
      },
      {
        label: 'Top Yield',
        value: labelForYield(topYield.value.key),
        detail: `${formatNumber(topYield.value.total)} total`,
      },
      {
        label: 'Civic Risk',
        value: formatPercent(averageRisk.value),
        detail: averageRisk.value >= 55 ? 'Watch list elevated' : 'Within normal range',
      },
      {
        label: 'County Readiness',
        value: formatPercent(averageReadiness.value),
        detail: `${selectedCountyDetailCount.value}/${selectedCountyCount.value} records`,
      },
      {
        label: 'Origin Bloc',
        value: topOrigin.value.origin,
        detail: `${topOrigin.value.provinces} provinces · ${formatCompactNumber(topOrigin.value.provincialPopulation)} pop`,
      },
    ])

    const deskInsights = computed(() => [
      {
        label: 'Representation',
        value: `${formatNumber(selectedAssemblypeople.value)} A / ${formatNumber(selectedPrelates.value)} P`,
        detail: `${selectedProvinceCount.value} provinces in the selected desk`,
      },
      {
        label: 'Frontier Read',
        value: frontierRegion.value?.name || 'No distances',
        detail: frontierRegion.value
          ? `${formatNumber(frontierRegion.value.averageClosestProvinceDistance)} avg nearest distance`
          : 'Closest province data is empty',
      },
      {
        label: 'Religious Center',
        value: dominantReligion.value,
        detail: selectedRows.value.length ? 'Largest follower bloc among selected regions' : 'No selection',
      },
      {
        label: 'Economic Lean',
        value: labelForYield(topYield.value.key),
        detail: `${formatNumber(topYield.value.total)} selected yield`,
      },
    ])

    const rankedReadoutRows = computed(() => {
      const scoreForMode = (row) => {
        switch (selectedMode.value) {
          case 'regional-risk':
            return civicRiskScore(row)
          case 'county-readiness':
            return countyReadinessScore(row)
          case 'connectivity-frontier':
            return row.averageClosestProvinceDistance
          case 'regional-economy':
            return row.totalYield
          case 'origin-blocs':
            return row.provincialPopulation
          case 'religion-mix':
            return Object.values(row.religions || {}).reduce((sum, value) => sum + value, 0)
          case 'population-representation':
          default:
            return row.provincialPopulation
        }
      }

      return [...selectedRows.value]
        .sort((a, b) => scoreForMode(b) - scoreForMode(a) || a.name.localeCompare(b.name))
        .slice(0, 8)
        .map((row) => ({
          name: row.name,
          valueLabel: selectedMode.value === 'regional-risk' || selectedMode.value === 'county-readiness'
            ? formatPercent(scoreForMode(row))
            : formatCompactNumber(scoreForMode(row)),
          detail: selectedMode.value === 'connectivity-frontier'
            ? `Nearest ${row.nearestProvinceName}`
            : `${row.provinceCount} provinces · ${formatCompactNumber(row.provincialPopulation)} pop`,
        }))
    })

    watch(
      rows,
      (nextRows) => {
        const nextNames = new Set(nextRows.map((row) => row.name))
        const retained = selectedNames.value.filter((name) => nextNames.has(name))
        selectedNames.value = retained.length ? retained : nextRows.map((row) => row.name)
      },
      { immediate: true }
    )

    function selectVisible() {
      selectedNames.value = visibleRows.value.map((row) => row.name)
    }

    function selectTopSix() {
      selectedNames.value = [...visibleRows.value]
        .sort((a, b) => b.provincialPopulation - a.provincialPopulation)
        .slice(0, 6)
        .map((row) => row.name)
    }

    function clearSelection() {
      selectedNames.value = []
    }

    return {
      chartOption,
      chartRows,
      clearSelection,
      currentMode,
      deskInsights,
      formatCompactNumber,
      formatNumber,
      hasData,
      modeGroups,
      modes,
      originRows,
      query,
      rankedReadoutRows,
      rows,
      selectedAssemblypeople,
      selectedCountyCount,
      selectedCountyDetailCount,
      selectedMode,
      selectedNames,
      selectedPrelates,
      selectedProvinceCount,
      selectedProvincialPopulation,
      selectedRows,
      selectedVisibleCount,
      selectTopSix,
      selectVisible,
      sortMode,
      sortOptions,
      store,
      summaryCards,
      visibleRows,
    }
  },
}
</script>

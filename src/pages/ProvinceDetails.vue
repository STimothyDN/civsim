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
          <h2>Province Decision Desk</h2>
          <p class="province-deck">{{ chartRows.length }} provinces · {{ currentMode.label }}</p>
          <div class="province-context-chips">
            <span>{{ rows.length }} provinces</span>
            <span>{{ allGroups.length }} groups</span>
            <span>{{ formatCompactNumber(totalProvincialPopulation) }} people</span>
            <span>Selected: {{ selectedIndices.length }}</span>
            <span v-if="focusedRow">Focus: {{ focusedRow.name }}</span>
          </div>
        </div>

        <label class="visualization-select">
          <span>Visualization</span>
          <select v-model="selectedMode">
            <option v-for="mode in modes" :key="mode.id" :value="mode.id">{{ mode.label }}</option>
          </select>
        </label>
      </header>

      <section class="province-summary-grid" aria-label="Province summary">
        <article v-for="card in summaryCards" :key="card.label" class="province-summary-card">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <small>{{ card.detail }}</small>
        </article>
      </section>

      <section class="constellation-band">
        <div class="constellation-band-head">
          <div>
            <p class="eyebrow">Province Constellation</p>
            <h3>Click a province card to focus the drill-in</h3>
          </div>
          <div class="constellation-controls">
            <label class="province-search-field">
              <Search :size="15" />
              <input v-model="query" type="search" placeholder="Search provinces" />
            </label>
            <label class="control-field">
              <span>Group</span>
              <select v-model="groupFilter">
                <option value="all">All groups</option>
                <option v-for="g in allGroups" :key="g" :value="g">{{ g }}</option>
              </select>
            </label>
            <label class="control-field">
              <span>Sort</span>
              <select v-model="sortMode">
                <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
          </div>
        </div>

        <div class="constellation-grid">
          <EntityConstellationCard
            v-for="row in visibleRows"
            :key="row.index"
            :name="row.name"
            :badge="row.group"
            headline-label="Pop"
            :headline-value="formatCompactNumber(row.provincialPopulation)"
            :tracks="trackBuilder(row)"
            :footer="`${dominantReligionFor(row)} · ${row.originalCountry}`"
            :focused="focusedIndex === row.index"
            :lead="leadIndex === row.index"
            @select="focusedIndex = row.index"
          />
          <div v-if="!visibleRows.length" class="empty-inline">No provinces match the current filters.</div>
        </div>

        <div class="province-toggle-list" role="list" aria-label="All provinces">
          <label
            v-for="row in rows"
            :key="`toggle-${row.index}`"
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

        <div class="chart-shell">
          <ProvinceChart :option="chartOption" :aria-label="currentMode.label" />
        </div>
      </section>

      <section v-if="focusedRow" class="focus-band">
        <header class="focus-head">
          <div>
            <p class="eyebrow">Province Focus</p>
            <h2>{{ focusedRow.name }}</h2>
            <p class="focus-deck">{{ focusedRow.group }} · {{ focusedRow.originalCountry }}</p>
          </div>
          <StatusBadgeRow :status="focusedRow.status" />
        </header>

        <div class="focus-grid">
          <article class="focus-card focus-card--gauges">
            <CivicGaugeStrip
              eyebrow="Civic Health"
              :loyalty="focusedRow.loyalty"
              :happiness="focusedRow.happinessPercentage"
              :growth="focusedRow.growthPercentage"
              :housing="focusedRow.housing"
              :net-amenities="focusedRow.netAmenities"
              :net-food="focusedRow.netFood"
            />
          </article>

          <article class="focus-card focus-card--radar">
            <YieldRadar
              eyebrow="Yield Profile"
              :yields="focusedRow.yields"
              :benchmark="averageProvinceYields"
              benchmark-label="National avg"
              :primary-label="focusedRow.name"
            />
          </article>

          <article class="focus-card focus-card--mosaic">
            <ReligionMosaic eyebrow="Religion Mosaic" :religions="focusedRow.religions" />
          </article>

          <article class="focus-card focus-card--orbit">
            <ConnectivityOrbit
              eyebrow="Connectivity Orbit"
              :center-name="focusedRow.name"
              :closest-provinces="focusedRow.closestProvinces"
            />
          </article>

          <article class="focus-card focus-card--census">
            <CountyCensusGrid
              eyebrow="County Census"
              :county-count="focusedRow.countyCount"
              :county-detail-count="focusedRow.countyDetailCount"
              :citizens-working="focusedRow.citizensWorking"
              :average-appeal="focusedRow.averageAppeal"
              :river-count="focusedRow.riverCount"
              :railroad-count="focusedRow.railroadCount"
              :terrain-counts="focusedRow.terrainCounts"
              :feature-counts="focusedRow.featureCounts"
              :improvement-counts="focusedRow.improvementCounts"
              :building-counts="focusedRow.buildingCounts"
              :resource-counts="focusedRow.resourceCounts"
            />
          </article>

          <article class="focus-card focus-card--terrain">
            <CountyTerrainHeatmap
              eyebrow="Terrain × Improvements"
              :terrain-counts="focusedRow.terrainCounts"
              :improvement-counts="focusedRow.improvementCounts"
            />
          </article>

          <article class="focus-card focus-card--rep">
            <p class="eyebrow">Representation & Scoring</p>
            <div class="rep-grid">
              <div class="rep-cell"><span>Population</span><strong>{{ formatNumber(focusedRow.population) }}</strong></div>
              <div class="rep-cell"><span>Provincial Pop</span><strong>{{ formatCompactNumber(focusedRow.provincialPopulation) }}</strong></div>
              <div class="rep-cell"><span>Assembly</span><strong>{{ formatNumber(focusedRow.assemblypeople) }}</strong></div>
              <div class="rep-cell"><span>Council</span><strong>{{ formatNumber(focusedRow.prelates) }}</strong></div>
              <div class="rep-cell"><span>Total Yield</span><strong>{{ formatNumber(focusedRow.totalYield) }}</strong></div>
              <div class="rep-cell"><span>Civic Health</span><strong>{{ formatNumber(civicHealthScore(focusedRow)) }}%</strong></div>
              <div class="rep-cell"><span>Civic Risk</span><strong>{{ formatNumber(civicRiskScore(focusedRow)) }}%</strong></div>
              <div class="rep-cell"><span>County Readiness</span><strong>{{ formatNumber(countyReadinessScore(focusedRow)) }}%</strong></div>
            </div>
          </article>
        </div>
      </section>
    </template>
  </section>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { ChartNoAxesColumnIncreasing, FilePlus2, Search } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import CivicGaugeStrip from '../components/insights/CivicGaugeStrip.vue'
import YieldRadar from '../components/insights/YieldRadar.vue'
import ReligionMosaic from '../components/insights/ReligionMosaic.vue'
import ConnectivityOrbit from '../components/insights/ConnectivityOrbit.vue'
import CountyCensusGrid from '../components/insights/CountyCensusGrid.vue'
import CountyTerrainHeatmap from '../components/insights/CountyTerrainHeatmap.vue'
import EntityConstellationCard from '../components/insights/EntityConstellationCard.vue'
import StatusBadgeRow from '../components/insights/StatusBadgeRow.vue'
import { useFormStore } from '../stores/formStore'
import { useCivilizationStore } from '../stores/civilizationStore'
import {
  PROVINCE_YIELD_KEYS,
  PROVINCE_VISUALIZATION_MODES,
  buildProvinceVisualizationOption,
  civicHealthScore,
  civicRiskScore,
  countyReadinessScore,
  formatCompactNumber,
  formatNumber,
  gaugeTone,
} from '../domain/provinceVisualizations'

const SORT_OPTIONS = [
  { value: 'provincial-population', label: 'Provincial Pop' },
  { value: 'risk', label: 'Civic Risk' },
  { value: 'readiness', label: 'County Readiness' },
  { value: 'connectivity', label: 'Frontier Distance' },
  { value: 'total-yield', label: 'Total Yield' },
  { value: 'growth', label: 'Growth' },
  { value: 'happiness', label: 'Happiness' },
  { value: 'loyalty', label: 'Loyalty' },
  { value: 'name', label: 'Name' },
]

function dominantReligionFor(row) {
  const list = row.religions || []
  if (!list.length) return 'No faith data'
  const top = [...list].sort((a, b) => b.followers - a.followers)[0]
  return top?.name || 'No faith data'
}

export default {
  name: 'ProvinceDetails',
  components: {
    ChartNoAxesColumnIncreasing, FilePlus2, Search,
    ProvinceChart,
    CivicGaugeStrip, YieldRadar, ReligionMosaic, ConnectivityOrbit,
    CountyCensusGrid, CountyTerrainHeatmap, EntityConstellationCard, StatusBadgeRow,
  },
  setup() {
    const store = useFormStore()
    const civStore = useCivilizationStore()
    const selectedMode = ref(PROVINCE_VISUALIZATION_MODES[0].id)
    const selectedIndices = ref([])
    const focusedIndex = ref(null)
    const query = ref('')
    const groupFilter = ref('all')
    const sortMode = ref('provincial-population')

    const rows = computed(() => civStore.provinceRows)
    const hasData = computed(() => rows.value.length > 0)
    const modes = PROVINCE_VISUALIZATION_MODES
    const currentMode = computed(() => modes.find((m) => m.id === selectedMode.value) || modes[0])
    const allGroups = computed(() => [...new Set(rows.value.map((r) => r.group))].sort((a, b) => a.localeCompare(b)))

    const modeGroups = computed(() =>
      modes.reduce((groups, mode) => {
        let g = groups.find((x) => x.category === mode.category)
        if (!g) { g = { category: mode.category, modes: [] }; groups.push(g) }
        g.modes.push(mode)
        return groups
      }, [])
    )

    function sortRows(input) {
      const sorted = [...input]
      const byName = (a, b) => a.name.localeCompare(b.name)
      switch (sortMode.value) {
        case 'risk': return sorted.sort((a, b) => civicRiskScore(b) - civicRiskScore(a) || byName(a, b))
        case 'readiness': return sorted.sort((a, b) => countyReadinessScore(b) - countyReadinessScore(a) || byName(a, b))
        case 'connectivity': return sorted.sort((a, b) => b.averageClosestProvinceDistance - a.averageClosestProvinceDistance || byName(a, b))
        case 'total-yield': return sorted.sort((a, b) => b.totalYield - a.totalYield || byName(a, b))
        case 'growth': return sorted.sort((a, b) => b.growthPercentage - a.growthPercentage || byName(a, b))
        case 'happiness': return sorted.sort((a, b) => b.happinessPercentage - a.happinessPercentage || byName(a, b))
        case 'loyalty': return sorted.sort((a, b) => b.loyalty - a.loyalty || byName(a, b))
        case 'name': return sorted.sort(byName)
        default: return sorted.sort((a, b) => b.provincialPopulation - a.provincialPopulation || byName(a, b))
      }
    }

    const visibleRows = computed(() => {
      const q = query.value.trim().toLowerCase()
      return sortRows(
        rows.value.filter((row) => {
          const matchesQuery = !q || row.name.toLowerCase().includes(q) || row.group.toLowerCase().includes(q)
          const matchesGroup = groupFilter.value === 'all' || row.group === groupFilter.value
          return matchesQuery && matchesGroup
        })
      )
    })

    const selectedRows = computed(() => {
      const set = new Set(selectedIndices.value)
      return rows.value.filter((r) => set.has(r.index))
    })
    const chartRows = computed(() => sortRows(selectedRows.value.length ? selectedRows.value : rows.value))
    const chartOption = computed(() => buildProvinceVisualizationOption(selectedMode.value, chartRows.value))

    const totalProvincialPopulation = computed(() => rows.value.reduce((s, r) => s + r.provincialPopulation, 0))
    const selectedProvincialPopulation = computed(() => selectedRows.value.reduce((s, r) => s + r.provincialPopulation, 0))

    const leadIndex = computed(() => [...rows.value].sort((a, b) => b.provincialPopulation - a.provincialPopulation)[0]?.index ?? null)

    const summaryCards = computed(() => {
      const totalAssembly = rows.value.reduce((s, r) => s + r.assemblypeople, 0)
      const totalPrelates = rows.value.reduce((s, r) => s + r.prelates, 0)
      const yieldKey = PROVINCE_YIELD_KEYS
        .map((k) => ({ k, total: rows.value.reduce((s, r) => s + r.yields[k], 0) }))
        .sort((a, b) => b.total - a.total)[0]
      const avgRisk = rows.value.length ? rows.value.reduce((s, r) => s + civicRiskScore(r), 0) / rows.value.length : 0
      const avgReadiness = rows.value.length ? rows.value.reduce((s, r) => s + countyReadinessScore(r), 0) / rows.value.length : 0
      const totalCounty = rows.value.reduce((s, r) => s + r.countyCount, 0)
      const detailedCounty = rows.value.reduce((s, r) => s + r.countyDetailCount, 0)
      return [
        { label: 'Provinces', value: formatNumber(rows.value.length), detail: `${allGroups.value.length} groups` },
        { label: 'Provincial Pop', value: formatCompactNumber(totalProvincialPopulation.value), detail: `${formatNumber(totalAssembly)} A · ${formatNumber(totalPrelates)} P` },
        { label: 'Top Yield', value: yieldKey?.k || 'None', detail: `${formatNumber(yieldKey?.total || 0)} total` },
        { label: 'Avg Civic Risk', value: `${formatNumber(avgRisk)}%`, detail: avgRisk >= 55 ? 'Watch list elevated' : 'Within range' },
        { label: 'Avg Readiness', value: `${formatNumber(avgReadiness)}%`, detail: `${detailedCounty}/${totalCounty} counties` },
        { label: 'Selected', value: `${selectedRows.value.length} of ${rows.value.length}`, detail: `${formatCompactNumber(selectedProvincialPopulation.value)} pop` },
      ]
    })

    function trackBuilder(row) {
      const maxPop = Math.max(1, ...rows.value.map((r) => r.provincialPopulation))
      const health = civicHealthScore(row)
      const readiness = countyReadinessScore(row)
      return [
        { label: 'Pop', value: formatCompactNumber(row.provincialPopulation), share: (row.provincialPopulation / maxPop) * 100, tone: 'neutral' },
        { label: 'Health', value: `${formatNumber(health)}%`, share: health, tone: gaugeTone(health) },
        { label: 'Ready', value: `${formatNumber(readiness)}%`, share: readiness, tone: gaugeTone(readiness) },
      ]
    }

    const averageProvinceYields = computed(() => {
      const totals = PROVINCE_YIELD_KEYS.reduce((m, k) => { m[k] = 0; return m }, {})
      rows.value.forEach((r) => PROVINCE_YIELD_KEYS.forEach((k) => { totals[k] += r.yields[k] }))
      const denom = Math.max(1, rows.value.length)
      PROVINCE_YIELD_KEYS.forEach((k) => { totals[k] /= denom })
      return totals
    })

    const focusedRow = computed(() => rows.value.find((r) => r.index === focusedIndex.value) || rows.value[0] || null)

    watch(rows, (next) => {
      const valid = new Set(next.map((r) => r.index))
      if (focusedIndex.value === null || !valid.has(focusedIndex.value)) {
        focusedIndex.value = next[0]?.index ?? null
      }
      selectedIndices.value = selectedIndices.value.filter((i) => valid.has(i))
      if (!selectedIndices.value.length) {
        selectedIndices.value = next.map((r) => r.index)
      }
    }, { immediate: true })

    return {
      modes, modeGroups, currentMode, selectedMode,
      rows, visibleRows, chartRows, chartOption, allGroups,
      hasData, query, groupFilter, sortMode, sortOptions: SORT_OPTIONS,
      selectedIndices, focusedIndex, focusedRow,
      averageProvinceYields,
      summaryCards, totalProvincialPopulation, selectedProvincialPopulation,
      leadIndex,
      trackBuilder, dominantReligionFor,
      civicHealthScore, civicRiskScore, countyReadinessScore,
      formatCompactNumber, formatNumber,
      store, civStore,
    }
  },
}
</script>

<style scoped>
.province-details-page { display: flex; flex-direction: column; gap: 14px; }
.empty-workspace { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 20px; }
.eyebrow { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted, #a9a39a); margin: 0; }
.province-details-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; }
.province-title-block h2 { margin: 4px 0; font-size: 1.45rem; font-family: 'Cinzel', serif; }
.province-deck { font-size: 0.75rem; color: var(--text-muted, #a9a39a); margin: 0 0 6px; }
.province-context-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.province-context-chips span { font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); color: var(--text-muted, #a9a39a); }
.visualization-select { display: flex; flex-direction: column; gap: 4px; }
.visualization-select span { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #a9a39a); font-weight: 700; }
.visualization-select select { padding: 6px 10px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 6px; color: inherit; }
.province-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
.province-summary-card { display: flex; flex-direction: column; padding: 10px 12px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 8px; }
.province-summary-card span { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #a9a39a); font-weight: 700; }
.province-summary-card strong { font-size: 1.05rem; }
.province-summary-card small { font-size: 0.65rem; color: var(--text-muted, #a9a39a); }
.constellation-band, .focus-band { display: flex; flex-direction: column; gap: 12px; padding: 14px 16px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 10px; }
.constellation-band-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.constellation-band-head h3 { font-size: 0.95rem; margin: 4px 0 0; font-weight: 700; }
.constellation-controls { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
.province-search-field { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 6px; }
.province-search-field input { background: transparent; border: 0; color: inherit; outline: none; }
.control-field { display: flex; flex-direction: column; gap: 4px; }
.control-field span { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #a9a39a); font-weight: 700; }
.control-field select { padding: 6px 10px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 6px; color: inherit; }
.constellation-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.empty-inline { font-size: 0.78rem; color: var(--text-muted, #a9a39a); padding: 8px; }
.province-toggle-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 4px; max-height: 200px; overflow-y: auto; padding: 4px; background: rgba(255,255,255,0.01); border-radius: 6px; }
.province-toggle { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 6px; cursor: pointer; }
.province-toggle--selected { background: linear-gradient(135deg, rgba(212,168,67,0.12), transparent); border-color: rgba(212,168,67,0.45); }
.province-toggle input { accent-color: var(--accent, #d4a843); }
.province-toggle-main { display: flex; flex-direction: column; flex: 1; }
.province-toggle-main strong { font-size: 0.82rem; }
.province-toggle-main small { font-size: 0.65rem; color: var(--text-muted, #a9a39a); }
.province-toggle-stats { display: flex; flex-direction: column; align-items: flex-end; }
.province-toggle-stats small { font-size: 0.65rem; color: var(--text-muted, #a9a39a); }
.mode-board { display: flex; flex-wrap: wrap; gap: 12px; }
.mode-cluster { display: flex; flex-direction: column; gap: 4px; }
.mode-cluster span { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #a9a39a); font-weight: 700; }
.mode-chip-list { display: flex; flex-wrap: wrap; gap: 4px; }
.mode-chip { padding: 4px 10px; font-size: 0.72rem; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 999px; color: inherit; cursor: pointer; }
.mode-chip--active { background: rgba(212,168,67,0.18); border-color: rgba(212,168,67,0.45); color: var(--accent, #d4a843); font-weight: 700; }
.chart-panel-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.chart-panel-header h3 { margin: 4px 0 0; font-size: 1rem; }
.chart-panel-meta { display: flex; gap: 8px; }
.chart-panel-meta span { font-size: 0.7rem; color: var(--text-muted, #a9a39a); }
.chart-shell { min-height: 320px; }
.focus-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.focus-head h2 { margin: 4px 0; font-size: 1.4rem; font-family: 'Cinzel', serif; }
.focus-deck { font-size: 0.75rem; color: var(--text-muted, #a9a39a); margin: 0; }
.focus-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; }
.focus-card { padding: 10px 12px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 8px; display: flex; flex-direction: column; gap: 8px; }
.focus-card--radar, .focus-card--terrain { grid-column: span 2; }
@media (max-width: 720px) { .focus-card--radar, .focus-card--terrain { grid-column: span 1; } }
.rep-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 6px; }
.rep-cell { display: flex; flex-direction: column; padding: 6px 8px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 6px; }
.rep-cell span { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #a9a39a); font-weight: 700; }
.rep-cell strong { font-size: 1rem; }
</style>

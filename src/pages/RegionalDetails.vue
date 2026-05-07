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
          <p class="province-deck">{{ chartRows.length }} regions · {{ currentMode.label }}</p>
          <div class="province-context-chips">
            <span>{{ rows.length }} regions</span>
            <span>{{ totalProvinces }} provinces</span>
            <span>{{ formatCompactNumber(totalProvincialPopulation) }} people</span>
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

      <section class="province-summary-grid" aria-label="Regional summary">
        <article v-for="card in summaryCards" :key="card.label" class="province-summary-card">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <small>{{ card.detail }}</small>
        </article>
      </section>

      <section class="constellation-band">
        <div class="constellation-band-head">
          <div>
            <p class="eyebrow">Region Constellation</p>
            <h3>Click a region to focus the drill-in</h3>
          </div>
          <div class="constellation-controls">
            <label class="province-search-field">
              <Search :size="15" />
              <input v-model="query" type="search" placeholder="Search regions" />
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
            :key="row.name"
            :name="row.name"
            :badge="`${row.provinceCount} prov`"
            headline-label="Pop"
            :headline-value="formatCompactNumber(row.provincialPopulation)"
            :tracks="trackBuilder(row)"
            :footer="`${row.dominantOrigin} · ${dominantReligionFor(row)}`"
            :focused="focusedName === row.name"
            :lead="leadName === row.name"
            @select="focusedName = row.name"
          />
          <div v-if="!visibleRows.length" class="empty-inline">No regions match the current filters.</div>
        </div>

        <div class="province-toggle-list" role="list" aria-label="All regions">
          <label
            v-for="row in rows"
            :key="`toggle-${row.name}`"
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

        <div class="chart-panel-header">
          <div>
            <p class="eyebrow">{{ currentMode.category }}</p>
            <h3>{{ currentMode.label }}</h3>
          </div>
          <div class="chart-panel-meta">
            <span>{{ chartRows.length }} regions</span>
            <span>Selected: {{ selectedNames.length }}</span>
          </div>
        </div>

        <div class="chart-shell">
          <ProvinceChart :option="chartOption" :aria-label="currentMode.label" />
        </div>
      </section>

      <section v-if="focusedRow" class="focus-band">
        <header class="focus-head">
          <div>
            <p class="eyebrow">Region Focus</p>
            <h2>{{ focusedRow.name }}</h2>
            <p class="focus-deck">{{ focusedRow.provinceCount }} provinces · {{ focusedRow.dominantOrigin }} bloc</p>
          </div>
          <StatusBadgeRow :badges="focusBadges" />
        </header>

        <div class="focus-grid">
          <article class="focus-card focus-card--gauges">
            <CivicGaugeStrip
              eyebrow="Civic Health (avg of provinces)"
              :loyalty="focusedRow.averageLoyalty"
              :happiness="focusedRow.averageHappiness"
              :growth="focusedRow.averageGrowth"
              :housing="focusedRow.averageHousing"
              :net-amenities="focusedRow.averageNetAmenities"
              :net-food="focusedRow.averageNetFood"
            />
          </article>

          <article class="focus-card focus-card--radar">
            <YieldRadar
              eyebrow="Yield Profile"
              :yields="focusedRow.yields"
              :benchmark="averageRegionYields"
              benchmark-label="National avg"
              :primary-label="focusedRow.name"
            />
          </article>

          <article class="focus-card focus-card--mosaic">
            <ReligionMosaic eyebrow="Religion Mosaic" :religions="focusedRow.religions" />
          </article>

          <article class="focus-card focus-card--origin">
            <OriginBlocBars eyebrow="Origin Blocs" :blocs="focusedOriginBlocs" />
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
            <p class="eyebrow">Representation</p>
            <div class="rep-grid">
              <div class="rep-cell"><span>Assembly</span><strong>{{ formatNumber(focusedRow.assemblypeople) }}</strong></div>
              <div class="rep-cell"><span>Council</span><strong>{{ formatNumber(focusedRow.prelates) }}</strong></div>
              <div class="rep-cell"><span>Provincial Pop</span><strong>{{ formatCompactNumber(focusedRow.provincialPopulation) }}</strong></div>
              <div class="rep-cell"><span>Total Yield</span><strong>{{ formatNumber(focusedRow.totalYield) }}</strong></div>
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
import { FilePlus2, Network, Search } from 'lucide-vue-next'
import ProvinceChart from '../components/ProvinceChart.vue'
import CivicGaugeStrip from '../components/insights/CivicGaugeStrip.vue'
import YieldRadar from '../components/insights/YieldRadar.vue'
import ReligionMosaic from '../components/insights/ReligionMosaic.vue'
import OriginBlocBars from '../components/insights/OriginBlocBars.vue'
import CountyCensusGrid from '../components/insights/CountyCensusGrid.vue'
import CountyTerrainHeatmap from '../components/insights/CountyTerrainHeatmap.vue'
import EntityConstellationCard from '../components/insights/EntityConstellationCard.vue'
import StatusBadgeRow from '../components/insights/StatusBadgeRow.vue'
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
  gaugeTone,
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

function dominantReligionFor(row) {
  const entries = Object.entries(row.religions || {})
  if (!entries.length) return 'No faith data'
  return entries.sort((a, b) => b[1] - a[1])[0][0]
}

export default {
  name: 'RegionalDetails',
  components: {
    FilePlus2, Network, Search,
    ProvinceChart,
    CivicGaugeStrip, YieldRadar, ReligionMosaic, OriginBlocBars,
    CountyCensusGrid, CountyTerrainHeatmap, EntityConstellationCard, StatusBadgeRow,
  },
  setup() {
    const store = useFormStore()
    const selectedMode = ref(REGIONAL_VISUALIZATION_MODES[0].id)
    const selectedNames = ref([])
    const focusedName = ref(null)
    const query = ref('')
    const sortMode = ref('provincial-population')

    const rows = computed(() => buildRegionalComparisonRows(store.currentData, store.provinceCalcs))
    const hasData = computed(() => rows.value.length > 0)
    const modes = REGIONAL_VISUALIZATION_MODES
    const currentMode = computed(() => modes.find((m) => m.id === selectedMode.value) || modes[0])

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
        case 'province-count': return sorted.sort((a, b) => b.provinceCount - a.provinceCount || byName(a, b))
        case 'name': return sorted.sort(byName)
        default: return sorted.sort((a, b) => b.provincialPopulation - a.provincialPopulation || byName(a, b))
      }
    }

    const visibleRows = computed(() => {
      const q = query.value.trim().toLowerCase()
      return sortRows(rows.value.filter((row) =>
        !q || row.name.toLowerCase().includes(q) || row.dominantOrigin.toLowerCase().includes(q)
      ))
    })

    const selectedRows = computed(() => {
      const set = new Set(selectedNames.value)
      return rows.value.filter((r) => set.has(r.name))
    })
    const chartRows = computed(() => sortRows(selectedRows.value.length ? selectedRows.value : rows.value))
    const chartOption = computed(() => buildRegionalVisualizationOption(selectedMode.value, chartRows.value))

    const totalProvinces = computed(() => rows.value.reduce((s, r) => s + r.provinceCount, 0))
    const totalProvincialPopulation = computed(() => rows.value.reduce((s, r) => s + r.provincialPopulation, 0))

    const leadName = computed(() => [...rows.value].sort((a, b) => b.provincialPopulation - a.provincialPopulation)[0]?.name || null)

    const summaryCards = computed(() => {
      const totalAssembly = rows.value.reduce((s, r) => s + r.assemblypeople, 0)
      const totalPrelates = rows.value.reduce((s, r) => s + r.prelates, 0)
      const totalCounty = rows.value.reduce((s, r) => s + r.countyCount, 0)
      const detailedCounty = rows.value.reduce((s, r) => s + r.countyDetailCount, 0)
      const yieldKey = PROVINCE_YIELD_KEYS
        .map((k) => ({ k, total: rows.value.reduce((s, r) => s + r.yields[k], 0) }))
        .sort((a, b) => b.total - a.total)[0]
      const avgRisk = rows.value.length ? rows.value.reduce((s, r) => s + civicRiskScore(r), 0) / rows.value.length : 0
      return [
        { label: 'Provinces', value: formatNumber(totalProvinces.value), detail: `${rows.value.length} regions` },
        { label: 'Provincial Pop', value: formatCompactNumber(totalProvincialPopulation.value), detail: `${leadName.value || '—'} leads` },
        { label: 'Top Yield', value: yieldKey?.k || 'None', detail: `${formatNumber(yieldKey?.total || 0)} total` },
        { label: 'Avg Civic Risk', value: `${formatNumber(avgRisk)}%`, detail: avgRisk >= 55 ? 'Watch list elevated' : 'Within normal range' },
        { label: 'Representation', value: `${formatNumber(totalAssembly)} A / ${formatNumber(totalPrelates)} P`, detail: 'assembly · council' },
        { label: 'Counties', value: `${detailedCounty} / ${totalCounty}`, detail: 'detail records' },
      ]
    })

    function trackBuilder(row) {
      const maxPop = Math.max(1, ...rows.value.map((r) => r.provincialPopulation))
      const risk = civicRiskScore(row)
      const readiness = countyReadinessScore(row)
      return [
        { label: 'Pop', value: formatCompactNumber(row.provincialPopulation), share: (row.provincialPopulation / maxPop) * 100, tone: 'neutral' },
        { label: 'Risk', value: `${formatNumber(risk)}%`, share: risk, tone: gaugeTone(100 - risk) },
        { label: 'Ready', value: `${formatNumber(readiness)}%`, share: readiness, tone: gaugeTone(readiness) },
      ]
    }

    const averageRegionYields = computed(() => {
      const totals = PROVINCE_YIELD_KEYS.reduce((m, k) => { m[k] = 0; return m }, {})
      rows.value.forEach((r) => PROVINCE_YIELD_KEYS.forEach((k) => { totals[k] += r.yields[k] }))
      const denom = Math.max(1, rows.value.length)
      PROVINCE_YIELD_KEYS.forEach((k) => { totals[k] /= denom })
      return totals
    })

    const focusedRow = computed(() => rows.value.find((r) => r.name === focusedName.value) || rows.value[0] || null)

    const focusBadges = computed(() => {
      if (!focusedRow.value) return []
      const r = focusedRow.value
      const list = []
      if (r.provinceCount) list.push({ label: `${r.provinceCount} provinces`, tone: 'gold' })
      if (r.dominantOrigin) list.push({ label: r.dominantOrigin, tone: 'teal' })
      const lead = dominantReligionFor(r)
      if (lead && lead !== 'No faith data') list.push({ label: lead, tone: 'blue' })
      return list.length ? list : [{ label: 'Region', tone: 'muted' }]
    })

    const focusedOriginBlocs = computed(() => {
      if (!focusedRow.value) return []
      const map = focusedRow.value.originalCountries || {}
      const totalProvCount = focusedRow.value.provinceCount || 1
      return Object.entries(map).map(([name, count]) => ({
        name,
        provinces: count,
        population: focusedRow.value.provincialPopulation * (count / totalProvCount),
      }))
    })

    watch(rows, (next) => {
      const valid = new Set(next.map((r) => r.name))
      if (!focusedName.value || !valid.has(focusedName.value)) {
        focusedName.value = next[0]?.name || null
      }
      selectedNames.value = selectedNames.value.filter((n) => valid.has(n))
    }, { immediate: true })

    return {
      modes, modeGroups, currentMode, selectedMode,
      rows, visibleRows, chartRows, chartOption,
      hasData, query, sortMode, sortOptions: SORT_OPTIONS,
      selectedNames, focusedName, focusedRow, focusBadges, focusedOriginBlocs,
      averageRegionYields,
      summaryCards, totalProvinces, totalProvincialPopulation,
      leadName,
      trackBuilder, dominantReligionFor,
      civicRiskScore, countyReadinessScore,
      formatCompactNumber, formatNumber,
      store,
    }
  },
}
</script>

<style scoped>
.regional-details-page { display: flex; flex-direction: column; gap: 14px; }
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

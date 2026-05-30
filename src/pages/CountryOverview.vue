<template>
  <div class="overview-screen">
    <!-- Heading -->
    <div class="view-head">
      <div>
        <div class="eyebrow eyebrow--gold">Atlas · Country Overview</div>
        <h1>{{ countryName }}</h1>
        <p>
          {{ formatCompactNumber(totalProvincialPopulation) }} citizens ·
          {{ provinceCount }} provinces · {{ groupCount }} regions ·
          {{ countyDetailCount }}/{{ countyCount }} county records
        </p>
      </div>
      <div class="view-head__actions">
        <div class="seg" role="tablist" aria-label="Region scope">
          <button
            v-for="opt in scopeOptions"
            :key="opt.value"
            type="button"
            role="tab"
            class="seg__btn"
            :class="{ 'seg__btn--active': scope === opt.value }"
            :aria-selected="scope === opt.value"
            @click="scope = opt.value"
          >{{ opt.label }}</button>
        </div>
      </div>
    </div>

    <!-- KPI strip -->
    <div class="grid grid--6 ov-kpis">
      <div class="kpi kpi--accent">
        <div class="kpi__label label">Population</div>
        <div class="kpi__value num">{{ formatCompactNumber(totalProvincialPopulation) }}</div>
        <div class="kpi__foot"><span class="kpi__sub">provincial · {{ formatNumber(totalRawPopulation) }} raw</span></div>
      </div>
      <div class="kpi">
        <div class="kpi__label label">Economy / Turn</div>
        <div class="kpi__value num">{{ formatCompactNumber(totalEconomyOutput) }}</div>
        <div class="kpi__foot"><span class="kpi__sub">gold · faith · culture · science</span></div>
      </div>
      <div class="kpi">
        <div class="kpi__label label">Civic Health</div>
        <div class="kpi__value num">{{ formatNumber(civicHealthAverage) }}<em class="kpi__unit">%</em></div>
        <div class="kpi__foot"><span class="kpi__sub">composite average</span></div>
      </div>
      <div class="kpi">
        <div class="kpi__label label">County Records</div>
        <div class="kpi__value num">{{ countyDetailCount }}</div>
        <div class="kpi__foot"><span class="kpi__sub">of {{ countyCount }} counties</span></div>
      </div>
      <div class="kpi">
        <div class="kpi__label label">Regions</div>
        <div class="kpi__value num">{{ groupCount }}</div>
        <div class="kpi__foot"><span class="kpi__sub">largest · {{ topRegion?.name || 'None' }}</span></div>
      </div>
      <div class="kpi">
        <div class="kpi__label label">Religions</div>
        <div class="kpi__value num">{{ religionCount }}</div>
        <div class="kpi__foot"><span class="kpi__sub">state · {{ stateReligion }}</span></div>
      </div>
    </div>

    <!-- Yield profile + Civic health -->
    <div class="grid ov-yield-row">
      <section class="panel">
        <header class="panel__head">
          <div class="panel__head-l">
            <span class="panel__icon"><Zap :size="15" /></span>
            <div>
              <div class="eyebrow">Output</div>
              <h3 class="panel__title">National Yield Profile</h3>
            </div>
          </div>
          <div class="panel__head-r"><span class="chip chip--gold">{{ formatCompactNumber(grandYield) }} / turn</span></div>
        </header>
        <div class="ov-yield-body">
          <div class="yield-tiles ov-yield-tiles">
            <div v-for="(row, i) in yieldRows" :key="row.key" class="ytile" :class="{ 'ytile--lead': i === 0 }">
              <div class="ytile__label"><span class="ytile__dot" :style="{ background: row.color }" />{{ row.key }}</div>
              <div class="ytile__val">{{ formatNumber(row.value) }}</div>
              <div class="ytile__share">{{ row.share.toFixed(1) }}% share</div>
              <div class="meter" style="height:4px;background:var(--inset)"><i :style="{ width: row.bar + '%', background: row.color }" /></div>
            </div>
          </div>
          <ProvinceChart :option="radarChartOption" class="ov-chart" aria-label="National yield radar" />
        </div>
      </section>

      <section class="panel">
        <header class="panel__head">
          <div class="panel__head-l">
            <span class="panel__icon"><Activity :size="15" /></span>
            <div>
              <div class="eyebrow">Vital signs</div>
              <h3 class="panel__title">Civic Health</h3>
            </div>
          </div>
          <div class="panel__head-r"><span class="chip chip--up">stable</span></div>
        </header>
        <div class="grid grid--3 ov-gauges">
          <div v-for="g in civicGauges" :key="g.label" class="mini-gauge">
            <div class="mini-gauge__ring" :style="{ '--p': g.pct + '%', '--c': g.color }">
              <span class="num">{{ g.display }}<em>{{ g.unit }}</em></span>
            </div>
            <span class="label">{{ g.label }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- Composition -->
    <div class="grid grid--3 ov-comp">
      <section class="panel">
        <header class="panel__head">
          <div class="panel__head-l">
            <span class="panel__icon"><Layers :size="15" /></span>
            <div><div class="eyebrow">Faith</div><h3 class="panel__title">Religion Mosaic</h3></div>
          </div>
        </header>
        <div v-if="religionMosaic.length" class="mosaic">
          <div
            v-for="seg in religionMosaic"
            :key="seg.name"
            class="mosaic__seg"
            :style="{ flex: seg.value, background: seg.color }"
            :title="`${seg.name}: ${formatNumber(seg.value)}`"
          />
        </div>
        <p v-else class="ov-empty">No religion data yet.</p>
        <div class="mosaic-legend">
          <span v-for="seg in religionMosaic" :key="seg.name" class="mosaic-legend__item">
            <span class="mosaic-legend__sw" :style="{ background: seg.color }" />
            {{ seg.name }} <b>{{ seg.pct }}%</b>
          </span>
        </div>
      </section>

      <section class="panel">
        <header class="panel__head">
          <div class="panel__head-l">
            <span class="panel__icon"><Users :size="15" /></span>
            <div><div class="eyebrow">Heritage</div><h3 class="panel__title">Origin Blocs</h3></div>
          </div>
        </header>
        <div class="ov-blocs">
          <div v-for="(b, i) in originBlocRows" :key="b.name" class="bloc-row">
            <span>{{ b.name }}</span>
            <div class="meter" style="height:8px;background:var(--inset)"><i :style="{ width: b.bar + '%', background: b.color }" /></div>
            <b>{{ b.provinces }}</b>
          </div>
          <p v-if="!originBlocRows.length" class="ov-empty">No origin data yet.</p>
        </div>
      </section>

      <section class="panel">
        <header class="panel__head">
          <div class="panel__head-l">
            <span class="panel__icon"><Flag :size="15" /></span>
            <div><div class="eyebrow">Census</div><h3 class="panel__title">Status Breakdown</h3></div>
          </div>
        </header>
        <div class="census-grid">
          <div v-for="s in statusCensusEntries" :key="s.label" class="census-cell">
            <span>{{ s.label }}</span>
            <b>{{ s.value }}</b>
            <small>of {{ provinceCount }}</small>
          </div>
        </div>
      </section>
    </div>

    <!-- Scatter -->
    <section class="panel ov-block">
      <header class="panel__head">
        <div class="panel__head-l">
          <span class="panel__icon"><Target :size="15" /></span>
          <div><div class="eyebrow">Distribution</div><h3 class="panel__title">Province Population × Civic Health</h3></div>
        </div>
        <div class="panel__head-r ov-legend">
          <span v-for="r in regionLegend" :key="r.name" class="mosaic-legend__item">
            <span class="mosaic-legend__sw" :style="{ background: r.color, borderRadius: '50%' }" />{{ r.short }}
          </span>
        </div>
      </header>
      <div class="chart-bed"><ProvinceChart :option="scatterChartOption" class="ov-scatter" aria-label="Province population vs civic health" /></div>
    </section>

    <!-- Regions -->
    <section class="panel ov-block">
      <header class="panel__head">
        <div class="panel__head-l">
          <span class="panel__icon"><Map :size="15" /></span>
          <div><div class="eyebrow">Geography</div><h3 class="panel__title">Regions</h3></div>
        </div>
        <div class="panel__head-r"><span class="label">{{ regionCards.length }} groups</span></div>
      </header>
      <div class="const-grid">
        <button v-for="r in regionCards" :key="r.name" class="const-card" :class="{ 'const-card--lead': r.lead }" @click="goToRegion(r.name)">
          <div class="const-card__head">
            <div class="const-card__name"><span class="sdot" :style="{ background: r.color }" />{{ r.name }}</div>
            <span class="const-card__badge">{{ r.provinceCount }} prov</span>
          </div>
          <div class="const-card__head-val"><b class="num">{{ r.pop }}</b><span>population</span></div>
          <div v-for="t in r.tracks" :key="t.label" class="const-track">
            <span class="const-track__label">{{ t.label }}</span>
            <div class="meter" style="height:5px;background:var(--inset)"><i :style="{ width: t.bar + '%', background: t.color }" /></div>
            <span class="const-track__val">{{ t.val }}</span>
          </div>
          <div class="const-card__foot"><Zap :size="11" />{{ r.foot }}</div>
        </button>
      </div>
    </section>

    <!-- Provinces -->
    <section class="panel ov-block">
      <header class="panel__head">
        <div class="panel__head-l">
          <span class="panel__icon"><Grid3x3 :size="15" /></span>
          <div><div class="eyebrow">Geography</div><h3 class="panel__title">Provinces</h3></div>
        </div>
        <div class="panel__head-r"><span class="label">{{ provinceCards.length }} shown</span></div>
      </header>
      <div class="const-grid">
        <button v-for="(p, i) in provinceCards" :key="p.name" class="const-card" :class="{ 'const-card--lead': i === 0 }" @click="goToProvince(p.name)">
          <div class="const-card__head">
            <div class="const-card__name"><span class="sdot" :style="{ background: p.color }" />{{ p.name }}</div>
            <span class="const-card__badge">{{ p.badge }}</span>
          </div>
          <div class="const-card__head-val"><b class="num">{{ p.pop }}</b><span>population · {{ p.status }}</span></div>
          <div v-for="t in p.tracks" :key="t.label" class="const-track">
            <span class="const-track__label">{{ t.label }}</span>
            <div class="meter" style="height:5px;background:var(--inset)"><i :style="{ width: t.bar + '%', background: t.color }" /></div>
            <span class="const-track__val">{{ t.val }}</span>
          </div>
          <div class="const-card__foot"><Users :size="11" />{{ p.foot }}</div>
        </button>
      </div>
    </section>

    <!-- County atlas -->
    <div class="grid ov-county">
      <section class="panel">
        <header class="panel__head">
          <div class="panel__head-l">
            <span class="panel__icon"><Grid3x3 :size="15" /></span>
            <div><div class="eyebrow">County Atlas</div><h3 class="panel__title">Census</h3></div>
          </div>
        </header>
        <CountyCensusGrid
          :county-count="countyCount"
          :county-detail-count="countyDetailCount"
          :citizens-working="countyAtlas.citizensWorking"
          :average-appeal="countyAtlas.averageAppeal"
          :river-count="countyAtlas.riverCount"
          :railroad-count="countyAtlas.railroadCount"
          :terrain-counts="countyAtlas.terrain"
          :feature-counts="countyAtlas.features"
          :improvement-counts="countyAtlas.improvements"
          :building-counts="countyAtlas.buildings"
          :resource-counts="countyAtlas.resources"
        />
      </section>
      <section class="panel">
        <header class="panel__head">
          <div class="panel__head-l">
            <span class="panel__icon"><Grid3x3 :size="15" /></span>
            <div><div class="eyebrow">Terrain × Improvements</div><h3 class="panel__title">County Heatmap</h3></div>
          </div>
        </header>
        <CountyTerrainHeatmap
          eyebrow=""
          :terrain-counts="countyAtlas.terrain"
          :improvement-counts="countyAtlas.improvements"
        />
      </section>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { Activity, Flag, Grid3x3, Layers, Map, Target, Users, Zap } from 'lucide-vue-next'
import { useFormStore } from '../stores/formStore'
import { useBuilderOverview } from '../composables/useBuilderOverview'
import { civicHealthScore, gaugeTone, formatNumber, formatCompactNumber } from '../domain/provinceVisualizations'
import { radarOption, scatterOption, REGION_PALETTE, YIELD_COLORS } from '../domain/overviewCharts'
import ProvinceChart from '../components/ProvinceChart.vue'
import CountyCensusGrid from '../components/insights/CountyCensusGrid.vue'
import CountyTerrainHeatmap from '../components/insights/CountyTerrainHeatmap.vue'

const ECON_YIELDS = ['food', 'production', 'gold', 'culture', 'science', 'faith']
const TONE_COLOR = { good: 'var(--up)', watch: 'var(--gold)', poor: 'var(--down)', neutral: 'var(--azure)' }

function toneColor(value) {
  const t = gaugeTone(value)
  return TONE_COLOR[t] || TONE_COLOR.neutral
}
function clamp(v) { return Math.max(0, Math.min(100, v)) }

export default {
  name: 'CountryOverview',
  emits: ['navigate'],
  components: { ProvinceChart, CountyCensusGrid, CountyTerrainHeatmap, Activity, Flag, Grid3x3, Layers, Map, Target, Users, Zap },
  setup(_, { emit }) {
    const store = useFormStore()
    const overview = useBuilderOverview(store)
    const scope = ref('all')

    const stateReligion = computed(() => store.currentData?.country?.state_religion || 'None')

    // Region → colour map (stable by order)
    const regionColor = computed(() => {
      const map = {}
      overview.regionSummaries.value.forEach((r, i) => { map[r.name] = REGION_PALETTE[i % REGION_PALETTE.length] })
      return map
    })

    const scopeOptions = computed(() => [
      { value: 'all', label: 'All regions' },
      ...overview.regionSummaries.value.map((r) => ({ value: r.name, label: r.name.split(' ')[0] })),
    ])

    const scopedProvinces = computed(() => {
      const all = overview.provinceSummaries.value
      if (scope.value === 'all') return all
      return all.filter((p) => (p.group || 'Unassigned') === scope.value)
    })

    // ── Yield profile ──
    const yieldRows = computed(() => {
      const totals = ECON_YIELDS.map((key) => ({ key, value: overview.yieldTotals.value[key] || 0 }))
      const grand = totals.reduce((s, t) => s + t.value, 0) || 1
      const max = Math.max(1, ...totals.map((t) => t.value))
      return totals.sort((a, b) => b.value - a.value).map((t) => ({
        key: t.key,
        value: t.value,
        color: YIELD_COLORS[t.key] || 'var(--gold)',
        share: (t.value / grand) * 100,
        bar: (t.value / max) * 100,
      }))
    })
    const grandYield = computed(() => yieldRows.value.reduce((s, r) => s + r.value, 0))
    const radarChartOption = computed(() => {
      const max = Math.max(1, ...yieldRows.value.map((r) => r.value))
      const order = ECON_YIELDS
      const indicators = order.map((k) => ({ name: k[0].toUpperCase() + k.slice(1), max }))
      const values = order.map((k) => overview.yieldTotals.value[k] || 0)
      return radarOption(indicators, [{ name: 'National', hex: '#e3bd57', value: values }])
    })

    // ── Civic gauges ──
    const civicGauges = computed(() => {
      const a = overview.civicAverages.value
      const defs = [
        { label: 'Loyalty', raw: a.loyalty, pct: clamp(a.loyalty), unit: '%', display: Math.round(a.loyalty) },
        { label: 'Happiness', raw: a.happiness, pct: clamp(a.happiness), unit: '%', display: Math.round(a.happiness) },
        { label: 'Growth', raw: a.growth, pct: clamp(a.growth), unit: '%', display: Math.round(a.growth) },
        { label: 'Housing', raw: a.housing, pct: clamp(a.housing), unit: '', display: Math.round(a.housing) },
        { label: 'Amenities', raw: 60 + a.netAmenities * 3, pct: clamp(60 + a.netAmenities * 3), unit: '', display: Math.round(a.netAmenities) },
        { label: 'Food', raw: 60 + a.netFood * 3, pct: clamp(60 + a.netFood * 3), unit: '', display: Math.round(a.netFood) },
      ]
      return defs.map((d) => ({ ...d, color: toneColor(d.pct) }))
    })

    // ── Composition ──
    const religionMosaic = computed(() => {
      const entries = Object.entries(overview.religionTotals.value || {})
        .map(([name, value]) => ({ name, value }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value)
      const total = entries.reduce((s, r) => s + r.value, 0) || 1
      const colors = ['var(--gold)', 'var(--violet)', 'var(--jade)', 'var(--azure)', 'var(--rose)', 'var(--coral)', 'var(--teal)', 'var(--amber)']
      return entries.map((r, i) => ({ ...r, color: colors[i % colors.length], pct: Math.round((r.value / total) * 100) }))
    })

    const originBlocRows = computed(() => {
      const rows = [...overview.originBlocs.value].sort((a, b) => b.population - a.population)
      const max = Math.max(1, ...rows.map((r) => r.population))
      const colors = ['var(--azure)', 'var(--jade)', 'var(--coral)', 'var(--violet)', 'var(--rose)', 'var(--teal)']
      return rows.map((r, i) => ({ name: r.name, provinces: r.provinces, color: colors[i % colors.length], bar: (r.population / max) * 100 }))
    })

    const statusCensusEntries = computed(() => {
      const s = overview.statusCensus.value
      return [
        { label: 'National Capital', value: s.nationalCapital },
        { label: 'Regional Capitals', value: s.regionalCapital },
        { label: 'Founded', value: s.founded },
        { label: 'Joined', value: s.joined },
        { label: 'Conquered', value: s.conquered },
        { label: 'Unmarked', value: s.unmarked },
      ]
    })

    // ── Scatter ──
    const scatterChartOption = computed(() => {
      const points = scopedProvinces.value.map((p) => ({
        name: p.name || 'Unnamed',
        pop: Math.round(p.provincialPopulation),
        health: Math.round(civicHealthScore(p)),
        hex: regionColor.value[p.group] || '#57a3e8',
      }))
      return scatterOption(points)
    })
    const regionLegend = computed(() => overview.regionSummaries.value.map((r) => ({
      name: r.name, short: r.name.split(' ')[0], color: regionColor.value[r.name],
    })))

    // ── Region cards ──
    const regionCards = computed(() => {
      const maxPop = Math.max(1, ...overview.regionSummaries.value.map((r) => r.provincialPopulation))
      const lead = [...overview.regionSummaries.value].sort((a, b) => b.provincialPopulation - a.provincialPopulation)[0]?.name
      return overview.regionSummaries.value.map((r) => {
        const avg = (field) => (r.provinceCount ? r[field] / r.provinceCount : 0)
        const loy = avg('loyaltyTotal'); const hap = avg('happinessTotal'); const gro = avg('growthTotal')
        return {
          name: r.name,
          color: regionColor.value[r.name],
          provinceCount: r.provinceCount,
          pop: formatCompactNumber(r.provincialPopulation),
          lead: r.name === lead,
          foot: `${formatCompactNumber(r.totalYield)} yield · ${r.name === lead ? 'largest region' : r.religionName}`,
          tracks: [
            { label: 'Loyalty', bar: clamp(loy), val: `${formatNumber(loy)}%`, color: toneColor(loy) },
            { label: 'Happy', bar: clamp(hap), val: `${formatNumber(hap)}%`, color: toneColor(hap) },
            { label: 'Growth', bar: clamp(gro), val: `${formatNumber(gro)}%`, color: toneColor(gro) },
          ],
        }
      })
    })

    // ── Province cards ──
    const provinceCards = computed(() => {
      const sorted = [...scopedProvinces.value].sort((a, b) => b.provincialPopulation - a.provincialPopulation)
      const maxYield = Math.max(1, ...sorted.map((p) => p.totalYield))
      return sorted.slice(0, 12).map((p) => {
        const health = civicHealthScore(p)
        return {
          name: p.name || 'Unnamed',
          color: regionColor.value[p.group] || 'var(--azure)',
          badge: (p.group || 'Unassigned').split(' ')[0],
          pop: formatNumber(p.provincialPopulation),
          status: p.badges?.[0]?.label || 'Unmarked',
          foot: `${p.religionName} · ${p.originalCountry || 'Unspecified'}`,
          tracks: [
            { label: 'Yield', bar: (p.totalYield / maxYield) * 100, val: formatCompactNumber(p.totalYield), color: 'var(--gold)' },
            { label: 'Health', bar: clamp(health), val: `${formatNumber(health)}%`, color: toneColor(health) },
          ],
        }
      })
    })

    function goToRegion(name) { emit('navigate', { tab: 'regional-details', target: name }) }
    function goToProvince(name) { emit('navigate', { tab: 'province-details', target: name }) }

    return {
      ...overview,
      scope, scopeOptions, stateReligion,
      yieldRows, grandYield, radarChartOption,
      civicGauges, religionMosaic, originBlocRows, statusCensusEntries,
      scatterChartOption, regionLegend, regionCards, provinceCards,
      goToRegion, goToProvince, formatNumber, formatCompactNumber,
    }
  },
}
</script>

<style scoped>
.overview-screen { display: flex; flex-direction: column; }
.ov-kpis { margin-bottom: 16px; }
.ov-yield-row { grid-template-columns: 1.5fr 1fr; margin-bottom: 16px; align-items: stretch; }
.ov-yield-body { display: grid; grid-template-columns: 1fr 230px; gap: 16px; align-items: center; }
.ov-yield-tiles { grid-template-columns: repeat(2, 1fr); }
.ov-chart { width: 100%; height: 230px; }
.ov-gauges { gap: 14px; }
.ov-comp { margin-bottom: 16px; }
.ov-block { margin-bottom: 16px; }
.ov-legend { display: flex; gap: 12px; flex-wrap: wrap; }
.ov-scatter { width: 100%; height: 300px; }
.ov-county { grid-template-columns: 1fr 1.3fr; }
.ov-blocs { display: flex; flex-direction: column; gap: 9px; }
.ov-empty { font-size: 12px; color: var(--ink-3); padding: 8px 0; }
@media (max-width: 1180px) {
  .ov-yield-row, .ov-county { grid-template-columns: 1fr; }
  .ov-yield-body { grid-template-columns: 1fr; }
  .ov-yield-tiles { grid-template-columns: repeat(3, 1fr); }
}
</style>

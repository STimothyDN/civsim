<template>
  <section class="country-overview-page">
    <header class="country-overview-hero-band">
      <div class="hero-identity">
        <p class="eyebrow">Country Overview</p>
        <h2>{{ countryName }}</h2>
        <div class="hero-chips">
          <span>{{ formatCompactNumber(totalProvincialPopulation) }} people</span>
          <span>{{ provinceCount }} provinces</span>
          <span>{{ groupCount }} regions</span>
          <span>{{ countyDetailCount }} / {{ countyCount }} county records</span>
        </div>
      </div>
      <div class="hero-identity-grid">
        <div v-for="item in countryIdentity" :key="item.label" class="hero-identity-cell">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
      <div class="hero-totals">
        <div class="hero-total-card">
          <span>Provincial Population</span>
          <strong>{{ formatCompactNumber(totalProvincialPopulation) }}</strong>
          <small>{{ formatNumber(totalRawPopulation) }} raw</small>
        </div>
        <div class="hero-total-card">
          <span>Economy / Turn</span>
          <strong>{{ formatNumber(totalEconomyOutput) }}</strong>
          <small>gold · faith · culture · science</small>
        </div>
        <div class="hero-total-card">
          <span>Civic Health</span>
          <strong>{{ formatNumber(civicHealthAverage) }}%</strong>
          <small>composite avg</small>
        </div>
      </div>
    </header>

    <section class="overview-band overview-band--vital">
      <div class="band-head"><p class="eyebrow">Vital Signs</p><small>country-wide averages</small></div>
      <CivicGaugeStrip
        :loyalty="civicAverages.loyalty"
        :happiness="civicAverages.happiness"
        :growth="civicAverages.growth"
        :housing="civicAverages.housing"
        :net-amenities="civicAverages.netAmenities"
        :net-food="civicAverages.netFood"
      />
      <div class="yield-tiles">
        <div v-for="tile in yieldTiles" :key="tile.label" class="yield-tile" :class="{ 'yield-tile--lead': tile.lead }">
          <span>{{ tile.label }}</span>
          <strong>{{ formatNumber(tile.value) }}</strong>
          <small>{{ tile.share.toFixed(1) }}% share</small>
        </div>
      </div>
    </section>

    <section class="overview-band overview-band--composition">
      <div class="composition-grid">
        <article class="composition-panel">
          <ReligionMosaic :religions="religionTotals" eyebrow="National Religion Mosaic" />
        </article>
        <article class="composition-panel">
          <OriginBlocBars :blocs="originBlocs" eyebrow="Origin Blocs" />
        </article>
        <article class="composition-panel">
          <p class="eyebrow">Status Census</p>
          <div class="status-census-grid">
            <div v-for="entry in statusCensusEntries" :key="entry.label" class="status-census-cell">
              <span>{{ entry.label }}</span>
              <strong>{{ entry.value }}</strong>
              <small>of {{ provinceCount }}</small>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="overview-band">
      <div class="band-head"><p class="eyebrow">Geography</p><small>regions and provinces at a glance</small></div>
      <div class="band-head"><strong>Regions</strong><small>{{ regionSummaries.length }} groups</small></div>
      <div class="constellation-grid">
        <EntityConstellationCard
          v-for="region in regionConstellation"
          :key="`region-${region.name}`"
          :name="region.name"
          :badge="region.badge"
          :headline-label="region.headlineLabel"
          :headline-value="region.headlineValue"
          :tracks="region.tracks"
          :footer="region.footer"
          :lead="region.lead"
          @select="goToRegion(region.name)"
        />
      </div>
      <div class="band-head"><strong>Provinces</strong><small>{{ provinceSummaries.length }} provinces</small></div>
      <div class="constellation-grid">
        <EntityConstellationCard
          v-for="prov in provinceConstellation"
          :key="`prov-${prov.name}`"
          :name="prov.name"
          :badge="prov.badge"
          :headline-label="prov.headlineLabel"
          :headline-value="prov.headlineValue"
          :tracks="prov.tracks"
          :footer="prov.footer"
          :lead="prov.lead"
          @select="goToProvince(prov.name)"
        />
      </div>
    </section>

    <section class="overview-band">
      <div class="band-head"><p class="eyebrow">County Atlas</p><small>across all provinces</small></div>
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
      <CountyTerrainHeatmap
        eyebrow="Terrain × Improvements"
        :terrain-counts="countyAtlas.terrain"
        :improvement-counts="countyAtlas.improvements"
      />
    </section>
  </section>
</template>

<script>
import { computed } from 'vue'
import { useFormStore } from '../stores/formStore'
import { useBuilderOverview } from '../composables/useBuilderOverview'
import { PROVINCE_YIELD_KEYS, civicHealthScore, gaugeTone, formatNumber, formatCompactNumber } from '../domain/provinceVisualizations'
import CivicGaugeStrip from '../components/insights/CivicGaugeStrip.vue'
import ReligionMosaic from '../components/insights/ReligionMosaic.vue'
import OriginBlocBars from '../components/insights/OriginBlocBars.vue'
import CountyCensusGrid from '../components/insights/CountyCensusGrid.vue'
import CountyTerrainHeatmap from '../components/insights/CountyTerrainHeatmap.vue'
import EntityConstellationCard from '../components/insights/EntityConstellationCard.vue'

function labelForKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default {
  name: 'CountryOverview',
  emits: ['navigate'],
  components: {
    CivicGaugeStrip,
    ReligionMosaic,
    OriginBlocBars,
    CountyCensusGrid,
    CountyTerrainHeatmap,
    EntityConstellationCard,
  },
  setup(_, { emit }) {
    const store = useFormStore()
    const overview = useBuilderOverview(store)

    const yieldTiles = computed(() => {
      const totals = PROVINCE_YIELD_KEYS.map((key) => ({ key, value: overview.yieldTotals.value[key] || 0 }))
      const grand = totals.reduce((sum, t) => sum + t.value, 0) || 1
      const max = Math.max(...totals.map((t) => t.value))
      return totals
        .sort((a, b) => b.value - a.value)
        .map((t) => ({
          label: labelForKey(t.key),
          value: t.value,
          share: (t.value / grand) * 100,
          lead: t.value === max && max > 0,
        }))
    })

    const statusCensusEntries = computed(() => [
      { label: 'National Capital', value: overview.statusCensus.value.nationalCapital },
      { label: 'Regional Capitals', value: overview.statusCensus.value.regionalCapital },
      { label: 'Founded', value: overview.statusCensus.value.founded },
      { label: 'Joined', value: overview.statusCensus.value.joined },
      { label: 'Conquered', value: overview.statusCensus.value.conquered },
      { label: 'Unmarked', value: overview.statusCensus.value.unmarked },
    ])

    const regionConstellation = computed(() => {
      const maxPop = Math.max(1, ...overview.regionSummaries.value.map((r) => r.provincialPopulation))
      const lead = overview.regionSummaries.value
        .slice()
        .sort((a, b) => b.provincialPopulation - a.provincialPopulation)[0]?.name
      return overview.regionSummaries.value.map((r) => {
        const avgLoyalty = r.provinceCount ? r.loyaltyTotal / r.provinceCount : 0
        const avgHappiness = r.provinceCount ? r.happinessTotal / r.provinceCount : 0
        return {
          name: r.name,
          badge: `${r.provinceCount} prov`,
          headlineLabel: 'Pop',
          headlineValue: formatCompactNumber(r.provincialPopulation),
          lead: r.name === lead,
          footer: `${r.topYieldLabel} leads · ${r.religionName}`,
          tracks: [
            { label: 'Pop', value: r.provincialPopulation, share: (r.provincialPopulation / maxPop) * 100, tone: 'neutral' },
            { label: 'Loyalty', value: `${formatNumber(avgLoyalty)}%`, share: avgLoyalty, tone: gaugeTone(avgLoyalty) },
            { label: 'Happy', value: `${formatNumber(avgHappiness)}%`, share: avgHappiness, tone: gaugeTone(avgHappiness) },
          ],
        }
      })
    })

    const provinceConstellation = computed(() => {
      const sorted = [...overview.provinceSummaries.value].sort((a, b) => b.provincialPopulation - a.provincialPopulation)
      const maxYield = Math.max(1, ...sorted.map((p) => p.totalYield))
      const top = sorted[0]?.name
      return sorted.slice(0, 18).map((p) => ({
        name: p.name,
        badge: p.group,
        headlineLabel: 'Pop',
        headlineValue: formatCompactNumber(p.provincialPopulation),
        lead: p.name === top,
        footer: `${p.religionName} · ${p.originalCountry || 'Unspecified'}`,
        tracks: [
          { label: 'Yield', value: formatNumber(p.totalYield), share: (p.totalYield / maxYield) * 100, tone: 'neutral' },
          { label: 'Health', value: `${formatNumber(civicHealthScore(p))}%`, share: civicHealthScore(p), tone: gaugeTone(civicHealthScore(p)) },
        ],
      }))
    })

    function goToRegion(name) { emit('navigate', { tab: 'regional-details', target: name }) }
    function goToProvince(name) { emit('navigate', { tab: 'province-details', target: name }) }

    return {
      ...overview,
      yieldTiles,
      statusCensusEntries,
      regionConstellation,
      provinceConstellation,
      goToRegion,
      goToProvince,
      formatNumber,
      formatCompactNumber,
    }
  },
}
</script>

<style scoped>
.country-overview-page { display: flex; flex-direction: column; gap: 18px; }
.country-overview-hero-band { display: grid; grid-template-columns: 1.4fr 1fr 1.1fr; gap: 14px; padding: 16px 18px; background: linear-gradient(135deg, rgba(212,168,67,0.08), transparent); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 10px; }
@media (max-width: 1100px) { .country-overview-hero-band { grid-template-columns: 1fr; } }
.hero-identity h2 { margin: 0 0 8px; font-size: 1.6rem; font-family: 'Cinzel', serif; }
.eyebrow { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted, #a9a39a); margin: 0 0 4px; }
.hero-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.hero-chips span { font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); color: var(--text-muted, #a9a39a); }
.hero-identity-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; align-content: start; }
.hero-identity-cell { display: flex; flex-direction: column; padding: 6px 8px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 6px; }
.hero-identity-cell span { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #a9a39a); font-weight: 700; }
.hero-identity-cell strong { font-size: 0.92rem; }
.hero-totals { display: grid; grid-template-columns: 1fr; gap: 6px; align-content: start; }
.hero-total-card { display: flex; flex-direction: column; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px dashed rgba(212,168,67,0.4); border-radius: 8px; }
.hero-total-card span { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #a9a39a); font-weight: 700; }
.hero-total-card strong { font-size: 1.4rem; color: var(--accent, #d4a843); }
.hero-total-card small { font-size: 0.65rem; color: var(--text-muted, #a9a39a); }
.overview-band { display: flex; flex-direction: column; gap: 12px; padding: 14px 16px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 10px; }
.band-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.band-head small { font-size: 0.7rem; color: var(--text-muted, #a9a39a); }
.band-head strong { font-size: 0.85rem; }
.yield-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 6px; }
.yield-tile { display: flex; flex-direction: column; padding: 8px 10px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 6px; }
.yield-tile span { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #a9a39a); font-weight: 700; }
.yield-tile strong { font-size: 1rem; }
.yield-tile small { font-size: 0.62rem; color: var(--text-muted, #a9a39a); }
.yield-tile--lead { background: linear-gradient(135deg, rgba(212,168,67,0.18), transparent); border-color: rgba(212,168,67,0.45); }
.yield-tile--lead strong { color: var(--accent, #d4a843); }
.composition-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.composition-panel { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 8px; }
.status-census-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 6px; }
.status-census-cell { display: flex; flex-direction: column; padding: 6px 8px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 6px; }
.status-census-cell span { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #a9a39a); font-weight: 700; }
.status-census-cell strong { font-size: 1.05rem; }
.status-census-cell small { font-size: 0.62rem; color: var(--text-muted, #a9a39a); }
.constellation-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
</style>

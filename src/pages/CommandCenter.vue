<template>
  <div class="home-screen">
    <!-- Empty state -->
    <div v-if="!hasData" class="empty-workspace">
      <Globe2 :size="52" style="color: var(--gold)" />
      <div>
        <h2>No World Loaded</h2>
        <p>Create a template or import a world to open the command center.</p>
      </div>
      <button type="button" class="btn btn--primary" @click="openNewTemplate">
        <FilePlus2 :size="16" />
        New Template
      </button>
    </div>

    <template v-else>
      <div class="view-head">
        <div>
          <div class="eyebrow eyebrow--gold">Command Center</div>
          <h1>Welcome back{{ leaderFirstName ? `, ${leaderFirstName}` : '' }}</h1>
          <p>Your empire at a glance — pick up where you left off or run a fresh simulation.</p>
        </div>
        <div class="view-head__actions">
          <button type="button" class="btn" @click="recalculate"><RefreshCw :size="15" :class="{ spin: recalcSpinning }" />Recalculate</button>
          <button type="button" class="btn btn--primary" @click="go('/elections')"><Vote :size="15" />Run election</button>
        </div>
      </div>

      <!-- HERO -->
      <div class="hero">
        <div class="hero__l">
          <span class="hero__crest"><Flag :size="26" /></span>
          <div class="hero__name">{{ countryName }}</div>
          <div class="hero__leader">
            Led by <b>{{ leader }}</b>
            <template v-if="stateReligion !== 'None'"> · {{ stateReligion }}</template>
          </div>
          <div class="hero__chips">
            <span class="chip"><Users :size="11" />{{ formatCompactNumber(totalProvincialPopulation) }} citizens</span>
            <span class="chip"><Map :size="11" />{{ groupCount }} regions</span>
            <span class="chip"><Grid3x3 :size="11" />{{ provinceCount }} provinces</span>
            <span v-if="assemblyLeader" class="chip chip--gold"><Trophy :size="11" />{{ assemblyLeader.abbr }} plurality</span>
          </div>
          <div class="hero__cta">
            <button type="button" class="btn btn--primary" @click="go('/overview')"><Globe2 :size="15" />Open overview</button>
            <button type="button" class="btn" @click="go('/builder')"><PencilLine :size="15" />Edit world</button>
          </div>
        </div>
        <div class="hero__r">
          <div v-for="v in vitals" :key="v.label">
            <div class="hero__vital-label"><span>{{ v.label }}</span><b :style="{ color: v.color }">{{ v.display }}{{ v.unit }}</b></div>
            <div class="meter" style="height:5px;background:var(--inset)"><i :style="{ width: v.pct + '%', background: v.color }" /></div>
          </div>
        </div>
      </div>

      <!-- KPI -->
      <div class="grid grid--4 home-kpis">
        <div class="kpi kpi--accent">
          <div class="kpi__label label">Provincial Population</div>
          <div class="kpi__value num">{{ formatCompactNumber(totalProvincialPopulation) }}</div>
          <div class="kpi__foot"><span class="kpi__sub">across all provinces</span></div>
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
          <div class="kpi__label label">Counties Surveyed</div>
          <div class="kpi__value num">{{ countyDetailCount }}<em class="kpi__unit">/ {{ countyCount }}</em></div>
          <div class="kpi__foot"><span class="kpi__sub">detailed records</span></div>
        </div>
      </div>

      <!-- MAIN -->
      <div class="home-main">
        <!-- left -->
        <div class="home-col">
          <section class="panel">
            <header class="panel__head">
              <div class="panel__head-l">
                <span class="panel__icon"><LayoutGrid :size="15" /></span>
                <div><div class="eyebrow">Jump back in</div><h3 class="panel__title">Continue building</h3></div>
              </div>
            </header>
            <div class="jump-grid">
              <button v-for="j in jumps" :key="j.title" class="jump-card" @click="j.action">
                <span class="jump-card__icon"><component :is="j.icon" :size="18" /></span>
                <div class="jump-card__title">{{ j.title }}</div>
                <div class="jump-card__desc">{{ j.desc }}</div>
                <div class="jump-card__foot">
                  <span class="jump-card__stat">{{ j.stat }}</span>
                  <span class="jump-card__go"><ArrowRight :size="15" /></span>
                </div>
              </button>
            </div>
          </section>

          <section class="panel">
            <header class="panel__head">
              <div class="panel__head-l">
                <span class="panel__icon"><Activity :size="15" /></span>
                <div><div class="eyebrow">Vital signs</div><h3 class="panel__title">National Health</h3></div>
              </div>
              <div class="panel__head-r"><span class="chip chip--up">stable</span></div>
            </header>
            <div class="vitals">
              <div v-for="v in vitals" :key="v.label" class="mini-gauge">
                <div class="mini-gauge__ring" :style="{ '--p': v.pct + '%', '--c': v.color }">
                  <span class="num">{{ v.display }}<em>{{ v.unit }}</em></span>
                </div>
                <span class="label">{{ v.label }}</span>
              </div>
            </div>
          </section>
        </div>

        <!-- right -->
        <div class="home-col">
          <section class="panel panel--glow">
            <header class="panel__head">
              <div class="panel__head-l">
                <span class="panel__icon"><Vote :size="15" /></span>
                <div><div class="eyebrow">Live projection</div><h3 class="panel__title">National Vote</h3></div>
              </div>
              <div class="panel__head-r">
                <button type="button" class="btn btn--sm btn--ghost" @click="go('/elections')">Details <ArrowRight :size="13" /></button>
              </div>
            </header>
            <template v-if="nationalVote.length">
              <div class="vboard">
                <div v-for="p in nationalVote" :key="p.party" class="vrow">
                  <span class="vrow__name pbadge" :style="{ '--pc': p.color }">
                    <i class="pbadge__dot" :style="{ background: p.color }" /><b>{{ p.abbr }}</b>
                  </span>
                  <div class="meter" style="height:9px;background:var(--inset)"><i :style="{ width: p.bar + '%', background: p.color }" /></div>
                  <div class="vrow__pct">{{ p.pct.toFixed(1) }}%</div>
                </div>
              </div>
              <hr class="hr" />
              <div class="home-assembly">
                <div class="label">Assembly control</div>
                <div class="home-assembly__lead" v-if="assemblyLeader">
                  <span class="pbadge pbadge--md" :style="{ '--pc': assemblyLeader.color }">
                    <i class="pbadge__dot" :style="{ background: assemblyLeader.color }" /><b>{{ assemblyLeader.abbr }}</b>
                  </span>
                  <span class="num home-assembly__seats">{{ assemblyLeader.seats }}<em>/ {{ assemblyLeader.total }}</em></span>
                </div>
              </div>
            </template>
            <p v-else class="ov-empty">No simulation yet — open the simulator to project the assembly.</p>
          </section>

          <section class="panel">
            <header class="panel__head">
              <div class="panel__head-l">
                <span class="panel__icon"><ScrollText :size="15" /></span>
                <div><div class="eyebrow">Briefing</div><h3 class="panel__title">State of the World</h3></div>
              </div>
            </header>
            <div class="feed">
              <div v-for="f in briefing" :key="f.label" class="feed__item">
                <span class="feed__dot" :class="`feed__dot--${f.tone}`"><component :is="f.icon" :size="12" /></span>
                <div class="feed__body"><b>{{ f.value }}</b> <span>{{ f.label }}</span></div>
                <div class="feed__time">{{ f.meta }}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Activity, ArrowRight, Crown, Flag, FilePlus2, Globe2, Grid3x3, Landmark, LayoutGrid,
  Layers, Map, PencilLine, RefreshCw, ScrollText, Sparkles, Trophy, Users, Vote, Zap,
} from 'lucide-vue-next'
import { useFormStore } from '../stores/formStore'
import { useUiStore } from '../stores/uiStore'
import { useBuilderOverview } from '../composables/useBuilderOverview'
import { useElectionResults } from '../composables/useElectionResults'
import { gaugeTone, formatNumber, formatCompactNumber } from '../domain/provinceVisualizations'

const TONE_COLOR = { good: 'var(--up)', watch: 'var(--gold)', poor: 'var(--down)', neutral: 'var(--azure)' }
function toneColor(v) { return TONE_COLOR[gaugeTone(v)] || TONE_COLOR.neutral }
function clamp(v) { return Math.max(0, Math.min(100, v)) }

export default {
  name: 'CommandCenter',
  components: {
    Activity, ArrowRight, Crown, Flag, FilePlus2, Globe2, Grid3x3, Landmark, LayoutGrid,
    Layers, Map, PencilLine, RefreshCw, ScrollText, Sparkles, Trophy, Users, Vote, Zap,
  },
  setup() {
    const router = useRouter()
    const store = useFormStore()
    const ui = useUiStore()
    const overview = useBuilderOverview(store)
    const recalcSpinning = ref(false)

    const hasData = computed(() => !!store.currentData)
    const leader = computed(() => store.currentData?.country?.basic_info?.leader || 'Unassigned')
    const leaderFirstName = computed(() => (leader.value && leader.value !== 'Unassigned' ? leader.value.split(' ')[0] : ''))
    const stateReligion = computed(() => store.currentData?.country?.state_religion || 'None')

    const vitals = computed(() => {
      const a = overview.civicAverages.value
      const defs = [
        { label: 'Loyalty', pct: clamp(a.loyalty), unit: '%', display: Math.round(a.loyalty) },
        { label: 'Happiness', pct: clamp(a.happiness), unit: '%', display: Math.round(a.happiness) },
        { label: 'Growth', pct: clamp(a.growth), unit: '%', display: Math.round(a.growth) },
        { label: 'Housing', pct: clamp(a.housing), unit: '', display: Math.round(a.housing) },
        { label: 'Health', pct: clamp(overview.civicHealthAverage.value), unit: '%', display: Math.round(overview.civicHealthAverage.value) },
        { label: 'Amenities', pct: clamp(60 + a.netAmenities * 3), unit: '', display: Math.round(a.netAmenities) },
      ]
      return defs.map((d) => ({ ...d, color: toneColor(d.pct) }))
    })

    // ── Defensive election projection ──
    let electionApi = null
    try { electionApi = useElectionResults() } catch (e) { electionApi = null }

    const nationalAssembly = computed(() => {
      try { return electionApi?.results?.value?.national?.assembly || null } catch (e) { return null }
    })
    const partyMeta = computed(() => store.partyMeta || {})

    const nationalVote = computed(() => {
      const shares = nationalAssembly.value?.vote_shares
      if (!shares || typeof shares !== 'object') return []
      const entries = Object.entries(shares)
        .map(([party, raw]) => ({ party, raw: Number(raw) || 0 }))
        .filter((e) => e.raw > 0)
        .sort((a, b) => b.raw - a.raw)
      if (!entries.length) return []
      const maxRaw = entries[0].raw
      const asPercent = maxRaw <= 1.5 ? 100 : 1
      const top = entries.slice(0, 6)
      const maxPct = top[0].raw * asPercent
      return top.map((e) => {
        const meta = partyMeta.value[e.party] || {}
        return {
          party: e.party,
          abbr: meta.abbreviation || e.party,
          color: meta.color || 'var(--gold)',
          pct: e.raw * asPercent,
          bar: maxPct ? (e.raw * asPercent / maxPct) * 100 : 0,
        }
      })
    })

    const assemblyLeader = computed(() => {
      const asm = nationalAssembly.value
      const leaderParty = asm?.control?.leaderParty
      if (!leaderParty) return null
      const meta = partyMeta.value[leaderParty] || {}
      const seatsMap = asm?.seats
      let seats = null
      if (seatsMap && typeof seatsMap === 'object' && !Array.isArray(seatsMap)) seats = seatsMap[leaderParty]
      return {
        abbr: meta.abbreviation || leaderParty,
        color: meta.color || 'var(--gold)',
        seats: seats != null ? seats : (asm?.control?.leaderSeats ?? '—'),
        total: asm?.seat_count ?? asm?.control?.totalSeats ?? '—',
      }
    })

    const jumps = computed(() => [
      { title: 'Builder', desc: 'Define regions, provinces & counties', stat: `${overview.provinceCount.value} provinces`, icon: Layers, action: () => go('/builder') },
      { title: 'Country Overview', desc: 'Vital signs & national dashboards', stat: `${overview.groupCount.value} regions`, icon: Globe2, action: () => go('/overview') },
      { title: 'Run Election', desc: 'Simulate the national assembly', stat: `${Object.keys(partyMeta.value).length} parties`, icon: Vote, action: () => go('/elections') },
      { title: 'Quick Wizard', desc: 'Fast guided data entry', stat: 'Guided', icon: Sparkles, action: () => ui.openWizardModal() },
    ])

    const briefing = computed(() => {
      const out = []
      if (overview.nationalCapital.value && overview.nationalCapital.value !== 'None') {
        out.push({ icon: Landmark, tone: 'gold', value: overview.nationalCapital.value, label: 'serves as national capital', meta: 'capital' })
      }
      if (overview.topRegion.value?.name) {
        out.push({ icon: Map, tone: 'azure', value: overview.topRegion.value.name, label: 'is the largest region', meta: formatCompactNumber(overview.topRegion.value.provincialPopulation) })
      }
      if (overview.dominantReligion.value?.name && overview.dominantReligion.value.name !== 'None') {
        out.push({ icon: Sparkles, tone: 'gold', value: overview.dominantReligion.value.name, label: 'leads in followers', meta: `${overview.religionCount.value} faiths` })
      }
      if (overview.topYield.value?.label) {
        out.push({ icon: Zap, tone: 'jade', value: overview.topYield.value.label, label: 'is the top national yield', meta: formatCompactNumber(overview.topYield.value.total) })
      }
      out.push({ icon: Grid3x3, tone: 'azure', value: `${overview.countyDetailCount.value}/${overview.countyCount.value}`, label: 'county records surveyed', meta: 'census' })
      return out
    })

    function go(path) { router.push(path) }
    function openNewTemplate() { ui.openNewTemplateModal() }
    function recalculate() {
      store.recalculate()
      recalcSpinning.value = true
      setTimeout(() => { recalcSpinning.value = false }, 700)
    }

    return {
      ...overview,
      hasData, leader, leaderFirstName, stateReligion,
      vitals, nationalVote, assemblyLeader, jumps, briefing,
      recalcSpinning, go, openNewTemplate, recalculate,
      formatNumber, formatCompactNumber,
    }
  },
}
</script>

<style scoped>
.home-screen { display: flex; flex-direction: column; }
.home-kpis { margin-bottom: 16px; }
.home-assembly { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.home-assembly__lead { display: flex; align-items: center; gap: 10px; }
.home-assembly__seats { color: var(--gold); font-weight: 700; font-size: 15px; }
.home-assembly__seats em { font-style: normal; color: var(--ink-3); font-size: 11px; font-weight: 600; }
</style>

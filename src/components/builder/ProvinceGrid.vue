<template>
  <div class="builder-grid-screen">
    <div class="view-head">
      <div>
        <div class="eyebrow eyebrow--gold">Builder</div>
        <h1>Province Grid</h1>
        <p>Edit your empire as a live spreadsheet — every change re-rolls the totals instantly.</p>
      </div>
      <div class="view-head__actions">
        <button type="button" class="btn" @click="openWizard"><Sparkles :size="15" />Quick wizard</button>
        <button type="button" class="btn btn--primary" @click="addProvince"><Plus :size="15" />Add province</button>
      </div>
    </div>

    <!-- LIVE ROLLUP -->
    <div class="builder-rollup">
      <div class="rollup">
        <span class="rollup__icon"><Users :size="16" /></span>
        <div class="rollup__meta"><b>{{ formatCompactNumber(rollup.population) }}</b><span>Population</span></div>
      </div>
      <div class="rollup">
        <span class="rollup__icon"><Zap :size="16" /></span>
        <div class="rollup__meta"><b>{{ formatCompactNumber(rollup.yield) }}</b><span>Σ Yield / turn</span></div>
      </div>
      <div class="rollup">
        <span class="rollup__icon"><Flag :size="16" /></span>
        <div class="rollup__meta"><b :style="{ color: toneColor(rollup.loyalty) }">{{ rollup.loyalty }}%</b><span>Avg Loyalty</span></div>
      </div>
      <div class="rollup">
        <span class="rollup__icon"><Activity :size="16" /></span>
        <div class="rollup__meta"><b :style="{ color: toneColor(rollup.health) }">{{ rollup.health }}%</b><span>Avg Health</span></div>
      </div>
      <div class="rollup" :class="{ 'rollup--warn': rollup.unassigned > 0 }">
        <span class="rollup__icon"><component :is="rollup.unassigned ? AlertTriangle : Check" :size="16" /></span>
        <div class="rollup__meta"><b>{{ rollup.unassigned }}</b><span>{{ rollup.unassigned ? 'Unassigned' : 'All assigned' }}</span></div>
      </div>
    </div>

    <div class="builder-layout">
      <!-- LEFT: grid -->
      <div>
        <div class="bgrid-bar">
          <div class="searchbox" style="width: 220px">
            <Search :size="14" />
            <input type="text" v-model="search" placeholder="Filter provinces…" aria-label="Filter provinces" />
          </div>
          <div class="bgrid-bar__hint">
            <Pencil :size="12" /> Click any cell ·
            <kbd>Tab</kbd><kbd>↵</kbd><kbd>↑</kbd><kbd>↓</kbd> to move
          </div>
        </div>

        <div v-if="!displayRows.length" class="empty-workspace" style="min-height: 220px">
          <MapPinned :size="40" style="color: var(--gold)" />
          <div><h2>No provinces yet</h2><p>Add a province to start building your empire.</p></div>
          <button type="button" class="btn btn--primary" @click="addProvince"><Plus :size="15" />Add province</button>
        </div>

        <div v-else class="bgrid-scroll">
          <table class="bgrid">
            <colgroup>
              <col v-for="col in COLS" :key="col.key" :style="{ width: col.w + 'px' }" />
            </colgroup>
            <thead>
              <tr>
                <th v-for="col in COLS" :key="col.key" :class="{ 'col-l': col.align === 'l' }">{{ col.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, r) in displayRows" :key="row.index" :class="{ 'row-active': activeIndex === row.index }">
                <!-- Name -->
                <td :class="{ 'cell-flash': flash === row.index + '-name' }">
                  <div class="bcell bcell--name">
                    <span class="sdot" :style="{ background: groupColor(row.group) }" />
                    <input
                      :ref="(el) => registerRef(r, 'name', el)"
                      :value="row.name"
                      @focus="activeIndex = row.index"
                      @input="commit(row.index, 'name', $event.target.value)"
                      @keydown="onKey($event, r, 'name')"
                    />
                    <span class="bstatus" :class="`bstatus--${statusOf(row).tone}`">{{ statusOf(row).label }}</span>
                  </div>
                </td>
                <!-- Region -->
                <td :class="{ 'cell-flash': flash === row.index + '-group' }">
                  <div class="bcell">
                    <select
                      :ref="(el) => registerRef(r, 'group', el)"
                      :value="regionNames.includes(row.group) ? row.group : ''"
                      @focus="activeIndex = row.index"
                      @change="commit(row.index, 'group', $event.target.value)"
                      @keydown="onKey($event, r, 'group')"
                    >
                      <option v-for="rn in regionNames" :key="rn" :value="rn">{{ rn }}</option>
                      <option value="">— Unassigned —</option>
                    </select>
                  </div>
                </td>
                <!-- Numeric editable -->
                <td v-for="col in NUM_COLS" :key="col.key" :class="{ 'cell-flash': flash === row.index + '-' + col.key }">
                  <div class="bcell bcell--num">
                    <input
                      inputmode="numeric"
                      :ref="(el) => registerRef(r, col.key, el)"
                      :value="row[col.field]"
                      @focus="activeIndex = row.index"
                      @input="commit(row.index, col.key, $event.target.value)"
                      @keydown="onKey($event, r, col.key)"
                    />
                  </div>
                </td>
                <!-- Health meter (read-only) -->
                <td>
                  <div class="bcell" style="gap: 8px">
                    <div class="bcell__meter meter" style="height:5px;background:var(--inset)">
                      <i :style="{ width: clamp(healthOf(row)) + '%', background: toneColor(healthOf(row)) }" />
                    </div>
                    <span class="num" :style="{ fontSize: '11px', color: toneColor(healthOf(row)), width: '26px', textAlign: 'right' }">{{ healthOf(row) }}</span>
                  </div>
                </td>
                <!-- Σ Yield (read-only) -->
                <td><div class="bcell bcell--ro">{{ formatCompactNumber(row.totalYield) }}</div></td>
              </tr>
            </tbody>
          </table>
          <button type="button" class="bgrid-add" @click="addProvince"><Plus :size="14" />Add province</button>
        </div>
      </div>

      <!-- RIGHT: live inspector -->
      <div class="inspector">
        <section v-if="active" class="panel panel--glow insp-card">
          <div class="insp-head">
            <div class="insp-title">
              <span class="sdot" :style="{ background: groupColor(active.group) }" />
              <div>
                <h3>{{ active.name }}</h3>
                <span>{{ active.group || 'Unassigned' }} · {{ statusOf(active).label }}</span>
              </div>
            </div>
            <span class="chip" :class="healthOf(active) >= 60 ? 'chip--up' : 'chip--down'">{{ healthOf(active) }}% health</span>
          </div>

          <div>
            <div class="insp-section-label">Civic vitals</div>
            <div class="insp-stats">
              <div class="insp-stat"><span>Population</span><b>{{ formatCompactNumber(active.population) }}</b></div>
              <div class="insp-stat"><span>Provincial Pop</span><b>{{ formatCompactNumber(active.provincialPopulation) }}</b></div>
              <div class="insp-stat"><span>Loyalty</span><b>{{ formatNumber(active.loyalty) }}%</b></div>
              <div class="insp-stat"><span>Happiness</span><b>{{ formatNumber(active.happinessPercentage) }}%</b></div>
              <div class="insp-stat"><span>Growth</span><b>{{ formatNumber(active.growthPercentage) }}%</b></div>
              <div class="insp-stat"><span>Counties</span><b>{{ active.countyCount }}</b></div>
            </div>
          </div>

          <div>
            <div class="insp-section-label">Yield profile</div>
            <div class="insp-yields">
              <div v-for="y in activeYields" :key="y.key" class="insp-yield-row">
                <span>{{ y.key }}</span>
                <div class="meter" style="height:6px;background:var(--inset)"><i :style="{ width: y.bar + '%', background: y.color }" /></div>
                <b>{{ formatNumber(y.value) }}</b>
              </div>
            </div>
          </div>

          <div class="insp-impact">
            <div class="insp-section-label" style="color: var(--gold)">National impact</div>
            <div class="insp-impact-row"><span>Pop share</span><b>{{ popShare.toFixed(1) }}%</b></div>
            <div class="insp-impact-row"><span>Yield share</span><b>{{ yieldShare.toFixed(1) }}%</b></div>
            <div class="insp-impact-row"><span>Religion</span><b>{{ activeReligion }}</b></div>
            <div class="insp-impact-row"><span>Origin bloc</span><b>{{ active.originalCountry }}</b></div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, nextTick, ref } from 'vue'
import {
  Activity, AlertTriangle, Check, Flag, MapPinned, Pencil, Plus, Search, Sparkles, Users, Zap,
} from 'lucide-vue-next'
import { useFormStore } from '../../stores/formStore'
import { useCivilizationStore } from '../../stores/civilizationStore'
import { useUiStore } from '../../stores/uiStore'
import { PROVINCE_YIELD_KEYS, civicHealthScore, gaugeTone, formatNumber, formatCompactNumber } from '../../domain/provinceVisualizations'
import { REGION_PALETTE, YIELD_COLORS } from '../../domain/overviewCharts'

const COLS = [
  { key: 'name', label: 'Province', align: 'l', w: 168 },
  { key: 'group', label: 'Region', align: 'l', w: 150 },
  { key: 'pop', label: 'Pop', w: 76 },
  { key: 'loyalty', label: 'Loyalty', w: 74 },
  { key: 'happiness', label: 'Happy', w: 68 },
  { key: 'growth', label: 'Growth', w: 72 },
  { key: 'health', label: 'Health', w: 96 },
  { key: 'yield', label: 'Σ Yield', w: 76 },
]
const NUM_COLS = [
  { key: 'pop', field: 'population', path: 'population', max: 1e12 },
  { key: 'loyalty', field: 'loyalty', path: 'loyalty', max: 200 },
  { key: 'happiness', field: 'happinessPercentage', path: 'happiness_percentage', max: 200 },
  { key: 'growth', field: 'growthPercentage', path: 'growth_percentage', max: 200 },
]
const FOCUS_COLS = ['name', 'group', 'pop', 'loyalty', 'happiness', 'growth']
const TONE_COLOR = { good: 'var(--up)', watch: 'var(--gold)', poor: 'var(--down)', neutral: 'var(--azure)' }

function toneColor(v) { return TONE_COLOR[gaugeTone(v)] || TONE_COLOR.neutral }
function clamp(v) { return Math.max(0, Math.min(100, v)) }

export default {
  name: 'ProvinceGrid',
  components: { Activity, AlertTriangle, Check, Flag, MapPinned, Pencil, Plus, Search, Sparkles, Users, Zap },
  setup() {
    const store = useFormStore()
    const civ = useCivilizationStore()
    const ui = useUiStore()

    const search = ref('')
    const activeIndex = ref(0)
    const flash = ref(null)
    const cellRefs = {}

    const rows = computed(() => civ.provinceRows)
    const regionNames = computed(() => civ.configuredGroups)

    const displayRows = computed(() => {
      const q = search.value.trim().toLowerCase()
      if (!q) return rows.value
      return rows.value.filter((r) => r.name.toLowerCase().includes(q))
    })

    const groupColorMap = computed(() => {
      const map = {}
      regionNames.value.forEach((name, i) => { map[name] = REGION_PALETTE[i % REGION_PALETTE.length] })
      return map
    })
    function groupColor(group) { return groupColorMap.value[group] || 'var(--ink-3)' }

    function healthOf(row) { return Math.round(civicHealthScore(row)) }

    function statusOf(row) {
      const s = row.status || {}
      if (s.is_national_capital) return { tone: 'cap', label: 'Capital' }
      if (s.is_regional_capital) return { tone: 'reg', label: 'Reg. Cap' }
      if (s.is_conquered) return { tone: 'con', label: 'Conquered' }
      if (s.is_founded) return { tone: 'def', label: 'Founded' }
      if (s.is_joined) return { tone: 'def', label: 'Joined' }
      return { tone: 'def', label: '—' }
    }

    // ── Live rollups ──
    const rollup = computed(() => {
      const list = rows.value
      const n = list.length || 1
      const population = list.reduce((a, p) => a + p.population, 0)
      const yld = Object.values(civ.yieldTotals).reduce((a, b) => a + b, 0)
      const loyalty = Math.round(list.reduce((a, p) => a + p.loyalty, 0) / n)
      const health = Math.round(list.reduce((a, p) => a + civicHealthScore(p), 0) / n)
      const unassigned = list.filter((p) => !p.group || !regionNames.value.includes(p.group)).length
      return { population, yield: yld, loyalty, health, unassigned }
    })

    // ── Active inspector ──
    const active = computed(() => rows.value.find((r) => r.index === activeIndex.value) || rows.value[0] || null)
    const activeYields = computed(() => {
      const a = active.value
      if (!a) return []
      const max = Math.max(1, ...PROVINCE_YIELD_KEYS.map((k) => a.yields[k]))
      return PROVINCE_YIELD_KEYS.map((k) => ({
        key: k, value: a.yields[k], color: YIELD_COLORS[k] || 'var(--gold)', bar: (a.yields[k] / max) * 100,
      }))
    })
    const popShare = computed(() => {
      const total = civ.totalProvincialPopulation || 1
      return active.value ? (active.value.provincialPopulation / total) * 100 : 0
    })
    const yieldShare = computed(() => {
      const total = rollup.value.yield || 1
      return active.value ? (active.value.totalYield / total) * 100 : 0
    })
    const activeReligion = computed(() => {
      const rel = active.value?.religions || []
      const top = [...rel].filter((r) => r.followers > 0).sort((a, b) => b.followers - a.followers)[0]
      return top?.name || active.value?.dominantReligion || 'None'
    })

    // ── Editing ──
    function commit(index, key, raw) {
      if (key === 'name') {
        store.setValueAtPath(`provinces[${index}].name`, raw)
      } else if (key === 'group') {
        store.assignProvinceToGroup(index, raw)
      } else {
        const col = NUM_COLS.find((c) => c.key === key)
        if (!col) return
        const num = raw === '' ? 0 : Math.max(0, Math.min(col.max, Number(raw) || 0))
        store.setValueAtPath(`provinces[${index}].${col.path}`, num)
      }
      activeIndex.value = index
      flash.value = `${index}-${key}`
      setTimeout(() => { if (flash.value === `${index}-${key}`) flash.value = null }, 600)
    }

    function addProvince() {
      store.addArrayItem('provinces')
      nextTick(() => {
        const last = rows.value[rows.value.length - 1]
        if (last) { activeIndex.value = last.index; focusCell(displayRows.value.length - 1, 'name') }
      })
    }

    function openWizard() { ui.openWizardModal() }

    // ── Keyboard navigation (no scroll jump) ──
    function registerRef(r, key, el) {
      if (el) cellRefs[`${r}-${key}`] = el
      else delete cellRefs[`${r}-${key}`]
    }
    function focusCell(r, key) {
      const el = cellRefs[`${r}-${key}`]
      if (el) {
        el.focus({ preventScroll: true })
        if (el.select) el.select()
        const row = displayRows.value[r]
        if (row) activeIndex.value = row.index
      }
    }
    function onKey(e, r, key) {
      const fIdx = FOCUS_COLS.indexOf(key)
      const lastRow = displayRows.value.length - 1
      let nr = r
      let nKey = key
      let handled = true
      const atStart = e.target.selectionStart === 0
      const atEnd = e.target.selectionStart === (e.target.value || '').length

      if (e.key === 'ArrowDown' || e.key === 'Enter') nr = Math.min(lastRow, r + 1)
      else if (e.key === 'ArrowUp') nr = Math.max(0, r - 1)
      else if (e.key === 'Tab' && !e.shiftKey) {
        if (fIdx < FOCUS_COLS.length - 1) nKey = FOCUS_COLS[fIdx + 1]
        else { nKey = FOCUS_COLS[0]; nr = Math.min(lastRow, r + 1) }
      } else if (e.key === 'Tab' && e.shiftKey) {
        if (fIdx > 0) nKey = FOCUS_COLS[fIdx - 1]
        else { nKey = FOCUS_COLS[FOCUS_COLS.length - 1]; nr = Math.max(0, r - 1) }
      } else if (e.key === 'ArrowLeft' && (atStart || e.target.tagName === 'SELECT')) {
        nKey = FOCUS_COLS[Math.max(0, fIdx - 1)]
      } else if (e.key === 'ArrowRight' && (atEnd || e.target.tagName === 'SELECT')) {
        nKey = FOCUS_COLS[Math.min(FOCUS_COLS.length - 1, fIdx + 1)]
      } else handled = false

      if (handled) { e.preventDefault(); focusCell(nr, nKey) }
    }

    return {
      COLS, NUM_COLS, AlertTriangle, Check,
      search, activeIndex, flash, rows, regionNames, displayRows,
      rollup, active, activeYields, popShare, yieldShare, activeReligion,
      groupColor, healthOf, statusOf, toneColor, clamp,
      commit, addProvince, openWizard, registerRef, onKey,
      formatNumber, formatCompactNumber,
    }
  },
}
</script>

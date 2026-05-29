<template>
  <div v-if="rows.length" class="baseline-cards-section religion-pop-section">
    <div class="religion-pop-table-wrap">
      <table class="religion-pop-table">
        <thead>
          <tr>
            <th>Religion</th>
            <th class="num">Raw</th>
            <th class="num">Scaled population</th>
            <th class="num">Share</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.name" :class="{ 'is-ambient': row.source === 'globalization' }">
            <td class="religion-name">{{ row.name }}</td>
            <td class="num">{{ row.rawFollowers === null ? '—' : formatNumber(row.rawFollowers) }}</td>
            <td class="num">{{ formatNumber(row.scaledPopulation) }}</td>
            <td class="num">{{ formatPercent(row.share) }}</td>
            <td>
              <span class="source-tag" :class="row.source === 'listed' ? 'source-tag--listed' : 'source-tag--ambient'">
                {{ row.source === 'listed' ? 'Listed' : 'Spread' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useFormStore } from '../stores/formStore'
import { calcProvincialPopulation } from '../utils/calculatedFields'
import {
  buildEmpireReligionTotals,
  buildScaledFollowerMap,
  provinceReligionAffinity,
  applyReligionGlobalization,
} from '../domain/elections/features/religionDistribution'
import { num, norm, clamp01 } from '../domain/elections/normalization/numbers'
import { NORMALIZATION_MAX } from '../domain/elections/normalization/dataStats'

const MIN_DIST = 3
const MAX_DIST = 15
const DIST_EXP = 1.8

function connectednessIndexOf(province) {
  const distances = (Array.isArray(province?.closest_provinces) ? province.closest_provinces : [])
    .map((entry) => Number(entry?.distance))
    .filter((d) => Number.isFinite(d) && d > 0)
  if (!distances.length) return 0.35
  const avg = distances.reduce((s, d) => s + d, 0) / distances.length
  return clamp01(1 - Math.pow((avg - MIN_DIST) / (MAX_DIST - MIN_DIST), DIST_EXP))
}

function originalCountry(province) {
  return String(province?.original_country || '').trim()
}

function foreignOriginIndexOf(province, country) {
  const empireName = String(country?.basic_info?.name || '').trim().toLowerCase()
  const origin = originalCountry(province).toLowerCase()
  if (!origin) return province?.is_joined || province?.is_conquered ? 1 : 0
  if (!empireName) return province?.is_joined || province?.is_conquered ? 1 : 0
  return origin === empireName ? 0 : 1
}

export default {
  name: 'ProvinceReligionPopulations',
  props: {
    provinceIndex: { type: Number, required: true },
  },
  setup(props) {
    const store = useFormStore()
    const data = computed(() => store.currentData)
    const province = computed(() => data.value?.provinces?.[props.provinceIndex] || null)

    const scaledProvincePop = computed(() => {
      const pop = num(province.value?.population)
      if (pop <= 0) return 0
      return Math.max(1, num(calcProvincialPopulation(pop, props.provinceIndex), 1))
    })

    const empireTotals = computed(() => buildEmpireReligionTotals(data.value))

    const affinity = computed(() => {
      const p = province.value
      if (!p) return 0
      const civPop = Math.max(1, num(p.population, 1))
      const faithIndex = norm(num(p.yields?.faith) / civPop, NORMALIZATION_MAX.faith_per_capita)
      return provinceReligionAffinity({
        connectednessIndex: connectednessIndexOf(p),
        faithIndex,
        foreignOriginIndex: foreignOriginIndexOf(p, data.value?.country || {}),
      })
    })

    const rows = computed(() => {
      const p = province.value
      if (!p) return []
      const listedBefore = buildScaledFollowerMap(p, props.provinceIndex)
      const listedNames = new Set(Object.keys(listedBefore))
      const merged = { ...listedBefore }
      applyReligionGlobalization(merged, empireTotals.value, affinity.value)
      const denom = scaledProvincePop.value || 1
      const rawByName = Array.isArray(p.religions)
        ? p.religions.reduce((acc, r) => {
            const name = String(r?.name || '').trim()
            if (!name) return acc
            acc[name] = num(acc[name]) + num(r?.followers)
            return acc
          }, {})
        : {}
      return Object.entries(merged)
        .map(([name, scaled]) => ({
          name,
          rawFollowers: listedNames.has(name) ? num(rawByName[name]) : null,
          scaledPopulation: scaled,
          share: clamp01(scaled / denom),
          source: listedNames.has(name) ? 'listed' : 'globalization',
        }))
        .sort((a, b) => b.scaledPopulation - a.scaledPopulation)
    })

    function formatNumber(value) {
      const n = Number(value)
      if (!Number.isFinite(n)) return '—'
      if (n >= 1000) return Math.round(n).toLocaleString()
      if (n >= 1) return n.toFixed(0)
      return n.toFixed(2)
    }

    function formatPercent(value) {
      const n = Number(value)
      if (!Number.isFinite(n)) return '—'
      return (n * 100).toFixed(n < 0.01 ? 3 : 2) + '%'
    }

    return { rows, scaledProvincePop, affinity, formatNumber, formatPercent }
  },
}
</script>

<style scoped>
.religion-pop-section {
  /* inherits .baseline-cards-section spacing/dividers */
}
.religion-pop-sub {
  margin-top: 4px;
  margin-bottom: 10px;
  color: var(--text-secondary);
  font-size: 0.78rem;
  letter-spacing: 0.02em;
}
.religion-pop-table-wrap {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-surface);
}
.religion-pop-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.religion-pop-table th,
.religion-pop-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
}
.religion-pop-table thead th {
  background: var(--bg-surface-raised);
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.religion-pop-table tbody tr:last-child td {
  border-bottom: none;
}
.religion-pop-table tbody tr:hover {
  background: var(--bg-surface-raised);
}
.religion-pop-table th.num,
.religion-pop-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.religion-pop-table .religion-name {
  color: var(--text-primary);
  font-weight: 600;
}
.religion-pop-table tr.is-ambient .religion-name {
  color: var(--text-secondary);
  font-weight: 500;
}
.source-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.source-tag--listed {
  background: var(--accent-glow);
  color: var(--accent);
  border: 1px solid var(--accent-dim);
}
.source-tag--ambient {
  background: var(--bg-surface-overlay);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
}
</style>

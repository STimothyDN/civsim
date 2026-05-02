export const PROVINCE_YIELD_KEYS = ['amenities', 'food', 'production', 'gold', 'culture', 'science', 'faith']
export const COUNTY_YIELD_KEYS = [...PROVINCE_YIELD_KEYS, 'tourism']

export const PROVINCE_VISUALIZATION_MODES = [
  { id: 'population-representation', label: 'Population vs Representation', category: 'Decision Desk' },
  { id: 'civic-risk', label: 'Civic Risk Board', category: 'Decision Desk' },
  { id: 'economic-profile', label: 'Economic Profile', category: 'Economy' },
  { id: 'yield-efficiency', label: 'Yield Efficiency', category: 'Economy' },
  { id: 'county-readiness', label: 'County Readiness', category: 'County Data' },
  { id: 'connectivity-frontier', label: 'Connectivity & Frontier', category: 'Geography' },
  { id: 'origin-blocs', label: 'Origin Blocs', category: 'Political Geography' },
  { id: 'religion-mix', label: 'Religion Mix', category: 'Political Geography' },
]

export const REGIONAL_VISUALIZATION_MODES = [
  { id: 'population-representation', label: 'Population vs Representation', category: 'Decision Desk' },
  { id: 'regional-risk', label: 'Regional Risk Board', category: 'Decision Desk' },
  { id: 'regional-economy', label: 'Regional Economy', category: 'Economy' },
  { id: 'county-readiness', label: 'County Readiness', category: 'County Data' },
  { id: 'connectivity-frontier', label: 'Connectivity & Frontier', category: 'Geography' },
  { id: 'origin-blocs', label: 'Origin Blocs', category: 'Political Geography' },
  { id: 'religion-mix', label: 'Religion Mix', category: 'Political Geography' },
]

const CHART_COLORS = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc949',
  '#af7aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ac',
  '#d4a843',
  '#2dd4bf',
]

const AXIS_COLOR = '#a9a39a'
const TEXT_COLOR = '#f1eee8'
const GRID_COLOR = '#30333f'

const STATUS_FIELDS = [
  ['is_national_capital', 'National Capital'],
  ['is_regional_capital', 'Regional Capital'],
  ['is_founded', 'Founded'],
  ['is_joined', 'Joined'],
  ['is_conquered', 'Conquered'],
]

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function createNumericMap(source, keys) {
  return keys.reduce((result, key) => {
    result[key] = toNumber(source?.[key])
    return result
  }, {})
}

function increment(map, rawKey, amount = 1) {
  const key = String(rawKey || 'Unspecified').trim() || 'Unspecified'
  map[key] = (map[key] || 0) + amount
}

function hasFilledValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function hasCountyDetails(county) {
  const hasNamedTerrain = String(county?.terrain || '').trim().length > 0
  const hasNamedImprovement = String(county?.improvement?.name || '').trim().length > 0
  const hasEnabledFeature = Object.values(county?.features || {}).some(Boolean)
  const hasEnabledBuilding = Object.values(county?.improvement?.buildings || {}).some(Boolean)
  const hasYield = Object.values(county?.yields || {}).some((value) => hasFilledValue(value) && toNumber(value) !== 0)

  return Boolean(
    hasNamedTerrain ||
      hasNamedImprovement ||
      hasEnabledFeature ||
      hasEnabledBuilding ||
      hasYield ||
      hasFilledValue(county?.resource) ||
      hasFilledValue(county?.distance_from_center) ||
      (hasFilledValue(county?.citizens_working) && toNumber(county.citizens_working) !== 0) ||
      hasFilledValue(county?.appeal) ||
      county?.river === true ||
      county?.has_railroad === true
  )
}

function summarizeCounties(counties) {
  const summary = {
    count: 0,
    detailCount: 0,
    yields: createNumericMap(null, COUNTY_YIELD_KEYS),
    terrainCounts: {},
    featureCounts: {},
    improvementCounts: {},
    buildingCounts: {},
    resourceCounts: {},
    citizensWorking: 0,
    appealTotal: 0,
    appealCount: 0,
    riverCount: 0,
    railroadCount: 0,
  }

  if (!Array.isArray(counties)) return summary

  summary.count = counties.length
  counties.forEach((county) => {
    if (hasCountyDetails(county)) summary.detailCount += 1

    COUNTY_YIELD_KEYS.forEach((key) => {
      summary.yields[key] += toNumber(county.yields?.[key])
    })

    increment(summary.terrainCounts, county.terrain)
    if (county.resource) increment(summary.resourceCounts, county.resource)
    if (county.improvement?.name) increment(summary.improvementCounts, county.improvement.name)

    Object.entries(county.features || {}).forEach(([feature, enabled]) => {
      if (enabled) increment(summary.featureCounts, feature)
    })

    Object.entries(county.improvement?.buildings || {}).forEach(([building, enabled]) => {
      if (enabled) increment(summary.buildingCounts, building)
    })

    summary.citizensWorking += toNumber(county.citizens_working)
    if (county.appeal !== null && county.appeal !== undefined && county.appeal !== '') {
      summary.appealTotal += toNumber(county.appeal)
      summary.appealCount += 1
    }
    if (county.river) summary.riverCount += 1
    if (county.has_railroad) summary.railroadCount += 1
  })

  return summary
}

function normalizeClosestProvinceEntries(province) {
  return (Array.isArray(province?.closest_provinces) ? province.closest_provinces : [])
    .map((entry) => ({
      provinceName: String(entry?.province_name || entry?.name || '').trim(),
      distance: toNumber(entry?.distance),
    }))
    .filter((entry) => entry.provinceName && entry.distance > 0)
    .sort((a, b) => a.distance - b.distance || a.provinceName.localeCompare(b.provinceName))
}

function average(values) {
  const usable = values.filter((value) => Number.isFinite(value) && value > 0)
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0
}

export function civicRiskScore(row) {
  const loyaltyRisk = Math.max(0, 100 - row.loyalty)
  const happinessRisk = Math.max(0, 100 - row.happinessPercentage)
  const growthRisk = Math.max(0, 100 - row.growthPercentage)
  const amenityRisk = Math.max(0, -row.netAmenities) * 8
  const foodRisk = Math.max(0, -row.netFood) * 5
  const statusRisk =
    row.status.is_conquered ? 14 :
    row.status.is_joined ? 7 :
    0
  const capitalStability =
    (row.status.is_national_capital ? 7 : 0) +
    (row.status.is_regional_capital ? 4 : 0) +
    (row.status.is_founded ? 3 : 0)

  return Math.max(0, Math.min(100, loyaltyRisk * 0.34 + happinessRisk * 0.24 + growthRisk * 0.18 + amenityRisk + foodRisk + statusRisk - capitalStability))
}

export function countyReadinessScore(row) {
  if (!row.countyCount) return 0

  const detailShare = row.countyDetailCount / row.countyCount
  const workerShare = Math.min(1, row.citizensWorking / Math.max(1, row.countyCount * 2))
  const railShare = row.railroadCount / row.countyCount
  const riverShare = row.riverCount / row.countyCount
  return Math.max(0, Math.min(100, (detailShare * 0.45 + workerShare * 0.25 + railShare * 0.18 + riverShare * 0.12) * 100))
}

export function buildProvinceComparisonRows(data, provinceCalcs = []) {
  const provinces = Array.isArray(data?.provinces) ? data.provinces : []

  return provinces.map((province, index) => {
    const calc = provinceCalcs[index] || {}
    const countySummary = summarizeCounties(province.counties)
    const closestProvinces = normalizeClosestProvinceEntries(province)
    const yields = createNumericMap(province.yields, PROVINCE_YIELD_KEYS)
    const provincialPopulation = toNumber(calc.provincialPopulation ?? province.provincial_population)
    const assemblypeople = toNumber(calc.assemblypeople ?? province.assemblypeople)
    const prelates = toNumber(calc.prelates ?? province.prelates)

    return {
      index,
      name: province.name || `Province ${index + 1}`,
      group: province.group || 'Unassigned',
      population: toNumber(province.population),
      loyalty: toNumber(province.loyalty),
      growthPercentage: toNumber(province.growth_percentage),
      happinessPercentage: toNumber(province.happiness_percentage),
      housing: toNumber(province.housing),
      netAmenities: toNumber(province.net_amenities),
      netFood: toNumber(province.net_food),
      yields,
      totalYield: PROVINCE_YIELD_KEYS.reduce((sum, key) => sum + yields[key], 0),
      religions: Array.isArray(province.religions)
        ? province.religions.map((religion) => ({
            name: religion.name || 'Unspecified',
            followers: toNumber(religion.followers),
          }))
        : [],
      provincialPopulation,
      assemblypeople,
      prelates,
      dominantReligion: calc.dominantReligion || province.dominant_religion || 'None',
      originalCountry: String(province.original_country || '').trim() || 'Unspecified',
      closestProvinces,
      nearestProvinceName: closestProvinces[0]?.provinceName || 'None',
      nearestProvinceDistance: closestProvinces[0]?.distance || 0,
      averageClosestProvinceDistance: average(closestProvinces.map((entry) => entry.distance)),
      status: STATUS_FIELDS.reduce((result, [key]) => {
        result[key] = province[key] ? 1 : 0
        return result
      }, {}),
      countyCount: countySummary.count,
      countyDetailCount: countySummary.detailCount,
      countyYields: countySummary.yields,
      totalCountyYield: COUNTY_YIELD_KEYS.reduce((sum, key) => sum + countySummary.yields[key], 0),
      terrainCounts: countySummary.terrainCounts,
      featureCounts: countySummary.featureCounts,
      improvementCounts: countySummary.improvementCounts,
      buildingCounts: countySummary.buildingCounts,
      resourceCounts: countySummary.resourceCounts,
      citizensWorking: countySummary.citizensWorking,
      averageAppeal: countySummary.appealCount ? countySummary.appealTotal / countySummary.appealCount : 0,
      riverCount: countySummary.riverCount,
      railroadCount: countySummary.railroadCount,
    }
  })
}

export function formatNumber(value) {
  return toNumber(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export function formatCompactNumber(value) {
  return toNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: 1,
    notation: 'compact',
  })
}

function formatLabel(rawKey) {
  return String(rawKey || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function truncateLabel(value, length = 16) {
  const label = String(value ?? '')
  return label.length > length ? `${label.slice(0, length - 1)}...` : label
}

function dataZoomFor(rows) {
  if (rows.length <= 10) return []
  return [
    { type: 'inside', xAxisIndex: 0 },
    {
      type: 'slider',
      xAxisIndex: 0,
      height: 18,
      bottom: 6,
      borderColor: GRID_COLOR,
      textStyle: { color: AXIS_COLOR },
    },
  ]
}

function baseOption(rows) {
  return {
    color: CHART_COLORS,
    backgroundColor: 'transparent',
    animationDuration: 450,
    textStyle: { color: TEXT_COLOR, fontFamily: 'Inter, system-ui, sans-serif' },
    tooltip: { trigger: 'axis', confine: true, backgroundColor: '#181a24', borderColor: GRID_COLOR, textStyle: { color: TEXT_COLOR } },
    legend: { type: 'scroll', top: 0, textStyle: { color: AXIS_COLOR } },
    grid: { left: 56, right: 28, top: 58, bottom: rows.length > 10 ? 58 : 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: rows.map((row) => row.name),
      axisLabel: { color: AXIS_COLOR, rotate: rows.length > 6 ? 30 : 0, formatter: (value) => truncateLabel(value) },
      axisLine: { lineStyle: { color: GRID_COLOR } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: AXIS_COLOR, formatter: (value) => formatCompactNumber(value) },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    dataZoom: dataZoomFor(rows),
  }
}

function barSeries(name, data, options = {}) {
  return {
    name,
    type: 'bar',
    data,
    barMaxWidth: 34,
    itemStyle: { borderRadius: [3, 3, 0, 0] },
    emphasis: { focus: 'series' },
    ...options,
  }
}

function lineSeries(name, data, options = {}) {
  return {
    name,
    type: 'line',
    data,
    smooth: true,
    symbolSize: 7,
    emphasis: { focus: 'series' },
    ...options,
  }
}

function topCategories(rows, selectors, limit = 8) {
  const totals = {}
  rows.forEach((row) => {
    selectors.forEach((selector) => {
      Object.entries(selector(row) || {}).forEach(([category, value]) => {
        totals[category] = (totals[category] || 0) + toNumber(value)
      })
    })
  })

  return Object.entries(totals)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category)
}

function hasDetailedCountyRows(rows) {
  return rows.some((row) => row.countyDetailCount > 0)
}

function emptyOption(text, subtext = '') {
  return {
    backgroundColor: 'transparent',
    title: {
      text,
      subtext,
      left: 'center',
      top: 'center',
      textStyle: { color: AXIS_COLOR, fontSize: 16, fontWeight: 700 },
      subtextStyle: { color: AXIS_COLOR, fontSize: 12, lineHeight: 18 },
    },
  }
}

function countyPlaceholderOption() {
  return emptyOption('County details are not populated yet', 'Province-level charts are available for this template.')
}

function stackedCategoryOption(rows, categories, valueForCategory, options = {}) {
  if (!categories.length) return emptyOption('No matching categories')

  const option = baseOption(rows)
  return {
    ...option,
    tooltip: { ...option.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    yAxis: { ...option.yAxis, name: options.yAxisName || 'Count' },
    series: categories.map((category) =>
      barSeries(category, rows.map((row) => valueForCategory(row, category)), { stack: 'total' })
    ),
  }
}

function mapSeriesForKeys(rows, keys, source, stack = null) {
  return keys.map((key) =>
    barSeries(
      formatLabel(key),
      rows.map((row) => source(row)[key]),
      stack ? { stack } : {}
    )
  )
}

function compactGridOption({ xAxis, yAxis, series, tooltip = {}, grid = {}, legend = {}, dataZoom = [] }) {
  return {
    color: CHART_COLORS,
    backgroundColor: 'transparent',
    animationDuration: 420,
    textStyle: { color: TEXT_COLOR, fontFamily: 'Inter, system-ui, sans-serif' },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: '#151821',
      borderColor: GRID_COLOR,
      textStyle: { color: TEXT_COLOR },
      ...tooltip,
    },
    legend: { type: 'scroll', top: 0, textStyle: { color: AXIS_COLOR }, ...legend },
    grid: { left: 64, right: 30, top: 58, bottom: 42, containLabel: true, ...grid },
    xAxis,
    yAxis,
    dataZoom,
    series,
  }
}

function populationRepresentationOption(rows) {
  const maxPrelates = Math.max(1, ...rows.map((row) => row.prelates))

  return {
    color: CHART_COLORS,
    backgroundColor: 'transparent',
    textStyle: { color: TEXT_COLOR, fontFamily: 'Inter, system-ui, sans-serif' },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#151821',
      borderColor: GRID_COLOR,
      textStyle: { color: TEXT_COLOR },
      formatter(params) {
        const row = params.data.row
        return [
          `<strong>${row.name}</strong>`,
          `Provincial Pop: ${formatNumber(row.provincialPopulation)}`,
          `Assemblypeople: ${formatNumber(row.assemblypeople)}`,
          `Prelates: ${formatNumber(row.prelates)}`,
          `Region: ${row.group}`,
        ].join('<br>')
      },
    },
    grid: { left: 70, right: 28, top: 38, bottom: 54, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Provincial Population',
      axisLabel: { color: AXIS_COLOR, formatter: (value) => formatCompactNumber(value) },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    yAxis: {
      type: 'value',
      name: 'Assemblypeople',
      axisLabel: { color: AXIS_COLOR },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    series: [
      {
        name: 'Province',
        type: 'scatter',
        data: rows.map((row) => ({
          value: [row.provincialPopulation, row.assemblypeople],
          row,
        })),
        symbolSize(value, params) {
          return 11 + (params.data.row.prelates / maxPrelates) * 24
        },
        itemStyle: { opacity: 0.86, borderColor: 'rgba(255,255,255,0.22)', borderWidth: 1 },
        label: {
          show: rows.length <= 18,
          formatter: (params) => params.data.row.name,
          color: AXIS_COLOR,
        },
        emphasis: { focus: 'self', label: { show: true, color: TEXT_COLOR } },
      },
    ],
  }
}

function civicRiskOption(rows, label = 'Province') {
  const ranked = [...rows].sort((a, b) => civicRiskScore(b) - civicRiskScore(a))
  return compactGridOption({
    tooltip: {
      axisPointer: { type: 'shadow' },
      formatter(params) {
        const item = params[0]
        const row = item.data.row
        return [
          `<strong>${row.name}</strong>`,
          `Risk Score: ${formatNumber(item.value)}`,
          `Loyalty: ${formatNumber(row.loyalty)}`,
          `Happiness: ${formatNumber(row.happinessPercentage)}%`,
          `Growth: ${formatNumber(row.growthPercentage)}%`,
        ].join('<br>')
      },
    },
    grid: { left: 148, right: 28, top: 28, bottom: 30 },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: AXIS_COLOR, formatter: '{value}' },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    yAxis: {
      type: 'category',
      data: ranked.map((row) => row.name),
      axisLabel: { color: AXIS_COLOR, formatter: (value) => truncateLabel(value, 22) },
      axisLine: { lineStyle: { color: GRID_COLOR } },
      axisTick: { show: false },
    },
    series: [
      {
        name: `${label} Risk`,
        type: 'bar',
        data: ranked.map((row) => ({ value: civicRiskScore(row), row })),
        barMaxWidth: 22,
        itemStyle: {
          borderRadius: [0, 3, 3, 0],
          color(params) {
            const value = params.value
            if (value >= 65) return '#e15759'
            if (value >= 38) return '#f28e2b'
            return '#59a14f'
          },
        },
      },
    ],
  })
}

function economicProfileOption(rows, label = 'Province') {
  const ranked = [...rows].sort((a, b) => b.totalYield - a.totalYield)
  return compactGridOption({
    tooltip: { axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: ranked.map((row) => row.name),
      axisLabel: { color: AXIS_COLOR, rotate: ranked.length > 6 ? 30 : 0, formatter: (value) => truncateLabel(value) },
      axisLine: { lineStyle: { color: GRID_COLOR } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: `${label} Yield`,
      axisLabel: { color: AXIS_COLOR, formatter: (value) => formatCompactNumber(value) },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    dataZoom: dataZoomFor(ranked),
    series: mapSeriesForKeys(ranked, PROVINCE_YIELD_KEYS, (row) => row.yields, `${label.toLowerCase()}-economy`),
  })
}

function countyReadinessOption(rows, label = 'Province') {
  if (!rows.some((row) => row.countyCount > 0)) return countyPlaceholderOption()

  const ranked = [...rows].sort((a, b) => countyReadinessScore(b) - countyReadinessScore(a))
  const percent = (value) => Math.max(0, Math.min(100, value))
  return compactGridOption({
    tooltip: { axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: ranked.map((row) => row.name),
      axisLabel: { color: AXIS_COLOR, rotate: ranked.length > 6 ? 30 : 0, formatter: (value) => truncateLabel(value) },
      axisLine: { lineStyle: { color: GRID_COLOR } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'Share',
      max: 100,
      axisLabel: { color: AXIS_COLOR, formatter: '{value}%' },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    dataZoom: dataZoomFor(ranked),
    series: [
      barSeries('County Records', ranked.map((row) => percent(row.countyCount ? (row.countyDetailCount / row.countyCount) * 100 : 0))),
      barSeries('Citizen Coverage', ranked.map((row) => percent(row.countyCount ? (row.citizensWorking / Math.max(1, row.countyCount * 2)) * 100 : 0))),
      barSeries('Rail Coverage', ranked.map((row) => percent(row.countyCount ? (row.railroadCount / row.countyCount) * 100 : 0))),
      lineSeries(`${label} Readiness`, ranked.map((row) => countyReadinessScore(row)), { symbolSize: 6 }),
    ],
  })
}

function connectivityFrontierOption(rows, label = 'Province') {
  const rowsWithDistance = rows.filter((row) => row.averageClosestProvinceDistance > 0)
  if (!rowsWithDistance.length) return emptyOption('Closest province data is not populated yet', 'Add nearest provinces to view frontier and connectivity patterns.')

  const maxYield = Math.max(1, ...rowsWithDistance.map((row) => row.totalYield))

  return {
    color: CHART_COLORS,
    backgroundColor: 'transparent',
    textStyle: { color: TEXT_COLOR, fontFamily: 'Inter, system-ui, sans-serif' },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#151821',
      borderColor: GRID_COLOR,
      textStyle: { color: TEXT_COLOR },
      formatter(params) {
        const row = params.data.row
        return [
          `<strong>${row.name}</strong>`,
          `Average nearest distance: ${formatNumber(row.averageClosestProvinceDistance)}`,
          `Nearest: ${row.nearestProvinceName || 'None'}${row.nearestProvinceDistance ? ` (${formatNumber(row.nearestProvinceDistance)})` : ''}`,
          `Provincial Pop: ${formatNumber(row.provincialPopulation)}`,
          `Total Yield: ${formatNumber(row.totalYield)}`,
        ].join('<br>')
      },
    },
    grid: { left: 76, right: 28, top: 38, bottom: 54, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Avg. nearest distance',
      axisLabel: { color: AXIS_COLOR },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    yAxis: {
      type: 'value',
      name: 'Provincial Pop',
      axisLabel: { color: AXIS_COLOR, formatter: (value) => formatCompactNumber(value) },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    series: [
      {
        name: `${label} Connectivity`,
        type: 'scatter',
        data: rowsWithDistance.map((row) => ({
          value: [row.averageClosestProvinceDistance, row.provincialPopulation],
          row,
        })),
        symbolSize(value, params) {
          return 10 + (params.data.row.totalYield / maxYield) * 26
        },
        itemStyle: { opacity: 0.86, borderColor: 'rgba(255,255,255,0.22)', borderWidth: 1 },
        label: { show: rowsWithDistance.length <= 18, formatter: (params) => params.data.row.name, color: AXIS_COLOR },
        emphasis: { focus: 'self', label: { show: true, color: TEXT_COLOR } },
      },
    ],
  }
}

function originBlocOption(rows) {
  const totals = {}
  rows.forEach((row) => {
    const countryEntries = row.originalCountries && Object.keys(row.originalCountries).length
      ? Object.entries(row.originalCountries)
      : [[row.originalCountry || 'Unspecified', row.provinceCount || 1]]
    const entryTotal = countryEntries.reduce((sum, [, count]) => sum + toNumber(count), 0) || 1

    countryEntries.forEach(([country, count]) => {
      const share = toNumber(count) / entryTotal
      if (!totals[country]) totals[country] = { name: country, provinceCount: 0, provincialPopulation: 0 }
      totals[country].provinceCount += toNumber(count)
      totals[country].provincialPopulation += row.provincialPopulation * share
    })
  })
  const blocs = Object.values(totals).sort((a, b) => b.provincialPopulation - a.provincialPopulation)
  if (!blocs.length) return emptyOption('No origin country data selected')

  return compactGridOption({
    tooltip: { axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: blocs.map((bloc) => bloc.name),
      axisLabel: { color: AXIS_COLOR, rotate: blocs.length > 4 ? 24 : 0, formatter: (value) => truncateLabel(value, 18) },
      axisLine: { lineStyle: { color: GRID_COLOR } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Provincial Pop',
        axisLabel: { color: AXIS_COLOR, formatter: (value) => formatCompactNumber(value) },
        splitLine: { lineStyle: { color: GRID_COLOR } },
      },
      { type: 'value', name: 'Provinces', axisLabel: { color: AXIS_COLOR }, splitLine: { show: false } },
    ],
    series: [
      barSeries('Provincial Population', blocs.map((bloc) => bloc.provincialPopulation)),
      lineSeries('Provinces', blocs.map((bloc) => bloc.provinceCount), { yAxisIndex: 1 }),
    ],
  })
}

function calculatedPopulationOption(rows) {
  const option = baseOption(rows)
  return {
    ...option,
    yAxis: [
      {
        type: 'value',
        name: 'Provincial Pop',
        axisLabel: { color: AXIS_COLOR, formatter: (value) => formatCompactNumber(value) },
        splitLine: { lineStyle: { color: GRID_COLOR } },
      },
      { type: 'value', name: 'Seats', axisLabel: { color: AXIS_COLOR }, splitLine: { show: false } },
    ],
    series: [
      barSeries('Provincial Population', rows.map((row) => row.provincialPopulation)),
      lineSeries('Assemblypeople', rows.map((row) => row.assemblypeople), { yAxisIndex: 1 }),
      lineSeries('Prelates', rows.map((row) => row.prelates), { yAxisIndex: 1 }),
    ],
  }
}

function civicHealthOption(rows) {
  const option = baseOption(rows)
  return {
    ...option,
    yAxis: [
      { ...option.yAxis, name: 'Value' },
      {
        type: 'value',
        name: 'Percent',
        min: 0,
        axisLabel: { color: AXIS_COLOR, formatter: '{value}%' },
        splitLine: { show: false },
      },
    ],
    series: [
      barSeries('Population', rows.map((row) => row.population)),
      barSeries('Housing', rows.map((row) => row.housing)),
      barSeries('Net Amenities', rows.map((row) => row.netAmenities)),
      barSeries('Net Food', rows.map((row) => row.netFood)),
      lineSeries('Loyalty %', rows.map((row) => row.loyalty), { yAxisIndex: 1 }),
      lineSeries('Growth %', rows.map((row) => row.growthPercentage), { yAxisIndex: 1 }),
      lineSeries('Happiness %', rows.map((row) => row.happinessPercentage), { yAxisIndex: 1 }),
    ],
  }
}

function provinceYieldOption(rows) {
  const option = baseOption(rows)
  return {
    ...option,
    tooltip: { ...option.tooltip, axisPointer: { type: 'shadow' } },
    yAxis: { ...option.yAxis, name: 'Yield' },
    series: mapSeriesForKeys(rows, PROVINCE_YIELD_KEYS, (row) => row.yields, 'province-yields'),
  }
}

function yieldRadarOption(rows) {
  const limitedRows = [...rows].sort((a, b) => b.totalYield - a.totalYield).slice(0, 8)
  const maxValue = Math.max(1, ...limitedRows.flatMap((row) => PROVINCE_YIELD_KEYS.map((key) => row.yields[key])))

  return {
    color: CHART_COLORS,
    backgroundColor: 'transparent',
    textStyle: { color: TEXT_COLOR, fontFamily: 'Inter, system-ui, sans-serif' },
    tooltip: { trigger: 'item', confine: true, backgroundColor: '#181a24', borderColor: GRID_COLOR, textStyle: { color: TEXT_COLOR } },
    legend: { type: 'scroll', top: 0, textStyle: { color: AXIS_COLOR } },
    radar: {
      center: ['50%', '56%'],
      radius: '68%',
      indicator: PROVINCE_YIELD_KEYS.map((key) => ({ name: formatLabel(key), max: Math.ceil(maxValue * 1.15) })),
      axisName: { color: AXIS_COLOR },
      splitLine: { lineStyle: { color: GRID_COLOR } },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
      axisLine: { lineStyle: { color: GRID_COLOR } },
    },
    series: [
      {
        type: 'radar',
        data: limitedRows.map((row) => ({
          name: row.name,
          value: PROVINCE_YIELD_KEYS.map((key) => row.yields[key]),
        })),
      },
    ],
  }
}

function religionMixOption(rows) {
  const religions = topCategories(rows, [(row) => Object.fromEntries(row.religions.map((religion) => [religion.name, religion.followers]))], 10)
  return stackedCategoryOption(rows, religions, (row, religionName) => {
    return row.religions
      .filter((religion) => religion.name === religionName)
      .reduce((sum, religion) => sum + religion.followers, 0)
  }, { yAxisName: 'Followers' })
}

function countyYieldOption(rows) {
  if (!hasDetailedCountyRows(rows)) return countyPlaceholderOption()

  const option = baseOption(rows)
  return {
    ...option,
    yAxis: { ...option.yAxis, name: 'County Yield' },
    series: mapSeriesForKeys(rows, COUNTY_YIELD_KEYS, (row) => row.countyYields, 'county-yields'),
  }
}

function countyFootprintOption(rows) {
  if (!hasDetailedCountyRows(rows)) return countyPlaceholderOption()

  const option = baseOption(rows)
  return {
    ...option,
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#181a24',
      borderColor: GRID_COLOR,
      textStyle: { color: TEXT_COLOR },
      formatter(params) {
        const row = params.data.row
        return [
          `<strong>${row.name}</strong>`,
          `Counties: ${row.countyCount}`,
          `Population: ${formatNumber(row.population)}`,
          `Citizens Working: ${formatNumber(row.citizensWorking)}`,
          `Average Appeal: ${formatNumber(row.averageAppeal)}`,
        ].join('<br>')
      },
    },
    xAxis: {
      type: 'value',
      name: 'Counties',
      axisLabel: { color: AXIS_COLOR },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    yAxis: {
      type: 'value',
      name: 'Population',
      axisLabel: { color: AXIS_COLOR },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    dataZoom: [],
    series: [
      {
        name: 'Province',
        type: 'scatter',
        data: rows.map((row) => ({
          value: [row.countyCount, row.population, row.name],
          row,
        })),
        symbolSize(value, params) {
          const row = params.data.row
          return Math.max(12, Math.min(42, 12 + row.citizensWorking * 2 + row.averageAppeal))
        },
        label: { show: true, formatter: (params) => params.data.row.name, color: AXIS_COLOR },
        emphasis: { focus: 'self' },
      },
    ],
  }
}

function regionalSummaries(rows) {
  const groups = new Map()

  rows.forEach((row) => {
    if (!groups.has(row.group)) {
      groups.set(row.group, {
        name: row.group,
        provinceCount: 0,
        population: 0,
        provincialPopulation: 0,
        assemblypeople: 0,
        prelates: 0,
        totalYield: 0,
        yields: createNumericMap(null, PROVINCE_YIELD_KEYS),
        loyaltyTotal: 0,
        growthTotal: 0,
        happinessTotal: 0,
        netAmenitiesTotal: 0,
        netFoodTotal: 0,
        countyCount: 0,
        countyDetailCount: 0,
        totalCountyYield: 0,
        countyYields: createNumericMap(null, COUNTY_YIELD_KEYS),
        citizensWorking: 0,
        riverCount: 0,
        railroadCount: 0,
        status: STATUS_FIELDS.reduce((result, [key]) => {
          result[key] = 0
          return result
        }, {}),
        religions: {},
        originalCountries: {},
        provinceNames: [],
        averageClosestProvinceDistanceTotal: 0,
        averageClosestProvinceDistanceCount: 0,
        nearestProvinceName: row.nearestProvinceName || 'None',
        nearestProvinceDistance: row.nearestProvinceDistance || 0,
      })
    }

    const group = groups.get(row.group)
    group.provinceCount += 1
    group.population += row.population
    group.provincialPopulation += row.provincialPopulation
    group.assemblypeople += row.assemblypeople
    group.prelates += row.prelates
    group.totalYield += row.totalYield
    group.loyaltyTotal += row.loyalty
    group.growthTotal += row.growthPercentage
    group.happinessTotal += row.happinessPercentage
    group.netAmenitiesTotal += row.netAmenities
    group.netFoodTotal += row.netFood
    group.countyCount += row.countyCount
    group.countyDetailCount += row.countyDetailCount
    group.totalCountyYield += row.totalCountyYield
    group.citizensWorking += row.citizensWorking
    group.riverCount += row.riverCount
    group.railroadCount += row.railroadCount
    group.provinceNames.push(row.name)
    if (row.averageClosestProvinceDistance > 0) {
      group.averageClosestProvinceDistanceTotal += row.averageClosestProvinceDistance
      group.averageClosestProvinceDistanceCount += 1
    }
    if (row.nearestProvinceDistance > 0 && (!group.nearestProvinceDistance || row.nearestProvinceDistance < group.nearestProvinceDistance)) {
      group.nearestProvinceName = row.nearestProvinceName
      group.nearestProvinceDistance = row.nearestProvinceDistance
    }

    PROVINCE_YIELD_KEYS.forEach((key) => {
      group.yields[key] += row.yields[key]
    })

    COUNTY_YIELD_KEYS.forEach((key) => {
      group.countyYields[key] += row.countyYields[key]
    })

    STATUS_FIELDS.forEach(([key]) => {
      group.status[key] += row.status[key]
    })

    row.religions.forEach((religion) => {
      group.religions[religion.name] = (group.religions[religion.name] || 0) + religion.followers
    })

    group.originalCountries[row.originalCountry] = (group.originalCountries[row.originalCountry] || 0) + 1
  })

  return [...groups.values()]
    .map((group) => {
      const dominantOrigin = Object.entries(group.originalCountries).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unspecified'
      const dominantReligion = Object.entries(group.religions).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'
      const averageClosestProvinceDistance = group.averageClosestProvinceDistanceCount
        ? group.averageClosestProvinceDistanceTotal / group.averageClosestProvinceDistanceCount
        : 0
      return {
        ...group,
        averageAppeal: 0,
        averageClosestProvinceDistance,
        dominantOrigin,
        dominantReligion,
        originalCountry: dominantOrigin,
        population: group.population,
        provincialPopulation: group.provincialPopulation,
        loyalty: group.provinceCount ? group.loyaltyTotal / group.provinceCount : 0,
        growthPercentage: group.provinceCount ? group.growthTotal / group.provinceCount : 0,
        happinessPercentage: group.provinceCount ? group.happinessTotal / group.provinceCount : 0,
        netAmenities: group.netAmenitiesTotal,
        netFood: group.netFoodTotal,
      }
    })
    .sort((a, b) => b.provincialPopulation - a.provincialPopulation)
}

export function buildRegionalComparisonRows(data, provinceCalcs = []) {
  const rows = Array.isArray(data) ? data : buildProvinceComparisonRows(data, provinceCalcs)
  const order = Array.isArray(data?.province_groups) ? data.province_groups : []
  const orderMap = new Map(order.map((name, index) => [name, index]))
  return regionalSummaries(rows).sort((a, b) => {
    const aOrder = orderMap.has(a.name) ? orderMap.get(a.name) : Number.POSITIVE_INFINITY
    const bOrder = orderMap.has(b.name) ? orderMap.get(b.name) : Number.POSITIVE_INFINITY
    return aOrder - bOrder || a.name.localeCompare(b.name)
  })
}

function regionalBalanceOption(rows) {
  const regions = regionalSummaries(rows)
  const option = baseOption(regions)

  return {
    ...option,
    yAxis: [
      {
        type: 'value',
        name: 'Provincial Pop',
        axisLabel: { color: AXIS_COLOR, formatter: (value) => formatCompactNumber(value) },
        splitLine: { lineStyle: { color: GRID_COLOR } },
      },
      { type: 'value', name: 'Seats / Count', axisLabel: { color: AXIS_COLOR }, splitLine: { show: false } },
    ],
    series: [
      barSeries('Provincial Population', regions.map((region) => region.provincialPopulation)),
      lineSeries('Assemblypeople', regions.map((region) => region.assemblypeople), { yAxisIndex: 1 }),
      lineSeries('Prelates', regions.map((region) => region.prelates), { yAxisIndex: 1 }),
      barSeries('Provinces', regions.map((region) => region.provinceCount), { yAxisIndex: 1 }),
    ],
  }
}

function regionalYieldOption(rows) {
  const regions = regionalSummaries(rows)
  const option = baseOption(regions)

  return {
    ...option,
    tooltip: { ...option.tooltip, axisPointer: { type: 'shadow' } },
    yAxis: { ...option.yAxis, name: 'Yield' },
    series: mapSeriesForKeys(regions, PROVINCE_YIELD_KEYS, (region) => region.yields, 'regional-yields'),
  }
}

function yieldEfficiencyOption(rows) {
  const maxPrelates = Math.max(1, ...rows.map((row) => row.prelates))

  return {
    color: CHART_COLORS,
    backgroundColor: 'transparent',
    textStyle: { color: TEXT_COLOR, fontFamily: 'Inter, system-ui, sans-serif' },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#181a24',
      borderColor: GRID_COLOR,
      textStyle: { color: TEXT_COLOR },
      formatter(params) {
        const row = params.data.row
        return [
          `<strong>${row.name}</strong>`,
          `Provincial Pop: ${formatNumber(row.provincialPopulation)}`,
          `Total Yield: ${formatNumber(row.totalYield)}`,
          `Assemblypeople: ${formatNumber(row.assemblypeople)}`,
          `Prelates: ${formatNumber(row.prelates)}`,
        ].join('<br>')
      },
    },
    grid: { left: 70, right: 28, top: 38, bottom: 52, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Provincial Population',
      axisLabel: { color: AXIS_COLOR, formatter: (value) => formatCompactNumber(value) },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    yAxis: {
      type: 'value',
      name: 'Total Yield',
      axisLabel: { color: AXIS_COLOR },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    series: [
      {
        name: 'Province',
        type: 'scatter',
        data: rows.map((row) => ({
          value: [row.provincialPopulation, row.totalYield, row.name],
          row,
        })),
        symbolSize(value, params) {
          return 10 + (params.data.row.prelates / maxPrelates) * 22
        },
        label: {
          show: rows.length <= 18,
          formatter: (params) => params.data.row.name,
          color: AXIS_COLOR,
        },
        emphasis: {
          focus: 'self',
          label: { show: true, color: TEXT_COLOR },
        },
      },
    ],
  }
}

function religionRegionOption(rows) {
  const regions = regionalSummaries(rows)
  const categories = topCategories(regions, [(region) => region.religions], 10)

  return stackedCategoryOption(regions, categories, (region, religionName) => region.religions[religionName] || 0, {
    yAxisName: 'Followers',
  })
}

function regionalReligionMixOption(rows) {
  const categories = topCategories(rows, [(region) => region.religions], 10)

  return stackedCategoryOption(rows, categories, (region, religionName) => region.religions[religionName] || 0, {
    yAxisName: 'Followers',
  })
}

function statusMatrixOption(rows) {
  const statuses = STATUS_FIELDS.map(([, label]) => label)
  return {
    color: CHART_COLORS,
    backgroundColor: 'transparent',
    textStyle: { color: TEXT_COLOR, fontFamily: 'Inter, system-ui, sans-serif' },
    tooltip: {
      position: 'top',
      backgroundColor: '#181a24',
      borderColor: GRID_COLOR,
      textStyle: { color: TEXT_COLOR },
      formatter(params) {
        return `${rows[params.value[1]]?.name}<br>${statuses[params.value[0]]}: ${params.value[2] ? 'Yes' : 'No'}`
      },
    },
    grid: { left: 130, right: 20, top: 30, bottom: 50 },
    xAxis: { type: 'category', data: statuses, axisLabel: { color: AXIS_COLOR, rotate: 25 }, axisTick: { show: false } },
    yAxis: { type: 'category', data: rows.map((row) => row.name), axisLabel: { color: AXIS_COLOR }, axisTick: { show: false } },
    visualMap: {
      min: 0,
      max: 1,
      show: false,
      inRange: { color: ['#252839', '#d4a843'] },
    },
    series: [
      {
        type: 'heatmap',
        data: rows.flatMap((row, rowIndex) =>
          STATUS_FIELDS.map(([key], statusIndex) => [statusIndex, rowIndex, row.status[key]])
        ),
        label: { show: true, color: TEXT_COLOR, formatter: (params) => (params.value[2] ? 'Yes' : '') },
      },
    ],
  }
}

function regionalTreemapOption(rows) {
  const groups = new Map()
  rows.forEach((row) => {
    if (!groups.has(row.group)) groups.set(row.group, [])
    groups.get(row.group).push(row)
  })

  return {
    color: CHART_COLORS,
    backgroundColor: 'transparent',
    textStyle: { color: TEXT_COLOR, fontFamily: 'Inter, system-ui, sans-serif' },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#181a24',
      borderColor: GRID_COLOR,
      textStyle: { color: TEXT_COLOR },
      formatter(params) {
        return `${params.name}<br>${formatNumber(params.value)} provincial population`
      },
    },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: { color: TEXT_COLOR, formatter: '{b}' },
        upperLabel: { show: true, height: 24, color: TEXT_COLOR },
        itemStyle: { borderColor: '#181a24', borderWidth: 2, gapWidth: 2 },
        data: [...groups.entries()].map(([group, groupRows]) => ({
          name: group,
          value: groupRows.reduce((sum, row) => sum + row.provincialPopulation, 0),
          children: groupRows.map((row) => ({
            name: row.name,
            value: row.provincialPopulation || row.population || 1,
          })),
        })),
      },
    ],
  }
}

export function buildProvinceVisualizationOption(modeId, rows) {
  if (!rows.length) {
    return emptyOption('No province data selected')
  }

  switch (modeId) {
    case 'population-representation':
      return populationRepresentationOption(rows)
    case 'civic-risk':
      return civicRiskOption(rows)
    case 'economic-profile':
      return economicProfileOption(rows)
    case 'yield-efficiency':
      return yieldEfficiencyOption(rows)
    case 'county-readiness':
      return countyReadinessOption(rows)
    case 'connectivity-frontier':
      return connectivityFrontierOption(rows)
    case 'origin-blocs':
      return originBlocOption(rows)
    case 'religion-mix':
      return religionMixOption(rows)
    default:
      return populationRepresentationOption(rows)
  }
}

export function buildRegionalVisualizationOption(modeId, rows) {
  if (!rows.length) {
    return emptyOption('No regional data selected')
  }

  switch (modeId) {
    case 'population-representation':
      return populationRepresentationOption(rows)
    case 'regional-risk':
      return civicRiskOption(rows, 'Regional')
    case 'regional-economy':
      return economicProfileOption(rows, 'Regional')
    case 'county-readiness':
      return countyReadinessOption(rows, 'Regional')
    case 'connectivity-frontier':
      return connectivityFrontierOption(rows, 'Regional')
    case 'origin-blocs':
      return originBlocOption(rows)
    case 'religion-mix':
      return regionalReligionMixOption(rows)
    default:
      return populationRepresentationOption(rows)
  }
}

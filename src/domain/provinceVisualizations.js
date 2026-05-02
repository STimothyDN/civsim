export const PROVINCE_YIELD_KEYS = ['amenities', 'food', 'production', 'gold', 'culture', 'science', 'faith']
export const COUNTY_YIELD_KEYS = [...PROVINCE_YIELD_KEYS, 'tourism']

export const PROVINCE_VISUALIZATION_MODES = [
  { id: 'calculated-population', label: 'Calculated Population', category: 'Population' },
  { id: 'regional-balance', label: 'Regional Balance', category: 'Population' },
  { id: 'civic-health', label: 'Civic Health', category: 'Civic' },
  { id: 'province-yields', label: 'Province Yields', category: 'Yields' },
  { id: 'regional-yields', label: 'Regional Yield Mix', category: 'Yields' },
  { id: 'yield-efficiency', label: 'Yield Efficiency', category: 'Yields' },
  { id: 'yield-radar', label: 'Yield Radar', category: 'Yields' },
  { id: 'religion-mix', label: 'Religion Mix', category: 'Religion' },
  { id: 'religion-region', label: 'Religion by Region', category: 'Religion' },
  { id: 'status-matrix', label: 'Status Matrix', category: 'Status' },
  { id: 'regional-treemap', label: 'Regional Treemap', category: 'Status' },
  { id: 'county-yields', label: 'County Yield Totals', category: 'County' },
  { id: 'county-footprint', label: 'County Footprint', category: 'County' },
  { id: 'terrain-mix', label: 'Terrain Mix', category: 'County' },
  { id: 'improvements', label: 'Improvements & Buildings', category: 'County' },
  { id: 'resources-features', label: 'Resources & Features', category: 'County' },
]

const CHART_COLORS = [
  '#d4a843',
  '#60a5fa',
  '#34d399',
  '#f472b6',
  '#a78bfa',
  '#fb923c',
  '#2dd4bf',
  '#e879f9',
  '#facc15',
  '#38bdf8',
  '#f87171',
  '#94a3b8',
]

const AXIS_COLOR = '#9b9a97'
const TEXT_COLOR = '#e8e6e1'
const GRID_COLOR = '#2a2d3a'

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

export function buildProvinceComparisonRows(data, provinceCalcs = []) {
  const provinces = Array.isArray(data?.provinces) ? data.provinces : []

  return provinces.map((province, index) => {
    const calc = provinceCalcs[index] || {}
    const countySummary = summarizeCounties(province.counties)
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
        religions: {},
      })
    }

    const group = groups.get(row.group)
    group.provinceCount += 1
    group.population += row.population
    group.provincialPopulation += row.provincialPopulation
    group.assemblypeople += row.assemblypeople
    group.prelates += row.prelates
    group.totalYield += row.totalYield

    PROVINCE_YIELD_KEYS.forEach((key) => {
      group.yields[key] += row.yields[key]
    })

    row.religions.forEach((religion) => {
      group.religions[religion.name] = (group.religions[religion.name] || 0) + religion.followers
    })
  })

  return [...groups.values()].sort((a, b) => b.provincialPopulation - a.provincialPopulation)
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
    case 'calculated-population':
      return calculatedPopulationOption(rows)
    case 'regional-balance':
      return regionalBalanceOption(rows)
    case 'civic-health':
      return civicHealthOption(rows)
    case 'province-yields':
      return provinceYieldOption(rows)
    case 'regional-yields':
      return regionalYieldOption(rows)
    case 'yield-efficiency':
      return yieldEfficiencyOption(rows)
    case 'yield-radar':
      return yieldRadarOption(rows)
    case 'religion-mix':
      return religionMixOption(rows)
    case 'religion-region':
      return religionRegionOption(rows)
    case 'county-yields':
      return countyYieldOption(rows)
    case 'county-footprint':
      return countyFootprintOption(rows)
    case 'terrain-mix':
      if (!hasDetailedCountyRows(rows)) return countyPlaceholderOption()
      return stackedCategoryOption(rows, topCategories(rows, [(row) => row.terrainCounts], 8), (row, category) => row.terrainCounts[category] || 0)
    case 'improvements':
      if (!hasDetailedCountyRows(rows)) return countyPlaceholderOption()
      return stackedCategoryOption(
        rows,
        topCategories(rows, [(row) => row.improvementCounts, (row) => row.buildingCounts], 10),
        (row, category) => (row.improvementCounts[category] || 0) + (row.buildingCounts[category] || 0)
      )
    case 'resources-features':
      if (!hasDetailedCountyRows(rows)) return countyPlaceholderOption()
      return stackedCategoryOption(
        rows,
        topCategories(rows, [(row) => row.resourceCounts, (row) => row.featureCounts], 10),
        (row, category) => (row.resourceCounts[category] || 0) + (row.featureCounts[category] || 0)
      )
    case 'status-matrix':
      return statusMatrixOption(rows)
    case 'regional-treemap':
      return regionalTreemapOption(rows)
    default:
      return calculatedPopulationOption(rows)
  }
}

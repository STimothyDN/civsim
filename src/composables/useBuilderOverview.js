import { computed } from 'vue'
import {
  PROVINCE_YIELD_KEYS,
  formatCompactNumber,
  formatNumber,
  toNumber,
} from '../domain/provinceVisualizations'
import { useCivilizationStore } from '../stores/civilizationStore'

function labelForKey(key) {
  if (!key || key === 'none') return 'None'
  return String(key).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatPercent(value) {
  return `${formatNumber(value)}%`
}

function presentValue(value, fallback = 'None') {
  return value !== null && value !== undefined && value !== '' ? value : fallback
}

function topYieldFromMap(yields) {
  return PROVINCE_YIELD_KEYS.map((key) => ({ key, label: labelForKey(key), total: toNumber(yields?.[key]) }))
    .sort((a, b) => b.total - a.total)[0] || { key: 'none', label: 'None', total: 0 }
}

function topReligionFromList(religions) {
  return [...(religions || [])]
    .filter((religion) => toNumber(religion.followers) > 0)
    .sort((a, b) => toNumber(b.followers) - toNumber(a.followers))[0] || { name: 'None', followers: 0 }
}

function topReligionFromTotals(totals) {
  const [name, followers] = Object.entries(totals || {}).sort((a, b) => b[1] - a[1])[0] || ['None', 0]
  return { name, followers }
}

function buildProvinceBadges(row) {
  const badges = []
  if (row.status.is_national_capital) badges.push({ label: 'National Capital', tone: 'gold' })
  if (row.status.is_regional_capital) badges.push({ label: 'Regional Capital', tone: 'teal' })
  if (row.status.is_founded) badges.push({ label: 'Founded', tone: 'green' })
  if (row.status.is_joined) badges.push({ label: 'Joined', tone: 'blue' })
  if (row.status.is_conquered) badges.push({ label: 'Conquered', tone: 'red' })
  return badges.length ? badges : [{ label: 'Unmarked', tone: 'muted' }]
}

function createRegion(name) {
  return {
    name,
    provinceCount: 0,
    rawPopulation: 0,
    provincialPopulation: 0,
    assemblypeople: 0,
    prelates: 0,
    totalYield: 0,
    yields: PROVINCE_YIELD_KEYS.reduce((totals, key) => {
      totals[key] = 0
      return totals
    }, {}),
    religions: {},
    countyCount: 0,
    countyDetailCount: 0,
    totalCountyYield: 0,
    loyaltyTotal: 0,
    growthTotal: 0,
    happinessTotal: 0,
    foundedCount: 0,
    joinedCount: 0,
    conqueredCount: 0,
    regionalCapitalCount: 0,
    nationalCapitalCount: 0,
    provinceNames: [],
  }
}

export function useBuilderOverview(store) {
  const civStore = useCivilizationStore()
  const country = computed(() => store.currentData?.country || {})
  const countryInfo = computed(() => country.value.basic_info || {})
  const economy = computed(() => country.value.economy || {})
  const provinces = computed(() => store.currentData?.provinces || [])
  const rows = computed(() => civStore.provinceRows)
  const configuredGroups = computed(() => civStore.configuredGroups)

  const countryName = computed(() => countryInfo.value.name || 'Untitled Civilization')
  const provinceCount = computed(() => rows.value.length)
  const groupCount = computed(() => store.currentData?.province_groups?.length || 0)
  const religionCount = computed(() => store.currentData?.global_religions?.length || 0)
  const nationalCapital = computed(() => {
    const capital = rows.value.find((province) => province.status.is_national_capital)
    return capital?.name || 'None'
  })
  const regionalCapitalCount = computed(() => rows.value.filter((province) => province.status.is_regional_capital).length)
  const foundedCount = computed(() => rows.value.filter((province) => province.status.is_founded).length)
  const joinedCount = computed(() => rows.value.filter((province) => province.status.is_joined).length)
  const conqueredCount = computed(() => rows.value.filter((province) => province.status.is_conquered).length)
  const unassignedProvinceCount = computed(() => rows.value.filter((province) => !province.group || province.group === 'Unassigned').length)
  const unnamedProvinceCount = computed(() => provinces.value.filter((province) => !province.name).length)
  const dataGapCount = computed(() => unassignedProvinceCount.value + unnamedProvinceCount.value)
  const countyCount = computed(() => civStore.countyCount)
  const countyDetailCount = computed(() => civStore.countyDetailCount)

  const totalRawPopulation = computed(() => civStore.totalRawPopulation)
  const officialPopulation = computed(() => toNumber(country.value.total_population))
  const totalProvincialPopulation = computed(() => civStore.totalProvincialPopulation)
  const totalAssemblypeople = computed(() => civStore.totalAssemblypeople)
  const totalPrelates = computed(() => civStore.totalPrelates)
  const totalEconomyOutput = computed(() => {
    return ['gold_per_turn', 'faith_per_turn', 'culture_per_turn', 'science_per_turn']
      .reduce((sum, key) => sum + toNumber(economy.value[key]), 0)
  })

  const yieldTotals = computed(() => civStore.yieldTotals)
  const topYield = computed(() => topYieldFromMap(yieldTotals.value))

  const religionTotals = computed(() => civStore.religionTotals)
  const dominantReligion = computed(() => topReligionFromTotals(religionTotals.value))

  const regionSummaries = computed(() => {
    const groups = new Map()

    configuredGroups.value.forEach((name) => {
      if (!groups.has(name)) groups.set(name, createRegion(name))
    })

    rows.value.forEach((row) => {
      if (!groups.has(row.group)) {
        groups.set(row.group, createRegion(row.group))
      }

      const group = groups.get(row.group)
      group.provinceCount += 1
      group.rawPopulation += row.population
      group.provincialPopulation += row.provincialPopulation
      group.assemblypeople += row.assemblypeople
      group.prelates += row.prelates
      group.totalYield += row.totalYield
      group.countyCount += row.countyCount
      group.countyDetailCount += row.countyDetailCount
      group.totalCountyYield += row.totalCountyYield
      group.loyaltyTotal += row.loyalty
      group.growthTotal += row.growthPercentage
      group.happinessTotal += row.happinessPercentage
      group.foundedCount += row.status.is_founded ? 1 : 0
      group.joinedCount += row.status.is_joined ? 1 : 0
      group.conqueredCount += row.status.is_conquered ? 1 : 0
      group.regionalCapitalCount += row.status.is_regional_capital ? 1 : 0
      group.nationalCapitalCount += row.status.is_national_capital ? 1 : 0
      group.provinceNames.push(row.name)
      PROVINCE_YIELD_KEYS.forEach((key) => {
        group.yields[key] = (group.yields[key] || 0) + row.yields[key]
      })
      row.religions.forEach((religion) => {
        if (religion.followers <= 0) return
        group.religions[religion.name] = (group.religions[religion.name] || 0) + religion.followers
      })
    })

    return [...groups.values()].map((group) => {
      const top = topYieldFromMap(group.yields)
      const maxYield = Math.max(1, ...PROVINCE_YIELD_KEYS.map((key) => group.yields[key]))
      const religion = topReligionFromTotals(group.religions)
      const averageFor = (field) => (group.provinceCount ? group[field] / group.provinceCount : 0)
      const badges = []

      if (group.nationalCapitalCount) badges.push({ label: 'National Capital', tone: 'gold' })
      if (group.regionalCapitalCount) badges.push({ label: `${group.regionalCapitalCount} Regional Capitals`, tone: 'teal' })
      if (group.foundedCount) badges.push({ label: `${group.foundedCount} Founded`, tone: 'green' })
      if (group.joinedCount) badges.push({ label: `${group.joinedCount} Joined`, tone: 'blue' })
      if (group.conqueredCount) badges.push({ label: `${group.conqueredCount} Conquered`, tone: 'red' })

      return {
        ...group,
        badges: badges.length ? badges : [{ label: 'No Provinces', tone: 'muted' }],
        religionName: religion.name,
        religionFollowers: religion.followers,
        topYieldLabel: top.label,
        topMetrics: [
          { label: 'Provinces', value: formatNumber(group.provinceCount) },
          { label: 'Raw Pop', value: formatNumber(group.rawPopulation) },
          { label: 'Assemblypeople', value: formatNumber(group.assemblypeople) },
          { label: 'Prelates', value: formatNumber(group.prelates) },
          { label: 'Total Yield', value: formatNumber(group.totalYield) },
        ],
        civicMetrics: [
          { label: 'Average Loyalty', value: formatPercent(averageFor('loyaltyTotal')) },
          { label: 'Average Growth', value: formatPercent(averageFor('growthTotal')) },
          { label: 'Average Happiness', value: formatPercent(averageFor('happinessTotal')) },
          { label: 'Founded', value: `${formatNumber(group.foundedCount)} / ${formatNumber(group.provinceCount)}` },
          { label: 'Conquered', value: formatNumber(group.conqueredCount) },
        ],
        yieldMetrics: PROVINCE_YIELD_KEYS.map((key) => ({
          key,
          label: labelForKey(key),
          value: group.yields[key],
          share: Math.round((group.yields[key] / maxYield) * 100),
        })),
      }
    })
  })

  const topRegion = computed(() => {
    return [...regionSummaries.value].sort((a, b) => b.provincialPopulation - a.provincialPopulation)[0] || null
  })

  const countryIdentity = computed(() => [
    { label: 'Leader', value: presentValue(countryInfo.value.leader) },
    { label: 'State Religion', value: presentValue(country.value.state_religion) },
    { label: 'National Capital', value: nationalCapital.value },
    { label: 'Largest Region', value: topRegion.value?.name || 'None' },
  ])

  const countrySummaryCards = computed(() => [
    { label: 'Provinces', value: formatNumber(provinceCount.value), detail: `${formatNumber(foundedCount.value)} founded` },
    { label: 'Groups', value: formatNumber(groupCount.value), detail: `${formatNumber(regionalCapitalCount.value)} regional capitals` },
    { label: 'Official Population', value: formatNumber(officialPopulation.value), detail: `${formatNumber(totalRawPopulation.value)} province pop` },
    { label: 'Top Yield', value: topYield.value.label, detail: `${formatNumber(topYield.value.total)} total` },
    { label: 'Counties', value: `${countyDetailCount.value} / ${countyCount.value}`, detail: 'detailed records' },
    { label: 'Data Gaps', value: formatNumber(dataGapCount.value), detail: `${formatNumber(unassignedProvinceCount.value)} unassigned` },
  ])

  const economyMetrics = computed(() => [
    { label: 'Gold / Turn', value: formatNumber(economy.value.gold_per_turn) },
    { label: 'Faith / Turn', value: formatNumber(economy.value.faith_per_turn) },
    { label: 'Culture / Turn', value: formatNumber(economy.value.culture_per_turn) },
    { label: 'Science / Turn', value: formatNumber(economy.value.science_per_turn) },
  ])

  const representationMetrics = computed(() => [
    { label: 'Assemblypeople', value: formatNumber(totalAssemblypeople.value) },
    { label: 'Prelates', value: formatNumber(totalPrelates.value) },
    { label: 'Regional Capitals', value: formatNumber(regionalCapitalCount.value) },
    { label: 'Province Groups', value: formatNumber(groupCount.value) },
  ])

  function averageRowValue(field) {
    if (!rows.value.length) return 0
    return rows.value.reduce((sum, row) => sum + toNumber(row[field]), 0) / rows.value.length
  }

  const civicMetrics = computed(() => [
    { label: 'Average Loyalty', value: formatPercent(averageRowValue('loyalty')) },
    { label: 'Average Growth', value: formatPercent(averageRowValue('growthPercentage')) },
    { label: 'Average Happiness', value: formatPercent(averageRowValue('happinessPercentage')) },
    { label: 'Conquered Provinces', value: formatNumber(conqueredCount.value) },
    { label: 'Joined Provinces', value: formatNumber(joinedCount.value) },
  ])

  const religionMetrics = computed(() => [
    { label: 'Dominant Religion', value: dominantReligion.value.name },
    { label: 'Dominant Followers', value: formatNumber(dominantReligion.value.followers) },
    { label: 'Global Religions', value: formatNumber(religionCount.value) },
    { label: 'State Religion', value: presentValue(country.value.state_religion) },
  ])

  const provinceSummaries = computed(() => rows.value.map((row) => {
    const province = provinces.value[row.index] || {}
    const maxYield = Math.max(1, ...PROVINCE_YIELD_KEYS.map((key) => row.yields[key]))
    const religion = topReligionFromList(row.religions)

    return {
      ...row,
      notes: province.notes || '',
      badges: buildProvinceBadges(row),
      religionName: religion.name,
      religionFollowers: religion.followers,
      topMetrics: [
        { label: 'Population', value: formatNumber(row.population) },
        { label: 'Assemblypeople', value: formatNumber(row.assemblypeople) },
        { label: 'Prelates', value: formatNumber(row.prelates) },
        { label: 'Total Yield', value: formatNumber(row.totalYield) },
      ],
      civicMetrics: [
        { label: 'Loyalty', value: formatPercent(row.loyalty) },
        { label: 'Growth', value: formatPercent(row.growthPercentage) },
        { label: 'Happiness', value: formatPercent(row.happinessPercentage) },
        { label: 'Housing', value: formatNumber(row.housing) },
        { label: 'Net Amenities', value: formatNumber(row.netAmenities) },
        { label: 'Net Food', value: formatNumber(row.netFood) },
      ],
      yieldMetrics: PROVINCE_YIELD_KEYS.map((key) => ({
        key,
        label: labelForKey(key),
        value: row.yields[key],
        share: Math.round((row.yields[key] / maxYield) * 100),
      })),
    }
  }))

  const sidebarProvinceOrder = computed(() => {
    const byGroup = new Map()
    const groupKey = (groupName) => (groupName ? `group:${groupName}` : 'group:__unassigned__')
    const ensureGroup = (groupName) => {
      const key = groupKey(groupName)
      if (!byGroup.has(key)) byGroup.set(key, { key, items: [] })
      return byGroup.get(key)
    }

    configuredGroups.value.forEach((groupName) => {
      if (groupName) ensureGroup(groupName)
    })

    rows.value.forEach((row) => {
      const sourceGroup = provinces.value[row.index]?.group || ''
      ensureGroup(sourceGroup).items.push(row)
    })

    return [...byGroup.values()]
      .filter((group) => group.items.length > 0)
      .flatMap((group) =>
        [...group.items]
          .sort((a, b) => {
            if (b.provincialPopulation !== a.provincialPopulation) {
              return b.provincialPopulation - a.provincialPopulation
            }
            return a.index - b.index
          })
          .map((province) => province.index)
      )
  })

  return {
    civicMetrics,
    countryIdentity,
    countryName,
    countrySummaryCards,
    economyMetrics,
    formatCompactNumber,
    formatNumber,
    groupCount,
    provinceCount,
    provinceSummaries,
    regionSummaries,
    religionMetrics,
    representationMetrics,
    sidebarProvinceOrder,
    totalEconomyOutput,
    totalProvincialPopulation,
    totalRawPopulation,
  }
}

import { PARTIES, PARTY_COLORS, PARTY_NAMES } from '../constants/parties'
import { num } from '../normalization/numbers'

const TEXT_COLOR = '#e8e6e1'
const AXIS_COLOR = '#9b9a97'
const GRID_COLOR = '#2a2d3a'
const BG_COLOR = 'transparent'

function partyColors() {
  return PARTIES.map((party) => PARTY_COLORS[party])
}

function emptyOption(text) {
  return {
    backgroundColor: BG_COLOR,
    title: {
      text,
      left: 'center',
      top: 'center',
      textStyle: { color: AXIS_COLOR, fontSize: 15, fontWeight: 700 },
    },
  }
}

export function partySeatBarOption(seats = {}, title = 'Seats') {
  const values = PARTIES.map((party) => num(seats[party]))
  if (!values.some(Boolean)) return emptyOption('No seats allocated')

  return {
    color: partyColors(),
    backgroundColor: BG_COLOR,
    textStyle: { color: TEXT_COLOR, fontFamily: 'Inter, system-ui, sans-serif' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#181a24', borderColor: GRID_COLOR, textStyle: { color: TEXT_COLOR } },
    grid: { left: 42, right: 18, top: 32, bottom: 78, containLabel: true },
    xAxis: {
      type: 'category',
      data: PARTIES.map((party) => PARTY_NAMES[party]),
      axisLabel: { color: AXIS_COLOR, rotate: 24 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: GRID_COLOR } },
    },
    yAxis: {
      type: 'value',
      name: title,
      axisLabel: { color: AXIS_COLOR },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    series: [
      {
        name: title,
        type: 'bar',
        barMaxWidth: 42,
        data: PARTIES.map((party) => ({ value: num(seats[party]), itemStyle: { color: PARTY_COLORS[party] } })),
        itemStyle: { borderRadius: [3, 3, 0, 0] },
      },
    ],
  }
}

export function regionalStackedSeatOption(regions = {}, chamber = 'assembly') {
  const regionList = Object.values(regions)
  if (!regionList.length) return emptyOption('No regional results')

  return {
    color: partyColors(),
    backgroundColor: BG_COLOR,
    textStyle: { color: TEXT_COLOR, fontFamily: 'Inter, system-ui, sans-serif' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#181a24', borderColor: GRID_COLOR, textStyle: { color: TEXT_COLOR } },
    legend: { type: 'scroll', top: 0, textStyle: { color: AXIS_COLOR } },
    grid: { left: 56, right: 24, top: 54, bottom: regionList.length > 5 ? 96 : 52, containLabel: true },
    xAxis: {
      type: 'category',
      data: regionList.map((region) => region.name),
      axisLabel: { color: AXIS_COLOR, rotate: regionList.length > 4 ? 28 : 0 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: GRID_COLOR } },
    },
    yAxis: {
      type: 'value',
      name: 'Seats',
      axisLabel: { color: AXIS_COLOR },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    series: PARTIES.map((party) => ({
      name: PARTY_NAMES[party],
      type: 'bar',
      stack: chamber,
      barMaxWidth: 38,
      data: regionList.map((region) => num(region[chamber]?.seats?.[party])),
      itemStyle: { color: PARTY_COLORS[party] },
    })),
  }
}

export function provinceFeatureRadarOption(province) {
  if (!province) return emptyOption('No province selected')
  const keys = [
    ['Imperial Core', 'imperial_core_index'],
    ['Industrial', 'industrial_index'],
    ['Agrarian', 'agrarian_index'],
    ['Military', 'military_index'],
    ['Intellectual', 'intellectual_index'],
    ['Spiritual', 'spiritual_index'],
    ['Localist', 'localist_index'],
    ['Restorationist', 'restorationist_index'],
  ]

  return {
    color: ['#d4a843'],
    backgroundColor: BG_COLOR,
    textStyle: { color: TEXT_COLOR, fontFamily: 'Inter, system-ui, sans-serif' },
    tooltip: { trigger: 'item', backgroundColor: '#181a24', borderColor: GRID_COLOR, textStyle: { color: TEXT_COLOR } },
    radar: {
      center: ['50%', '54%'],
      radius: '68%',
      indicator: keys.map(([name]) => ({ name, max: 1 })),
      axisName: { color: AXIS_COLOR },
      splitLine: { lineStyle: { color: GRID_COLOR } },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)'] } },
      axisLine: { lineStyle: { color: GRID_COLOR } },
    },
    series: [
      {
        name: province.name,
        type: 'radar',
        data: [
          {
            name: province.name,
            value: keys.map(([, key]) => num(province.political_features?.[key])),
          },
        ],
      },
    ],
  }
}


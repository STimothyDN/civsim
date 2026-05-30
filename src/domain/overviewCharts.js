/* ============================================================
   Country Overview · ECharts option factories
   Mirrors the handoff redesign/charts.js radar + scatter, styled
   inline (no theme registration) for the ProvinceChart wrapper.
   ============================================================ */

const PALETTE = {
  gold: '#e3bd57', azure: '#57a3e8', jade: '#45c08a', coral: '#ec7a5f',
  violet: '#a98bf0', rose: '#ef79b3', amber: '#f0b13e', teal: '#34cdc0',
  ink: '#ece7db', ink2: '#aab0bd', ink3: '#757c8b',
  line: 'rgba(233,226,211,0.10)',
}
const MONO = "'JetBrains Mono', ui-monospace, monospace"
const UI = "'Inter', system-ui, sans-serif"

const TOOLTIP = {
  backgroundColor: 'rgba(13,15,20,0.96)',
  borderColor: 'rgba(227,189,87,0.3)',
  borderWidth: 1,
  textStyle: { color: PALETTE.ink, fontFamily: UI, fontSize: 12 },
  extraCssText: 'border-radius:9px;box-shadow:0 14px 44px -10px rgba(0,0,0,.75);backdrop-filter:blur(8px);padding:9px 11px;',
}

/* ---- Radar (national yield profile) ---- */
export function radarOption(indicators, series) {
  return {
    tooltip: { ...TOOLTIP, trigger: 'item' },
    radar: {
      indicator: indicators,
      radius: '66%',
      center: ['50%', '54%'],
      axisName: { color: PALETTE.ink3, fontFamily: MONO, fontSize: 9 },
      axisLabel: { show: false },
      splitNumber: 4,
      splitLine: { lineStyle: { color: PALETTE.line } },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,0.012)', 'rgba(255,255,255,0.03)'] } },
      axisLine: { lineStyle: { color: PALETTE.line } },
    },
    series: [{
      type: 'radar',
      data: series.map((s) => ({
        name: s.name,
        value: s.value,
        lineStyle: { color: s.hex, width: 2 },
        itemStyle: { color: s.hex },
        areaStyle: { color: s.hex, opacity: 0.16 },
      })),
      animationDuration: 800,
    }],
  }
}

/* ---- Scatter (province population vs civic health) ---- */
export function scatterOption(points) {
  const maxPop = Math.max(1, ...points.map((p) => p.pop))
  return {
    grid: { top: 18, right: 18, bottom: 34, left: 44 },
    tooltip: {
      ...TOOLTIP,
      trigger: 'item',
      formatter: (p) => `<b>${p.data.name}</b><br/>Pop ${p.data.value[0].toLocaleString()} · Health ${p.data.value[1]}%`,
    },
    xAxis: {
      type: 'value', name: 'Population', scale: true,
      nameTextStyle: { color: PALETTE.ink3, fontFamily: MONO, fontSize: 9 },
      nameLocation: 'middle', nameGap: 22,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: PALETTE.ink3, fontFamily: MONO, fontSize: 10 },
      splitLine: { lineStyle: { color: PALETTE.line, type: 'dashed' } },
    },
    yAxis: {
      type: 'value', name: 'Health', max: 100,
      nameTextStyle: { color: PALETTE.ink3, fontFamily: MONO, fontSize: 9 },
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: PALETTE.ink3, fontFamily: MONO, fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: PALETTE.line, type: 'dashed' } },
    },
    series: [{
      type: 'scatter',
      data: points.map((p) => ({ name: p.name, value: [p.pop, p.health], itemStyle: { color: p.hex } })),
      symbolSize: (v) => 9 + Math.sqrt(v[0] / maxPop) * 20,
      itemStyle: { opacity: 0.85, borderColor: 'rgba(0,0,0,0.4)', borderWidth: 1 },
      emphasis: { itemStyle: { borderColor: PALETTE.gold, borderWidth: 2, shadowBlur: 12, shadowColor: 'rgba(227,189,87,0.5)' } },
      animationDelay: (i) => i * 30,
    }],
    animationEasing: 'elasticOut',
  }
}

export const REGION_PALETTE = [
  PALETTE.azure, PALETTE.jade, PALETTE.coral, PALETTE.violet,
  PALETTE.rose, PALETTE.teal, PALETTE.amber, PALETTE.gold,
]

export const YIELD_COLORS = {
  food: PALETTE.jade,
  production: PALETTE.coral,
  gold: PALETTE.gold,
  culture: PALETTE.violet,
  science: PALETTE.azure,
  faith: PALETTE.rose,
  amenities: PALETTE.teal,
}

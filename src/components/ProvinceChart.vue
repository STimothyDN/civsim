<template>
  <div ref="chartEl" class="province-chart" role="img" :aria-label="ariaLabel"></div>
</template>

<script>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { use, init } from 'echarts/core'
import { BarChart, HeatmapChart, LineChart, RadarChart, ScatterChart, TreemapChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([
  BarChart,
  DataZoomComponent,
  GridComponent,
  HeatmapChart,
  LegendComponent,
  LineChart,
  RadarChart,
  RadarComponent,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  TreemapChart,
  VisualMapComponent,
  CanvasRenderer,
])

export default {
  name: 'ProvinceChart',
  props: {
    option: { type: Object, required: true },
    ariaLabel: { type: String, default: 'Province comparison visualization' },
  },
  setup(props) {
    const chartEl = ref(null)
    let chart = null
    let resizeObserver = null

    function applyOption() {
      if (!chart) return
      chart.setOption(props.option, true)
    }

    onMounted(() => {
      chart = init(chartEl.value, null, { renderer: 'canvas' })
      applyOption()

      resizeObserver = new ResizeObserver(() => {
        chart?.resize()
      })
      resizeObserver.observe(chartEl.value)
    })

    // Shallow watch — callers pass freshly-built option objects (computeds),
    // so identity comparison is sufficient. Deep watching every keystroke
    // walked the entire option tree, which dominated input lag.
    watch(() => props.option, applyOption)

    onBeforeUnmount(() => {
      resizeObserver?.disconnect()
      chart?.dispose()
      chart = null
    })

    return { chartEl }
  },
}
</script>

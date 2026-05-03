<template>
  <section class="chamber-card" :style="controlCardStyle">
    <div class="chamber-card-header">
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h3>{{ title }}</h3>
      </div>
      <div class="chamber-majority">
        <span>Majority</span>
        <strong>{{ control?.majority || 0 }}</strong>
      </div>
    </div>

    <div class="chamber-view-toggle" role="group" aria-label="Chamber visualization mode">
      <button type="button" :class="{ 'chamber-view-toggle--active': viewMode === 'congress' }" @click="viewMode = 'congress'">
        Congress
      </button>
      <button type="button" :class="{ 'chamber-view-toggle--active': viewMode === 'dots' }" @click="viewMode = 'dots'">
        Seat dots
      </button>
    </div>

    <div class="chamber-control-strip">
      <PartyBadge v-if="control?.leaderParty" :party="control.leaderParty" />
      <div>
        <strong>{{ control?.label || 'No control' }}</strong>
        <span>{{ control?.detail || 'No seats allocated' }}</span>
      </div>
    </div>

    <div
      class="chamber-parliament"
      :class="{
        'chamber-parliament--compact': compact,
        'chamber-parliament--dots': viewMode === 'dots',
      }"
      role="img"
      :aria-label="vizAriaLabel"
    >
      <div class="chamber-parliament-toolbar">
        <button type="button" class="chamber-zoom-reset" @click="resetVizZoom">
          Reset view
        </button>
        <span class="chamber-parliament-hint" aria-hidden="true">Scroll or pinch to zoom · drag to pan</span>
      </div>

      <!-- Congress = hemicycle; Seat dots = fixed grid — both use fixed SVG space + zoom -->
      <svg
        v-if="viewMode === 'congress'"
        ref="vizSvgRef"
        class="chamber-svg chamber-svg--parliament"
        :viewBox="CHAMBER_VIZ_VIEWBOX"
        preserveAspectRatio="xMidYMid meet"
      >
        <g :transform="zoomTransformStr">
          <line
            class="chamber-half-line-svg"
            :x1="parliamentLayout.centerX"
            :y1="parliamentLayout.lineY1"
            :x2="parliamentLayout.centerX"
            :y2="parliamentLayout.lineY2"
          />
          <circle
            v-for="seat in parliamentLayout.seats"
            :key="seat.key"
            class="chamber-svg-seat"
            :class="{ 'chamber-seat--coalition': coalitionParties.has(seat.party) }"
            :cx="seat.x"
            :cy="seat.y"
            :r="seat.r"
            :fill="seat.color"
          >
            <title>{{ seat.title }}</title>
          </circle>
          <text
            class="chamber-svg-hemi-label chamber-svg-hemi-label--gov"
            :x="parliamentLayout.labelGov.x"
            :y="parliamentLayout.labelGov.y"
            text-anchor="start"
          >Government</text>
          <text
            class="chamber-svg-hemi-label chamber-svg-hemi-label--opp"
            :x="parliamentLayout.labelOpp.x"
            :y="parliamentLayout.labelOpp.y"
            text-anchor="end"
          >Opposition</text>
        </g>
      </svg>
      <svg
        v-else
        ref="vizSvgRef"
        class="chamber-svg chamber-svg--seat-grid"
        :viewBox="CHAMBER_VIZ_VIEWBOX"
        preserveAspectRatio="xMidYMid meet"
      >
        <g :transform="zoomTransformStr">
          <circle
            v-for="seat in gridLayout.seats"
            :key="seat.key"
            class="chamber-svg-seat chamber-svg-seat--grid"
            :class="{ 'chamber-seat--coalition': coalitionParties.has(seat.party) }"
            :cx="seat.x"
            :cy="seat.y"
            :r="seat.r"
            :fill="seat.color"
          >
            <title>{{ seat.title }}</title>
          </circle>
        </g>
      </svg>
    </div>

    <div class="chamber-legend">
      <div v-for="party in partyRows" :key="party.party" class="chamber-legend-row">
        <PartyBadge :party="party.party" abbreviated />
        <strong>{{ party.seats }}</strong>
      </div>
    </div>
  </section>
</template>

<script>
import { zoom, zoomIdentity } from 'd3-zoom'
import { select } from 'd3-selection'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PARTIES } from '../../domain/elections'
import { buildGridSeatLayout, buildParliamentSeatLayout, CHAMBER_VIZ_VIEWBOX } from '../../domain/elections/chambers/parliamentLayout'
import { chamberControlStyle } from '../../domain/elections/chambers/controlStyles'
import { useFormStore } from '../../stores/formStore'
import PartyBadge from './PartyBadge.vue'

export default {
  name: 'ChamberComposition',
  components: { PartyBadge },
  props: {
    title: { type: String, required: true },
    eyebrow: { type: String, default: 'House Makeup' },
    seats: { type: Object, required: true },
    control: { type: Object, default: null },
    compact: { type: Boolean, default: false },
    defaultView: { type: String, default: 'congress' },
  },
  setup(props) {
    const store = useFormStore()
    const viewMode = ref(props.defaultView === 'dots' ? 'dots' : 'congress')
    const coalitionParties = computed(() => new Set(props.control?.parties || []))
    const controlCardStyle = computed(() => chamberControlStyle(props.control, store.partyMeta))

    const orderedParties = computed(() => {
      const coalition = props.control?.parties || []
      const rest = PARTIES
        .filter((party) => !coalition.includes(party))
        .sort((a, b) => Number(props.seats?.[b] || 0) - Number(props.seats?.[a] || 0) || PARTIES.indexOf(a) - PARTIES.indexOf(b))
      return [...coalition, ...rest]
    })

    const partyRows = computed(() => PARTIES
      .map((party) => ({ party, seats: Number(props.seats?.[party] || 0) }))
      .filter((party) => party.seats > 0)
      .sort((a, b) => b.seats - a.seats || PARTIES.indexOf(a.party) - PARTIES.indexOf(b.party)))

    const seatList = computed(() => orderedParties.value.flatMap((party) => {
      const seatCount = Number(props.seats?.[party] || 0)
      return Array.from({ length: seatCount }, (_, index) => ({
        key: `${party}-${index}`,
        party,
        color: store.partyMeta[party]?.color || '#9b9a97',
        title: `${store.partyMeta[party]?.name || party} seat`,
      }))
    }))

    const parliamentLayout = computed(() => buildParliamentSeatLayout(seatList.value, { compact: props.compact }))
    const gridLayout = computed(() => buildGridSeatLayout(seatList.value, { compact: props.compact }))

    const vizAriaLabel = computed(() => {
      const mode = viewMode.value === 'congress' ? 'congress hemicycle' : 'rectangular seat grid'
      return `${props.title} ${mode} composition`
    })

    const vizSvgRef = ref(null)
    const zoomAttachedTo = ref(null)
    const zoomBehavior = ref(null)
    const zoomTransform = ref(zoomIdentity)

    const zoomTransformStr = computed(() => zoomTransform.value.toString())

    function detachVizZoom() {
      const prev = zoomAttachedTo.value
      if (prev) {
        select(prev).on('.zoom', null)
        zoomAttachedTo.value = null
      }
      zoomBehavior.value = null
    }

    function attachVizZoom() {
      detachVizZoom()
      const el = vizSvgRef.value
      if (!el) return
      const svg = select(el)
      const z = zoom()
        .scaleExtent([0.4, 14])
        .filter((event) => {
          if (event.type === 'dblclick') return false
          return (!event.ctrlKey || event.type === 'wheel') && !event.button
        })
        .on('zoom', (event) => {
          zoomTransform.value = event.transform
        })
      svg.call(z)
      zoomBehavior.value = z
      zoomAttachedTo.value = el
      svg.call(z.transform, zoomIdentity)
      zoomTransform.value = zoomIdentity
    }

    function resetVizZoom() {
      const el = vizSvgRef.value
      const z = zoomBehavior.value
      if (!el || !z) {
        zoomTransform.value = zoomIdentity
        return
      }
      select(el).transition().duration(200).call(z.transform, zoomIdentity)
    }

    onMounted(() => {
      nextTick(attachVizZoom)
    })

    onBeforeUnmount(() => {
      detachVizZoom()
    })

    watch(viewMode, () => {
      zoomTransform.value = zoomIdentity
      nextTick(() => attachVizZoom())
    })

    watch(
      () => [JSON.stringify(props.seats), props.compact],
      () => {
        nextTick(() => {
          zoomTransform.value = zoomIdentity
          if (vizSvgRef.value && zoomBehavior.value) {
            select(vizSvgRef.value).call(zoomBehavior.value.transform, zoomIdentity)
          } else {
            attachVizZoom()
          }
        })
      },
    )

    return {
      CHAMBER_VIZ_VIEWBOX,
      coalitionParties,
      controlCardStyle,
      gridLayout,
      parliamentLayout,
      partyRows,
      resetVizZoom,
      viewMode,
      vizAriaLabel,
      vizSvgRef,
      zoomTransformStr,
    }
  },
}
</script>

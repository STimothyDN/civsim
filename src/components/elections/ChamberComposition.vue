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
            :class="{ 'chamber-seat--coalition': coalitionParties.has(seat.party), 'chamber-seat--hover': hoveredSeat?.key === seat.key }"
            :cx="seat.x"
            :cy="seat.y"
            :r="hoveredSeat?.key === seat.key ? seat.r * 1.3 : seat.r"
            :fill="seat.color"
            @mouseenter="onSeatHover($event, seat)"
            @mouseleave="onSeatLeave"
          />
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
            :class="{ 'chamber-seat--coalition': coalitionParties.has(seat.party), 'chamber-seat--hover': hoveredSeat?.key === seat.key }"
            :cx="seat.x"
            :cy="seat.y"
            :r="hoveredSeat?.key === seat.key ? seat.r * 1.3 : seat.r"
            :fill="seat.color"
            @mouseenter="onSeatHover($event, seat)"
            @mouseleave="onSeatLeave"
          />
        </g>
      </svg>
    </div>

    <div class="chamber-legend">
      <div v-for="party in partyRows" :key="party.party" class="chamber-legend-row">
        <PartyBadge :party="party.party" abbreviated />
        <strong>{{ party.seats }}</strong>
      </div>
    </div>

    <SeatTooltip
      :visible="!!hoveredSeat"
      :target-el="hoveredTargetEl"
      :party="hoveredSeat?.party"
      :party-name="hoveredPartyName"
      :jurisdiction="hoveredJurisdiction"
      :jurisdiction-label="chamberType === 'prelates' ? 'Responsible for' : 'Strongest support from'"
      :vote-share="hoveredVoteShare"
      :support-metric="hoveredSupportMetric"
      :chamber-type="chamberType"
      :representative-name="hoveredRepresentativeName"
      :representative-title="hoveredRepresentativeTitle"
      :is-incumbent="hoveredRepresentativeIncumbent"
    />
  </section>
</template>

<script>
import { zoom, zoomIdentity } from 'd3-zoom'
import { select } from 'd3-selection'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PARTIES } from '../../domain/elections'
import { buildGridSeatLayout, buildParliamentSeatLayout, CHAMBER_VIZ_VIEWBOX } from '../../domain/elections/chambers/parliamentLayout'
import { chamberControlStyle } from '../../domain/elections/chambers/controlStyles'
import { formatSeatTooltip, generateSeatDetails } from '../../domain/elections/chambers/jurisdictionLabels'
import { num } from '../../domain/elections/normalization/numbers'
import { getSeatOffset } from '../../domain/elections/constants/seatOffsets'
import { useElectionStore } from '../../stores/electionStore'
import { useFormStore } from '../../stores/formStore'
import PartyBadge from './PartyBadge.vue'
import SeatTooltip from './SeatTooltip.vue'

export default {
  name: 'ChamberComposition',
  components: { PartyBadge, SeatTooltip },
  props: {
    title: { type: String, required: true },
    eyebrow: { type: String, default: 'House Makeup' },
    seats: { type: Object, required: true },
    control: { type: Object, default: null },
    compact: { type: Boolean, default: false },
    defaultView: { type: String, default: 'congress' },
    jurisdictionLabels: { type: Array, default: null },
    chamberType: { type: String, default: 'assembly' }, // 'assembly' | 'prelates'
    scope: { type: String, default: 'national' }, // 'national' | 'regional' | 'provincial'
    provinces: { type: Array, default: () => [] },
    selectedProvince: { type: Object, default: null },
    selectedRegionName: { type: String, default: null },
    seatDetails: { type: Array, default: null }, // Full seat data with vote shares
  },
  setup(props) {
    const store = useFormStore()
    const electionStore = useElectionStore()
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

    const seatList = computed(() => {
      let seatIndex = 0
      return orderedParties.value.flatMap((party) => {
        const seatCount = Number(props.seats?.[party] || 0)
        return Array.from({ length: seatCount }, (_, index) => {
          const jurisdiction = props.jurisdictionLabels?.[seatIndex]
          const partyName = store.partyMeta[party]?.name || party
          const title = formatSeatTooltip(partyName, jurisdiction, props.chamberType)
          seatIndex += 1
          return {
            key: `${party}-${index}`,
            party,
            color: store.partyMeta[party]?.color || '#9b9a97',
            title,
          }
        })
      })
    })

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

    // Seat hover state for custom tooltip
    const hoveredSeat = ref(null)
    const hoveredTargetEl = ref(null)
    const hoveredPartyName = computed(() => {
      if (!hoveredSeat.value?.party) return ''
      return store.partyMeta[hoveredSeat.value.party]?.name || hoveredSeat.value.party
    })
    const hoveredJurisdiction = computed(() => {
      if (!hoveredSeat.value) return ''
      const seatIndex = seatList.value.findIndex((s) => s.key === hoveredSeat.value.key)
      return props.jurisdictionLabels?.[seatIndex] || ''
    })

    const hoveredVoteShare = computed(() => {
      if (!hoveredSeat.value) return null
      const seatIndex = seatList.value.findIndex((s) => s.key === hoveredSeat.value.key)
      return computedSeatDetails.value?.[seatIndex]?.voteShare ?? null
    })

    const hoveredSupportMetric = computed(() => {
      if (!hoveredSeat.value) return null
      const seatIndex = seatList.value.findIndex((s) => s.key === hoveredSeat.value.key)
      return computedSeatDetails.value?.[seatIndex]?.supportMetric ?? null
    })

    const hoveredRepresentativeName = computed(() => {
      if (!hoveredSeat.value) return ''
      const seatIndex = seatList.value.findIndex((s) => s.key === hoveredSeat.value.key)
      const seat = computedSeatDetails.value?.[seatIndex]
      if (!seat) return ''
      const nameIndex = seat.seatIndex + getSeatOffset(props.scope, props.chamberType)
      return electionStore.getRepresentativeName(seat.party, nameIndex) || ''
    })

    const hoveredRepresentativeTitle = computed(() => {
      return props.chamberType === 'prelates' ? 'Prelate' : 'Assemblyperson'
    })

    const hoveredRepresentativeIncumbent = computed(() => {
      if (!hoveredSeat.value) return null
      const seatIndex = seatList.value.findIndex((s) => s.key === hoveredSeat.value.key)
      const seat = computedSeatDetails.value?.[seatIndex]
      if (!seat) return null
      const nameIndex = seat.seatIndex + getSeatOffset(props.scope, props.chamberType)
      return electionStore.isRepresentativeIncumbent(seat.party, nameIndex)
    })

    // Generate seat details if not provided (for backward compatibility)
    const computedSeatDetails = computed(() => {
      if (props.seatDetails) return props.seatDetails
      if (!props.jurisdictionLabels) return []

      return generateSeatDetails({
        seats: props.seats,
        chamberType: props.chamberType,
        scope: props.scope,
        provinces: props.provinces,
        selectedProvince: props.selectedProvince,
        selectedRegionName: props.selectedRegionName,
      })
    })

    // Build caucus lists with detailed seat information
    const caucusLists = computed(() => {
      if (computedSeatDetails.value.length === 0) return []

      // Group seats by party
      const byParty = {}
      for (const detail of computedSeatDetails.value) {
        if (!byParty[detail.party]) {
          byParty[detail.party] = []
        }
        byParty[detail.party].push(detail)
      }

      const caucuses = []

      for (const party of PARTIES) {
        const partySeats = byParty[party]
        if (!partySeats || partySeats.length === 0) continue

        const color = store.partyMeta[party]?.color || '#9b9a97'

        // Sort seats by support metric (strongest first)
        const sortedSeats = [...partySeats].sort((a, b) => {
          const aVal = num(a.supportMetric)
          const bVal = num(b.supportMetric)
          if (!isFinite(aVal)) return 1
          if (!isFinite(bVal)) return -1
          return bVal - aVal
        })

        // Calculate average support for the caucus
        const validSupports = sortedSeats.map((s) => num(s.supportMetric)).filter((v) => isFinite(v) && v >= 0)
        const avgSupport = validSupports.length > 0
          ? validSupports.reduce((sum, v) => sum + v, 0) / validSupports.length
          : 0

        // Identify caucus leader (seat with highest support)
        const caucusLeader = sortedSeats[0] || null

        // Check if this party is the governing/leading party
        const isGoverningCaucus = props.control?.leaderParty === party

        caucuses.push({
          party,
          seatCount: partySeats.length,
          seats: sortedSeats,
          avgSupport,
          caucusLeader,
          isGoverningCaucus,
          cardStyle: {
            borderColor: `${color}44`,
            backgroundColor: `${color}0a`,
          },
        })
      }

      // Sort caucuses by average support (strongest first)
      return caucuses.sort((a, b) => {
        const aVal = num(a.avgSupport)
        const bVal = num(b.avgSupport)
        if (!isFinite(aVal)) return 1
        if (!isFinite(bVal)) return -1
        return bVal - aVal
      })
    })

    function formatVoteShare(share) {
      const safe = num(share)
      if (!isFinite(safe) || safe < 0) return '0.0%'
      return `${(safe * 100).toFixed(1)}%`
    }

    function formatSupport(metric) {
      const safe = num(metric)
      if (!isFinite(safe) || safe < 0) return '0.0'
      return `${safe.toFixed(1)}`
    }

    function getRepresentativeTitle(party, seatIndex, type) {
      const nameIndex = seatIndex + getSeatOffset(props.scope, type)
      // Check if we have a custom name
      const customName = electionStore.getRepresentativeName(party, nameIndex)
      if (customName) {
        const role = type === 'prelates' ? 'Prelate' : 'Assemblyperson'
        return `${role} ${customName}`
      }
      // Fall back to generic title
      return type === 'prelates' ? 'Prelate' : 'Assemblyperson'
    }

    function onSeatHover(event, seat) {
      hoveredSeat.value = seat
      hoveredTargetEl.value = event.target
    }

    function onSeatLeave() {
      hoveredSeat.value = null
      hoveredTargetEl.value = null
    }

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

    const seatsSignature = computed(() => {
      const seats = props.seats
      if (!Array.isArray(seats)) return ''
      let sig = ''
      for (let i = 0; i < seats.length; i++) {
        const s = seats[i]
        if (s && typeof s === 'object') sig += (s.party || s.id || '') + ':' + (s.count ?? s.seats ?? '') + '|'
        else sig += String(s) + '|'
      }
      return sig
    })

    watch(
      () => [seatsSignature.value, props.compact],
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
      hoveredSeat,
      hoveredTargetEl,
      hoveredPartyName,
      hoveredJurisdiction,
      hoveredVoteShare,
      hoveredSupportMetric,
      hoveredRepresentativeName,
      hoveredRepresentativeTitle,
      hoveredRepresentativeIncumbent,
      onSeatHover,
      onSeatLeave,
      formatVoteShare,
      formatSupport,
      getRepresentativeTitle,
    }
  },
}
</script>

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
      v-if="viewMode === 'congress'"
      class="chamber-congress-house"
      :class="{ 'chamber-congress-house--compact': compact }"
      role="img"
      :aria-label="`${title} congress-style composition`"
    >
      <svg class="chamber-svg" viewBox="0 0 720 360" aria-hidden="true">
        <path
          v-for="arc in chamberArcs"
          :key="arc.key"
          class="chamber-arc-guide"
          :d="arc.path"
        />
        <line class="chamber-half-line-svg" x1="360" y1="72" x2="360" y2="330" />
        <g>
          <circle
            v-for="seat in congressSeatDots"
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
        </g>
      </svg>
      <span class="chamber-government-label">Government</span>
      <span class="chamber-opposition-label">Opposition</span>
    </div>

    <div v-else class="chamber-seat-arc" :class="{ 'chamber-seat-arc--compact': compact }" role="img" :aria-label="`${title} seat-dot composition`">
      <svg class="chamber-svg chamber-svg--dots" viewBox="0 0 720 300" aria-hidden="true">
        <circle
        v-for="seat in seatDots"
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
      </svg>
    </div>

    <div class="chamber-legend">
      <div v-for="party in partyRows" :key="party.party" class="chamber-legend-row">
        <PartyBadge :party="party.party" short />
        <strong>{{ party.seats }}</strong>
      </div>
    </div>
  </section>
</template>

<script>
import { computed, ref } from 'vue'
import { PARTIES } from '../../domain/elections'
import { chamberControlStyle } from '../../domain/elections/chambers/controlStyles'
import { useFormStore } from '../../stores/formStore'
import PartyBadge from './PartyBadge.vue'

const SVG_WIDTH = 720
const HEMICYCLE_HEIGHT = 360
const GRID_HEIGHT = 300

function distributeSeatRows(totalSeats, compact) {
  if (totalSeats <= 0) return []
  const maxRows = compact ? 7 : 9
  const rowCount = Math.min(maxRows, Math.max(3, Math.ceil(Math.sqrt(totalSeats) / 2.2)))
  const weights = Array.from({ length: rowCount }, (_, index) => index + 1)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const rows = weights.map((weight) => {
    const raw = totalSeats * weight / totalWeight
    return { count: Math.floor(raw), remainder: raw - Math.floor(raw) }
  })
  let missing = totalSeats - rows.reduce((sum, row) => sum + row.count, 0)
  rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => b.row.remainder - a.row.remainder || b.index - a.index)
    .forEach(({ row }) => {
      if (missing <= 0) return
      row.count += 1
      missing -= 1
    })
  return rows.map((row) => row.count).filter(Boolean)
}

function congressGeometry(totalSeats, compact) {
  const rowCounts = distributeSeatRows(totalSeats, compact)
  const rowMax = Math.max(1, rowCounts.length - 1)

  return rowCounts.flatMap((count, rowIndex) => {
    const rowRatio = rowMax ? rowIndex / rowMax : 1
    const radius = (compact ? 86 : 92) + rowRatio * (compact ? 198 : 220)
    const yScale = compact ? 0.62 : 0.66
    const centerX = SVG_WIDTH / 2
    const centerY = compact ? 318 : 326
    const start = Math.PI + 0.08
    const end = Math.PI * 2 - 0.08

    return Array.from({ length: count }, (_, seatIndex) => {
      const angle = count === 1
        ? Math.PI * 1.5
        : start + ((seatIndex + 0.5) * (end - start) / count)
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * yScale,
        r: compact ? 5.7 : 6.7,
        rowIndex,
      }
    })
  }).sort((a, b) => a.x - b.x || b.y - a.y)
}

function congressPositions(seats, compact) {
  const positions = congressGeometry(seats.length, compact)
  return seats.map((seat, index) => ({
    ...seat,
    x: positions[index]?.x ?? SVG_WIDTH / 2,
    y: positions[index]?.y ?? HEMICYCLE_HEIGHT - 30,
    r: positions[index]?.r ?? 6,
  }))
}

function chamberArcGuides(totalSeats, compact) {
  const rowCounts = distributeSeatRows(totalSeats, compact)
  const rowMax = Math.max(1, rowCounts.length - 1)
  const centerX = SVG_WIDTH / 2
  const centerY = compact ? 318 : 326
  const yScale = compact ? 0.62 : 0.66
  const start = Math.PI + 0.08
  const end = Math.PI * 2 - 0.08

  return rowCounts.map((count, rowIndex) => {
    const rowRatio = rowMax ? rowIndex / rowMax : 1
    const radius = (compact ? 86 : 92) + rowRatio * (compact ? 198 : 220)
    const x1 = centerX + Math.cos(start) * radius
    const y1 = centerY + Math.sin(start) * radius * yScale
    const x2 = centerX + Math.cos(end) * radius
    const y2 = centerY + Math.sin(end) * radius * yScale
    return {
      key: `arc-${rowIndex}-${count}`,
      path: `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius.toFixed(2)} ${(radius * yScale).toFixed(2)} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    }
  })
}

function gridPositions(seats, compact) {
  const columns = compact ? 30 : 36
  const gap = compact ? 17 : 18
  const radius = compact ? 5.2 : 5.8
  const rows = Math.max(1, Math.ceil(seats.length / columns))
  const width = (Math.min(columns, seats.length || columns) - 1) * gap
  const startX = (SVG_WIDTH - width) / 2
  const startY = Math.max(28, (GRID_HEIGHT - (rows - 1) * gap) / 2)

  return seats.map((seat, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const rowCount = Math.min(columns, seats.length - row * columns)
    const rowWidth = (rowCount - 1) * gap
    const rowStartX = (SVG_WIDTH - rowWidth) / 2
    return {
      ...seat,
      x: rowStartX + column * gap,
      y: startY + row * gap,
      r: radius,
    }
  })
}

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
    const seatDots = computed(() => orderedParties.value.flatMap((party) => {
      const seatCount = Number(props.seats?.[party] || 0)
      return Array.from({ length: seatCount }, (_, index) => ({
        key: `${party}-${index}`,
        party,
        color: store.partyMeta[party]?.color || '#9b9a97',
        title: `${store.partyMeta[party]?.name || party} seat`,
      }))
    }))
    const congressSeatDots = computed(() => congressPositions(seatDots.value, props.compact))
    const chamberArcs = computed(() => chamberArcGuides(seatDots.value.length, props.compact))
    const seatDotsWithPositions = computed(() => gridPositions(seatDots.value, props.compact))

    return { chamberArcs, coalitionParties, congressSeatDots, controlCardStyle, partyRows, seatDots: seatDotsWithPositions, viewMode }
  },
}
</script>

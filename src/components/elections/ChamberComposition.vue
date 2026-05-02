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
      <span class="chamber-half-line"></span>
      <span class="chamber-government-label">Government</span>
      <span class="chamber-opposition-label">Opposition</span>
      <span
        v-for="seat in congressSeatDots"
        :key="seat.key"
        class="chamber-congress-seat"
        :class="{ 'chamber-seat--coalition': coalitionParties.has(seat.party) }"
        :style="seat.style"
        :title="seat.title"
      ></span>
    </div>

    <div v-else class="chamber-seat-arc" :class="{ 'chamber-seat-arc--compact': compact }" role="img" :aria-label="`${title} seat-dot composition`">
      <span
        v-for="seat in seatDots"
        :key="seat.key"
        class="chamber-seat"
        :class="{ 'chamber-seat--coalition': coalitionParties.has(seat.party) }"
        :style="{ backgroundColor: seat.color }"
        :title="seat.title"
      ></span>
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
import { PARTIES, PARTY_META } from '../../domain/elections'
import { chamberControlStyle } from '../../domain/elections/chambers/controlStyles'
import PartyBadge from './PartyBadge.vue'

function distributeSeatRows(totalSeats, compact) {
  if (totalSeats <= 0) return []
  const maxRows = compact ? 9 : 12
  const rowCount = Math.min(maxRows, Math.max(4, Math.ceil(Math.sqrt(totalSeats) / 1.9)))
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
    const xRadius = 12 + rowRatio * 46
    const yRadius = 10 + rowRatio * (compact ? 58 : 76)

    return Array.from({ length: count }, (_, seatIndex) => {
      const angle = count === 1
        ? Math.PI / 2
        : Math.PI - ((seatIndex + 0.5) * Math.PI / count)
      return { x: 50 + Math.cos(angle) * xRadius, y: 94 - Math.sin(angle) * yRadius, rowIndex }
    })
  }).sort((a, b) => a.x - b.x || b.y - a.y)
}

function congressPositions(seats, compact) {
  const positions = congressGeometry(seats.length, compact)
  return seats.map((seat, index) => ({
    ...seat,
    style: {
      left: `${positions[index]?.x ?? 50}%`,
      top: `${positions[index]?.y ?? 92}%`,
      backgroundColor: seat.color,
    },
  }))
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
    const viewMode = ref(props.defaultView === 'dots' ? 'dots' : 'congress')
    const coalitionParties = computed(() => new Set(props.control?.parties || []))
    const controlCardStyle = computed(() => chamberControlStyle(props.control))
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
        color: PARTY_META[party]?.color || '#9b9a97',
        title: `${PARTY_META[party]?.name || party} seat`,
      }))
    }))
    const congressSeatDots = computed(() => congressPositions(seatDots.value, props.compact))

    return { coalitionParties, congressSeatDots, controlCardStyle, partyRows, seatDots, viewMode }
  },
}
</script>

<template>
  <section class="caucus-list-card">
    <div class="caucus-list-card-header">
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h3>{{ title }}</h3>
      </div>
      <div class="caucus-list-majority">
        <span>Total Members</span>
        <strong>{{ totalSeats }}</strong>
      </div>
    </div>

    <div v-if="caucusLists.length > 0" class="caucus-list-content">
      <div
        v-for="caucus in caucusLists"
        :key="caucus.party"
        class="caucus-item"
        :style="caucus.cardStyle"
      >
        <!-- Party Header -->
        <button
          type="button"
          class="caucus-item-header"
          :class="{ 'caucus-item-header--expanded': isCaucusExpanded(caucus.party) }"
          @click="toggleCaucus(caucus.party)"
        >
          <div class="caucus-item-main">
            <span class="caucus-item-icon" :class="{ 'caucus-item-icon--expanded': isCaucusExpanded(caucus.party) }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </span>
            <PartyBadge :party="caucus.party" abbreviated />
            <span class="caucus-item-count">{{ caucus.seatCount }} seats</span>
          </div>
          <div class="caucus-item-badges">
            <span v-if="caucus.isGoverningCaucus" class="caucus-badge caucus-badge--government">🏛️ Government</span>
            <span v-if="caucus.isMinorityPartner" class="caucus-badge caucus-badge--minority">🤝 Minority Partner</span>
            <span v-if="caucus.isOppositionLeader" class="caucus-badge caucus-badge--opposition">⚔️ Official Opposition</span>
          </div>
          <div class="caucus-item-metrics">
            <span class="caucus-metric">
              <span class="caucus-metric-label">Avg Support</span>
              <span class="caucus-metric-value">{{ formatSupport(caucus.avgSupport) }}%</span>
            </span>
          </div>
        </button>

        <!-- Seat Table -->
        <Transition name="caucus-table-collapse">
          <div v-show="isCaucusExpanded(caucus.party)" class="caucus-table-wrapper">
            <table class="caucus-data-table">
              <thead>
                <tr>
                  <th class="col-rank">#</th>
                  <th class="col-representative">Representative</th>
                  <th class="col-jurisdiction">Jurisdiction</th>
                  <th class="col-vote-share">Vote Share</th>
                  <th class="col-support">Support</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(seat, index) in caucus.seats"
                  :key="seat.seatIndex"
                  class="caucus-data-row"
                  :class="{ 'caucus-data-row--leader': index === 0 }"
                >
                  <td class="col-rank">
                    {{ index + 1 }}
                    <span v-if="index === 0" class="leader-indicator" title="Caucus Leader">👑</span>
                  </td>
                  <td class="col-representative">
                    <span class="representative-name">{{ getRepresentativeTitle(seat.party, seat.seatIndex, chamberType, index === 0 && caucus.isGoverningCaucus, index === 0 && !caucus.isGoverningCaucus, index === 0 && caucus.isOppositionLeader) }}</span>
                    <IncumbencyBadge :party="seat.party" :seat-index="seat.seatIndex + getSeatOffset(scope, chamberType)" />
                    <span v-if="index === 0 && caucus.isGoverningCaucus" class="house-leader-badge" title="House Leader">🏛️</span>
                    <span v-if="index === 0 && caucus.isOppositionLeader" class="opposition-badge" title="Opposition Leader">⚔️</span>
                  </td>
                  <td class="col-jurisdiction">{{ seat.jurisdiction }}</td>
                  <td class="col-vote-share">{{ formatVoteShare(seat.voteShare) }}</td>
                  <td class="col-support">
                    <div class="support-bar-mini">
                      <div class="support-bar-mini-fill" :style="{ width: `${seat.supportMetric}%` }"></div>
                      <span class="support-bar-mini-value">{{ formatSupport(seat.supportMetric) }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Transition>
      </div>
    </div>

    <div v-else class="caucus-list-empty">
      <span>No caucus data available</span>
    </div>
  </section>
</template>

<script>
import { computed, ref } from 'vue'
import PartyBadge from './PartyBadge.vue'
import IncumbencyBadge from './IncumbencyBadge.vue'
import { getSeatOffset } from '../../domain/elections/constants/seatOffsets'
import { useElectionStore } from '../../stores/electionStore'
import { chamberControlStyle } from '../../domain/elections/chambers/controlStyles'
import { generateSeatDetails } from '../../domain/elections/chambers/jurisdictionLabels'
import { lowerHouseLeaderTitle, upperHouseLeaderTitle } from '../../domain/elections'
import { num } from '../../domain/elections/normalization/numbers'

export default {
  name: 'CaucusListCard',
  components: { PartyBadge, IncumbencyBadge },
  props: {
    title: { type: String, required: true },
    eyebrow: { type: String, default: 'Caucus Breakdown' },
    seats: { type: Object, required: true },
    control: { type: Object, default: null },
    chamberType: { type: String, default: 'assembly' }, // 'assembly' | 'prelates'
    scope: { type: String, default: 'national' }, // 'national' | 'regional' | 'provincial'
    provinces: { type: Array, default: () => [] },
    jurisdictionLabels: { type: Array, default: () => [] },
    selectedProvince: { type: Object, default: null },
    selectedRegionName: { type: String, default: null },
    compact: { type: Boolean, default: false },
  },
  setup(props) {
    const electionStore = useElectionStore()
    const expandedCaucuses = ref(new Set())

    const totalSeats = computed(() => {
      return Object.values(props.seats || {}).reduce((sum, count) => sum + (count || 0), 0)
    })

    const controlCardStyle = computed(() => {
      return chamberControlStyle(props.control)
    })

    const seatDetails = computed(() => {
      return generateSeatDetails({
        seats: props.seats,
        chamberType: props.chamberType,
        scope: props.scope,
        provinces: props.provinces,
        selectedProvince: props.selectedProvince,
        selectedRegionName: props.selectedRegionName,
      })
    })

    const caucusLists = computed(() => {
      const details = seatDetails.value
      const partyGroups = {}

      details.forEach((seat) => {
        if (!partyGroups[seat.party]) {
          partyGroups[seat.party] = {
            party: seat.party,
            seats: [],
            totalSupport: 0,
          }
        }
        partyGroups[seat.party].seats.push(seat)
        partyGroups[seat.party].totalSupport += seat.supportMetric || 0
      })

      return Object.values(partyGroups)
        .map((caucus) => {
          const seatCount = caucus.seats.length
          const isGoverningCaucus = caucus.party === props.control?.leaderParty
          const cardStyle = chamberControlStyle({
            leaderParty: caucus.party,
            isGoverning: isGoverningCaucus,
          })

          // Sort seats by support (highest first) - leader is first
          const sortedSeats = [...caucus.seats].sort((a, b) => b.supportMetric - a.supportMetric)

          return {
            party: caucus.party,
            seatCount,
            seats: sortedSeats,
            avgSupport: seatCount > 0 ? caucus.totalSupport / seatCount : 0,
            isGoverningCaucus,
            cardStyle,
          }
        })
        .sort((a, b) => b.seatCount - a.seatCount)
        .map((caucus, index, sortedCaucuses) => {
          // Determine if this is the opposition leader (largest non-governing caucus)
          // Exclude parties that are in the governing coalition (leader + support parties)
          const governingParties = new Set([props.control?.leaderParty, ...(props.control?.supportParties || [])])
          const nonGoverningCaucuses = sortedCaucuses.filter(c => !governingParties.has(c.party))
          const isOppositionLeader = !governingParties.has(caucus.party) && nonGoverningCaucuses.length > 0 && caucus === nonGoverningCaucuses[0]

          // Determine if this is a minority partner (support party in minority government)
          const isMinorityPartner = props.control?.supportParties?.includes(caucus.party) || false

          return {
            ...caucus,
            isOppositionLeader,
            isMinorityPartner,
          }
        })
    })

    function isCaucusExpanded(party) {
      return expandedCaucuses.value.has(party)
    }

    function toggleCaucus(party) {
      if (expandedCaucuses.value.has(party)) {
        expandedCaucuses.value.delete(party)
      } else {
        expandedCaucuses.value.add(party)
      }
    }

    function formatSupport(metric) {
      const safe = num(metric)
      if (!isFinite(safe) || safe < 0) return '0.0'
      return `${safe.toFixed(1)}`
    }

    function formatVoteShare(share) {
      const safe = num(share)
      if (!isFinite(safe) || safe < 0) return '0.0%'
      return `${(safe * 100).toFixed(1)}%`
    }

    function getRepresentativeTitle(party, seatIndex, type, isHouseLeader = false, isCaucusLeader = false, isOppositionLeader = false) {
      const nameIndex = seatIndex + getSeatOffset(props.scope, type)
      const customName = electionStore.getRepresentativeName(party, nameIndex)

      // If this is the house leader (governing party), use the leader title
      if (isHouseLeader) {
        const leaderTitle = type === 'prelates' ? upperHouseLeaderTitle(props.scope) : lowerHouseLeaderTitle(props.scope)
        if (customName) {
          return `${leaderTitle} ${customName}`
        }
        return leaderTitle
      }

      // If this is the opposition leader (largest non-governing caucus)
      if (isOppositionLeader) {
        if (customName) {
          return `Opposition Leader ${customName}`
        }
        return 'Opposition Leader'
      }

      // If this is a caucus leader (first person in non-governing caucus)
      if (isCaucusLeader) {
        if (customName) {
          return `Caucus Leader ${customName}`
        }
        return 'Caucus Leader'
      }

      // Regular representative
      if (customName) {
        const role = type === 'prelates' ? 'Prelate' : 'Assemblyperson'
        return `${role} ${customName}`
      }
      return type === 'prelates' ? 'Prelate' : 'Assemblyperson'
    }

    return {
      totalSeats,
      controlCardStyle,
      caucusLists,
      isCaucusExpanded,
      toggleCaucus,
      formatSupport,
      formatVoteShare,
      getRepresentativeTitle,
      getSeatOffset,
    }
  },
}
</script>

<style scoped>
.caucus-list-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  min-width: 0;
}

.caucus-list-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.caucus-list-card-header h3 {
  margin: 0;
  font-family: 'Cinzel', serif;
  font-size: 1.15rem;
  font-weight: 700;
}

.caucus-list-majority {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.caucus-list-majority span {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.caucus-list-majority strong {
  font-size: 1.1rem;
  color: var(--accent);
  font-weight: 700;
}

.caucus-list-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.caucus-item {
  background: var(--bg-surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.caucus-item-header {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}

.caucus-item-header:hover {
  background: var(--bg-input);
}

.caucus-item-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.caucus-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.caucus-item-icon--expanded {
  transform: rotate(90deg);
}

.caucus-item-icon svg {
  width: 100%;
  height: 100%;
}

.caucus-item-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.caucus-item-badges {
  display: flex;
  align-items: center;
  gap: 6px;
}

.caucus-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.caucus-badge--government {
  background: linear-gradient(135deg, #d4a84322, #d4a84311);
  border: 1px solid #d4a84366;
  color: #d4a843;
}

.caucus-badge--minority {
  background: linear-gradient(135deg, #3b82f622, #3b82f611);
  border: 1px solid #3b82f666;
  color: #3b82f6;
}

.caucus-badge--opposition {
  background: linear-gradient(135deg, #ef444422, #ef444411);
  border: 1px solid #ef444466;
  color: #ef4444;
}

.caucus-item-metrics {
  display: flex;
  align-items: center;
}

.caucus-metric {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 0.8rem;
}

.caucus-metric-label {
  color: var(--text-muted);
}

.caucus-metric-value {
  color: var(--text-secondary);
  font-weight: 700;
}

.caucus-table-wrapper {
  border-top: 1px solid var(--border-subtle);
}

.caucus-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.caucus-data-table th {
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-input);
  font-size: 0.78rem;
}

.caucus-data-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-subtle);
}

.caucus-data-row:last-child td {
  border-bottom: none;
}

.caucus-data-row--leader {
  background: linear-gradient(90deg, rgba(45, 212, 191, 0.06), transparent);
}

.col-rank {
  width: 40px;
  text-align: center;
  color: var(--text-muted);
  font-weight: 600;
}

.leader-indicator {
  font-size: 0.7rem;
  margin-left: 3px;
}

.col-representative {
  min-width: 140px;
}

.representative-name {
  font-weight: 600;
  color: var(--text-primary);
}

.house-leader-badge {
  font-size: 0.75rem;
  margin-left: 6px;
}

.opposition-badge {
  font-size: 0.75rem;
  margin-left: 6px;
}

.col-jurisdiction {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.col-vote-share {
  width: 70px;
  text-align: right;
  font-weight: 500;
  color: var(--text-secondary);
}

.col-support {
  width: 80px;
}

.support-bar-mini {
  position: relative;
  height: 16px;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.support-bar-mini-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--accent-dim), var(--accent));
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
  min-width: 2px;
}

.support-bar-mini-value {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.caucus-list-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* Transition animations */
.caucus-table-collapse-enter-active,
.caucus-table-collapse-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.caucus-table-collapse-enter-from,
.caucus-table-collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.caucus-table-collapse-enter-to,
.caucus-table-collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>

<template>
  <template v-if="county">
    <!-- Zero-height marker just above the sticky block: once it scrolls past
         the pin line, the block is stuck and condenses. -->
    <div ref="sentinelEl" class="baseline-sticky-sentinel" aria-hidden="true"></div>
    <div
      ref="stickyEl"
      class="baseline-sticky"
      :class="{ 'baseline-sticky--condensed': condensed }"
      :style="condensed && reservedHeight ? { minHeight: `${reservedHeight}px` } : null"
    >
      <div ref="cardEl" class="baseline-cards-section">
        <div class="baseline-collapsible baseline-collapsible--full" :aria-hidden="condensed">
          <div>
            <div class="baseline-cards-heading">County Population</div>
            <div class="baseline-leader-grid">
              <div class="overview-hero-call baseline-leader-card population-card">
                <span>Population</span>
                <strong>{{ formatNumber(county.county_population) }}</strong>
                <small class="leader-line">
                  {{ formatSharePercent(county.county_population_share) }} of provincial population
                </small>
              </div>
            </div>

            <template v-if="hasPopulation">
            <div class="baseline-cards-heading baseline-cards-heading--gap">Baseline Vote Share</div>
            <BaselineVoteShareGrid :vote-shares="county.vote_shares" />

            <div class="baseline-cards-heading baseline-cards-heading--gap">Projected {{ upperHouseMemberTitle() }}</div>
            <div class="baseline-leader-grid">
              <div
                v-if="winningParty"
                class="overview-hero-call winner-control-card baseline-leader-card"
                :style="prelateCardStyle"
              >
                <span>County {{ upperHouseMemberTitle() }}</span>
                <strong>
                  <template v-if="prelateName">
                    {{ representativeTitle }} {{ prelateName }}
                    <IncumbencyBadge
                      v-if="prelateSeat"
                      :party="prelateSeat.party"
                      :seat-index="prelateSeat.seatIndex + SEAT_OFFSETS.provincial.prelates"
                    />
                  </template>
                  <template v-else>{{ partyMeta[winningParty]?.name || winningParty }}</template>
                </strong>
                <small class="leader-line">
                  {{ partyMeta[winningParty]?.abbreviation || winningParty }}
                  · {{ formatShareValue(county.vote_shares?.[winningParty]) }} of county vote
                </small>
                <small class="leader-support-line">
                  {{ usesCountyCouncil
                    ? 'Wins this county’s seat outright (winner-take-all council).'
                    : 'Top vote share — would win if this council used winner-take-all.' }}
                </small>
              </div>
            </div>
            </template>
          </div>
        </div>

        <!-- Condensed strip shown while pinned: the same three facts, one line. -->
        <div class="baseline-collapsible baseline-collapsible--compact" :aria-hidden="!condensed">
          <div>
            <div class="baseline-compact">
              <div class="baseline-compact-item">
                <span class="baseline-compact-label">Pop</span>
                <strong>{{ formatNumber(county.county_population) }}</strong>
                <small>{{ formatSharePercent(county.county_population_share) }}</small>
              </div>
              <template v-if="hasPopulation">
                <div class="baseline-compact-item baseline-compact-item--shares">
                  <span class="baseline-compact-label">Vote</span>
                  <div class="baseline-compact-bar" role="img" :aria-label="voteShareSummary">
                    <span
                      v-for="segment in shareSegments"
                      :key="segment.party"
                      :style="{ flexGrow: segment.share, background: segment.color }"
                      :title="`${segment.label} ${segment.display}`"
                    ></span>
                  </div>
                  <small class="baseline-compact-leaders">
                    <span v-for="segment in shareSegments.slice(0, 3)" :key="segment.party">
                      <i :style="{ background: segment.color }"></i>{{ segment.label }} {{ segment.display }}
                    </span>
                  </small>
                </div>
                <div v-if="winningParty" class="baseline-compact-item" :style="prelateCardStyle">
                  <span class="baseline-compact-label">{{ upperHouseMemberTitle() }}</span>
                  <strong class="baseline-compact-member">
                    <i :style="{ background: partyMeta[winningParty]?.color }"></i>
                    {{ prelateName || partyMeta[winningParty]?.name || winningParty }}
                  </strong>
                  <small>{{ partyMeta[winningParty]?.abbreviation || winningParty }}</small>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaselineVoteShareGrid from './BaselineVoteShareGrid.vue'
import IncumbencyBadge from './IncumbencyBadge.vue'
import { useElectionResults } from '../../composables/useElectionResults'
import { useElectionFormatters } from '../../composables/useElectionFormatters'
import { topParty, partyWinnerStyle } from '../../domain/elections/viewHelpers'
import { formatShare } from '../../domain/elections'
import { formatNumber } from '../../domain/formatting'
import { generateSeatDetails } from '../../domain/elections/chambers/jurisdictionLabels'
import { SEAT_OFFSETS } from '../../domain/elections/constants/seatOffsets'
import { useChamberLabels } from '../../composables/useChamberLabels'

export default {
  name: 'BaselineCountyCards',
  components: { BaselineVoteShareGrid, IncumbencyBadge },
  props: {
    provinceIndex: { type: Number, required: true },
    countyIndex: { type: Number, required: true },
  },
  setup(props) {
    const { results, store, electionStore, partyMeta } = useElectionResults()
    const { controlCardStyle } = useElectionFormatters(store)
    const { upperHouseLeaderTitle, upperHouseMemberTitle } = useChamberLabels()

    // Use `results` (current election config) — not baselineResults — because
    // representative names are generated and stored against `results` seat indices.
    // Using baselineResults causes seatIndex mismatches, especially for winner-
    // take-all provinces (>20 counties) where seat distributions differ per election.
    const province = computed(() =>
      results.value?.provinces?.find((p) => p.provinceIndex === props.provinceIndex) || null
    )
    const county = computed(() => province.value?.counties?.[props.countyIndex] || null)

    const hasPopulation = computed(() => Number(county.value?.county_population) > 0)

    const winningParty = computed(() => {
      const shares = county.value?.vote_shares
      if (!shares) return null
      return topParty(shares)
    })

    const usesCountyCouncil = computed(() => (province.value?.counties?.length || 0) > 20)

    const prelateCardStyle = computed(() =>
      winningParty.value ? partyWinnerStyle(winningParty.value, partyMeta.value) : {}
    )

    const councilSeatDetails = computed(() =>
      generateSeatDetails({
        seats: province.value?.prelates?.seats,
        chamberType: 'prelates',
        scope: 'provincial',
        selectedProvince: province.value,
      })
    )

    const prelateSeat = computed(() => {
      if (!county.value || !winningParty.value) return null
      const matches = councilSeatDetails.value.filter(
        (seat) => seat.jurisdiction === county.value.name && seat.party === winningParty.value
      )
      if (matches.length === 0) return null
      return matches.sort((a, b) => b.supportMetric - a.supportMetric)[0]
    })

    const prelateName = computed(() => {
      const seat = prelateSeat.value
      if (!seat) return ''
      return (
        electionStore.getRepresentativeName(
          seat.party,
          seat.seatIndex + SEAT_OFFSETS.provincial.prelates
        ) || ''
      )
    })

    const partyAllSeats = computed(() =>
      !winningParty.value ? [] :
      councilSeatDetails.value.filter(s => s.party === winningParty.value)
    )

    const partyLeaderSeat = computed(() => {
      if (!partyAllSeats.value.length) return null
      return [...partyAllSeats.value].sort((a, b) => b.supportMetric - a.supportMetric)[0]
    })

    const isLeaderSeat = computed(() =>
      !!(prelateSeat.value && partyLeaderSeat.value &&
         prelateSeat.value.seatIndex === partyLeaderSeat.value.seatIndex)
    )

    const representativeTitle = computed(() => {
      if (!prelateSeat.value || !isLeaderSeat.value) return upperHouseMemberTitle()

      const control = province.value?.prelates?.control
      const party = winningParty.value
      if (!control) return 'Caucus Leader'

      if (party === control.leaderParty) return upperHouseLeaderTitle('provincial')

      const governingParties = new Set([control.leaderParty, ...(control.supportParties || [])])
      const nonGovPartiesBySeats = Object.entries(
        councilSeatDetails.value
          .filter(s => !governingParties.has(s.party))
          .reduce((acc, s) => { acc[s.party] = (acc[s.party] || 0) + 1; return acc }, {})
      ).sort((a, b) => b[1] - a[1])

      if (nonGovPartiesBySeats[0]?.[0] === party) return 'Opposition Leader'
      return 'Caucus Leader'
    })

    // Vote shares as stacked-bar segments for the condensed strip, largest first.
    const shareSegments = computed(() => {
      const shares = county.value?.vote_shares || {}
      return Object.keys(shares)
        .map((party) => ({
          party,
          share: Math.max(0, Number(shares[party]) || 0),
          color: partyMeta.value[party]?.color || '#9b9a97',
          label: partyMeta.value[party]?.abbreviation || party,
        }))
        .filter((segment) => segment.share > 0.0005)
        .sort((a, b) => b.share - a.share)
        .map((segment) => ({ ...segment, display: formatShareValue(segment.share) }))
    })

    const voteShareSummary = computed(() =>
      shareSegments.value.map((segment) => `${segment.label} ${segment.display}`).join(', ')
    )

    // ── Condense while pinned ──
    // The block is sticky; once the sentinel above it scrolls past the pin
    // line it is "stuck" and swaps to the compact strip. While condensed the
    // sticky box keeps its full layout height (transparent below the strip),
    // so the content underneath never shifts and the state can't oscillate.
    const sentinelEl = ref(null)
    const stickyEl = ref(null)
    const cardEl = ref(null)
    const condensed = ref(false)
    const reservedHeight = ref(0)
    let scrollRoot = null
    let frame = 0
    let resizeObserver = null

    function findScrollRoot(el) {
      for (let node = el?.parentElement; node; node = node.parentElement) {
        const { overflowY } = getComputedStyle(node)
        if (overflowY === 'auto' || overflowY === 'scroll') return node
      }
      return window
    }

    function measure() {
      frame = 0
      const sentinel = sentinelEl.value
      const sticky = stickyEl.value
      if (!sentinel || !sticky) return
      // Not rendered (e.g. inside a collapsed fieldset): treat as expanded.
      if (!sticky.getClientRects().length) {
        condensed.value = false
        return
      }
      const style = getComputedStyle(sticky)
      const pinLine = (scrollRoot === window ? 0 : scrollRoot.getBoundingClientRect().top) + (parseFloat(style.top) || 0)
      const naturalTop = sentinel.getBoundingClientRect().bottom + (parseFloat(style.marginTop) || 0)
      condensed.value = naturalTop < pinLine - 1
    }

    function scheduleMeasure() {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    function attach() {
      detach()
      if (!sentinelEl.value) return
      scrollRoot = findScrollRoot(sentinelEl.value)
      scrollRoot.addEventListener('scroll', scheduleMeasure, { passive: true })
      window.addEventListener('resize', scheduleMeasure, { passive: true })
      if (typeof ResizeObserver !== 'undefined' && cardEl.value) {
        // Remember the expanded height so the pinned box can reserve it.
        // Also re-check when the card first becomes visible (no scroll fires).
        resizeObserver = new ResizeObserver(() => {
          if (!condensed.value && cardEl.value) reservedHeight.value = cardEl.value.offsetHeight
          scheduleMeasure()
        })
        resizeObserver.observe(cardEl.value)
      }
      measure()
    }

    function detach() {
      if (scrollRoot) scrollRoot.removeEventListener('scroll', scheduleMeasure)
      window.removeEventListener('resize', scheduleMeasure)
      resizeObserver?.disconnect()
      resizeObserver = null
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      scrollRoot = null
    }

    onMounted(attach)
    onBeforeUnmount(detach)
    // The card only renders once results exist for this county.
    watch(() => Boolean(county.value), async (present) => {
      await nextTick()
      if (present) attach()
      else detach()
    })

    function formatShareValue(value) {
      const num = Number(value)
      if (!Number.isFinite(num)) return '—'
      return formatShare(num)
    }

    function formatSharePercent(value) {
      const num = Number(value)
      if (!Number.isFinite(num)) return '—'
      return `${(num * 100).toFixed(1)}%`
    }

    return {
      sentinelEl,
      stickyEl,
      cardEl,
      condensed,
      reservedHeight,
      shareSegments,
      voteShareSummary,
      upperHouseMemberTitle,
      county,
      hasPopulation,
      winningParty,
      usesCountyCouncil,
      prelateCardStyle,
      prelateSeat,
      prelateName,
      representativeTitle,
      partyMeta,
      controlCardStyle,
      formatShareValue,
      formatSharePercent,
      formatNumber,
      SEAT_OFFSETS,
    }
  },
}
</script>

<style scoped>
.baseline-sticky-sentinel {
  height: 0;
}

.baseline-sticky {
  position: sticky;
  top: 136px;
  z-index: 5;
  margin-top: 16px;
  margin-bottom: 28px;
  /* While condensed this box keeps its expanded height; let the transparent
     remainder pass clicks through to the fields scrolling underneath. */
  pointer-events: none;
}

.baseline-cards-section {
  display: block;
  padding-top: 12px;
  padding-bottom: 20px;
  border-top: 1px dashed var(--border-subtle);
  border-bottom: 1px dashed var(--border-subtle);
  background: var(--bg-surface-raised);
  pointer-events: auto;
  transition: padding 200ms ease, box-shadow 200ms ease;
}

.baseline-sticky--condensed .baseline-cards-section {
  padding-top: 8px;
  padding-bottom: 8px;
  border-top-style: solid;
  border-bottom-style: solid;
  box-shadow: 0 10px 18px -14px rgba(0, 0, 0, 0.7);
}

/* Height-animatable show/hide (grid 1fr <-> 0fr). */
.baseline-collapsible {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  transition: grid-template-rows 220ms ease, opacity 160ms ease;
}

.baseline-collapsible > div {
  min-height: 0;
  overflow: hidden;
}

.baseline-collapsible--compact,
.baseline-sticky--condensed .baseline-collapsible--full {
  grid-template-rows: 0fr;
  opacity: 0;
}

.baseline-sticky--condensed .baseline-collapsible--compact {
  grid-template-rows: 1fr;
  opacity: 1;
}

.baseline-cards-heading {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.baseline-cards-heading--gap {
  margin-top: 16px;
}

.baseline-leader-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 8px;
}

.baseline-leader-card {
  padding: 12px 14px;
}

.baseline-compact {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 18px;
  container-type: inline-size;
}

.baseline-compact-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  white-space: nowrap;
}

.baseline-compact-item strong {
  font-size: 0.92rem;
  color: var(--text-primary);
}

.baseline-compact-item small {
  color: var(--text-muted);
  font-size: 0.72rem;
}

.baseline-compact-label {
  color: var(--text-muted);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.baseline-compact-item--shares {
  flex: 1 1 220px;
  align-items: center;
}

.baseline-compact-bar {
  display: flex;
  flex: 1 1 80px;
  min-width: 60px;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--bg-input);
}

.baseline-compact-bar span {
  flex-basis: 0;
  min-width: 2px;
}

.baseline-compact-leaders {
  display: flex;
  flex: 0 1 auto;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
}

/* Only the leading party when space is tight. */
.baseline-compact-leaders span:not(:first-child) {
  display: none;
}

@container (min-width: 620px) {
  .baseline-compact-leaders span:not(:first-child) {
    display: inline;
  }
}

.baseline-compact-leaders i,
.baseline-compact-member i {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 4px;
  border-radius: 50%;
  vertical-align: middle;
}

.baseline-compact-member {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

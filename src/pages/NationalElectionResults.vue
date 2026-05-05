<template>
  <section class="election-page">
    <div v-if="!hasData" class="empty-workspace">
      <Vote :size="52" class="text-[var(--accent)]" />
      <div>
        <h2>No Election Data</h2>
        <p>Load or create a template to simulate national results.</p>
      </div>
      <button type="button" class="btn-primary" @click="store.loadDefault">
        <FilePlus2 :size="16" />
        New Template
      </button>
    </div>

    <template v-else>
      <header class="overview-hero election-decision-hero">
        <div class="election-decision-hero-main">
          <div class="election-page-icon-wrap"><Vote :size="26" /></div>
          <div>
            <p class="eyebrow">National Elections</p>
            <h2>National Decision Desk</h2>
            <p>{{ countryName }} · {{ formatCompactNumber(results.national.population) }} people · {{ regionRows.length }} regions</p>
            <div class="overview-hero-actions">
              <button type="button" class="btn-broadcast-start" @click="uiStore.openElectionBroadcastModal('national')">
                <Radio :size="16" />
                Start National Broadcast
                <BrainCircuit :size="13" class="broadcast-ai-mark" />
              </button>
              <button type="button" class="btn-broadcast-start" @click="showElectionTicker('national')">
                <Radio :size="16" />
                Show Election Ticker
                <BrainCircuit :size="13" class="broadcast-ai-mark" />
              </button>
            </div>
          </div>
        </div>
        <div class="overview-hero-calls">
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(results.national.assembly.control)">
            <span>Assembly Control</span>
            <strong>{{ results.national.assembly.control.label }}</strong>
            <small>{{ results.national.assembly.control.detail }}</small>
          </div>
          <div class="overview-hero-call winner-control-card" :style="controlCardStyle(results.national.prelates.control)">
            <span>Council Control</span>
            <strong>{{ results.national.prelates.control.label }}</strong>
            <small>{{ results.national.prelates.control.detail }}</small>
          </div>
        </div>
      </header>

      <ElectionTickerCard
        :request-id="tickerRequestId"
        :scope="tickerScope"
        :target-name="tickerTargetName"
        :ticker-key="tickerKey"
      />

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">National Swing</p>
            <h3>Party Shifts from Baseline</h3>
          </div>
        </div>
        <PartySwingCards
          :current-shares="results.national.assembly.vote_shares"
          :baseline-shares="baselineResults.national.assembly.vote_shares"
        />
      </section>

      <section class="election-summary-grid">
        <article
          v-for="card in summaryCards"
          :key="card.label"
          class="election-summary-card"
          :class="{ 'election-summary-card--winner winner-control-card': card.control }"
          :style="card.control ? controlCardStyle(card.control) : null"
        >
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <small>{{ card.detail }}</small>
        </article>
      </section>

      <div class="election-dashboard-grid">
        <ChamberComposition
          :title="nationalLowerHouseName"
          eyebrow="Lower House"
          :seats="results.national.assembly.seats"
          :control="results.national.assembly.control"
        />

        <ChamberComposition
          :title="nationalUpperHouseName"
          eyebrow="Upper House"
          :seats="results.national.prelates.seats"
          :control="results.national.prelates.control"
        />
      </div>

      <section class="election-panel">
        <PopularVoteBoard
          eyebrow="Party Results"
          title="National Vote And Seats"
          :rows="popularVoteRows"
          :total-votes="results.national.population"
          :seat-columns="nationalSeatColumns"
        />
      </section>

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">National Detail</p>
            <h3>Vote, Seats, And Thresholds</h3>
          </div>
        </div>
        <div class="election-table-wrap">
          <table class="election-table">
            <thead>
              <tr>
                <th>Party</th>
                <th>Vote Share</th>
                <th>Vs Baseline</th>
                <th>Assembly Seats</th>
                <th>Council Seats</th>
                <th>Threshold</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in nationalDetailRows" :key="`national-detail-${row.party}`">
                <td><PartyBadge :party="row.party" /></td>
                <td>{{ formatShare(row.voteShare) }}</td>
                <td :class="deltaClass(row.voteDelta)">{{ formatSignedPct(row.voteDelta) }}</td>
                <td>{{ formatNumber(row.assemblySeats) }} <small :class="deltaClass(row.assemblyDelta)">({{ formatSignedNumber(row.assemblyDelta) }})</small></td>
                <td>{{ formatNumber(row.prelateSeats) }} <small :class="deltaClass(row.prelateDelta)">({{ formatSignedNumber(row.prelateDelta) }})</small></td>
                <td>
                  <span class="threshold-chip" :class="{ 'threshold-chip--clear': row.clearedThreshold }">
                    {{ row.clearedThreshold ? 'Cleared' : 'Below' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Council Sources</p>
            <h3>Prelate Delegation By Province</h3>
          </div>
        </div>
        <details class="election-details" :open="prelateDelegationRows.length <= 12">
          <summary>{{ prelateDelegationRows.length }} provinces contributing {{ formatNumber(results.national.prelates.seat_count) }} prelates</summary>
          <div class="election-table-wrap">
            <table class="election-table election-table--wide">
              <thead>
                <tr>
                  <th>Province</th>
                  <th>Region</th>
                  <th>Total</th>
                  <th v-for="party in parties" :key="`delegation-${party}`">{{ partyColumnLabel(party) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in prelateDelegationRows" :key="`delegation-${row.provinceIndex}`">
                  <td>{{ row.name }}</td>
                  <td>{{ row.group }}</td>
                  <td>{{ formatNumber(row.total) }}</td>
                  <td v-for="party in parties" :key="`${row.provinceIndex}-${party}`">{{ formatNumber(row.seats[party] || 0) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section class="election-panel national-diagnostics-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Diagnostics</p>
            <h3>Thresholds And Apportionment</h3>
          </div>
        </div>
        <div class="diagnostics-grid">
          <article>
            <span>Vote Blend</span>
            <strong>{{ localBlendPct }} local / {{ climateBlendPct }} climate</strong>
            <small>National Assembly popular vote model</small>
          </article>
          <article>
            <span>Apportionment</span>
            <strong>{{ apportionmentLabel }}</strong>
            <small>National chamber formulas</small>
          </article>
          <article>
            <span>Assembly Threshold</span>
            <strong>{{ formatShare(nationalThreshold) }}</strong>
            <small>Minimum national vote share</small>
          </article>
        </div>
        <div v-if="warnings.length" class="election-diagnostics election-diagnostics--embedded">
          <TriangleAlert :size="16" />
          <div>
            <strong>Warnings</strong>
            <span>{{ warnings.join(' · ') }}</span>
          </div>
        </div>
        <div v-else class="election-diagnostics election-diagnostics--ok">
          <div>
            <strong>No diagnostics warnings</strong>
            <span>Seat totals and vote shares are internally consistent.</span>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>

<script>
import { computed, ref } from 'vue'
import { BrainCircuit, FilePlus2, Radio, TriangleAlert, Vote } from 'lucide-vue-next'
import ChamberComposition from '../components/elections/ChamberComposition.vue'
import ElectionTickerCard from '../components/elections/ElectionTickerCard.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import PartySwingCards from '../components/elections/PartySwingCards.vue'
import PopularVoteBoard from '../components/elections/PopularVoteBoard.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useUiStore } from '../stores/uiStore'
import { formatCompactNumber, formatNumber } from '../domain/provinceVisualizations'
import { APPORTIONMENT, PARTIES, THRESHOLDS, formatShare, lowerHouseName, upperHouseName, winnerControlStyle } from '../domain/elections'
import { orderRegionsByReference, popularVoteCount, sumSeats, topParty } from '../domain/elections/viewHelpers'
import { usePollingStore } from '../stores/pollingStore'

export default {
  name: 'NationalElectionResults',
  components: { BrainCircuit, ChamberComposition, ElectionTickerCard, FilePlus2, PartyBadge, PartySwingCards, PopularVoteBoard, Radio, TriangleAlert, Vote },
  setup() {
    const uiStore = useUiStore()
    const pollingStore = usePollingStore()
    const { baselineResults, hasData, results, store } = useElectionResults()
    const tickerRequestId = ref(0)
    const tickerScope = ref('national')
    const tickerTargetName = ref(null)
    const countryName = computed(() => store.currentData?.country?.basic_info?.name || 'Untitled Civilization')
    const nationalLowerHouseName = lowerHouseName('national')
    const nationalUpperHouseName = upperHouseName('national')

    const regionOrder = computed(() => store.currentData?.province_groups || [])

    const summaryCards = computed(() => [
      {
        label: 'Assembly Control',
        value: results.value.national.assembly.control.label,
        detail: results.value.national.assembly.control.detail,
        control: results.value.national.assembly.control,
      },
      {
        label: 'Council Control',
        value: results.value.national.prelates.control.label,
        detail: results.value.national.prelates.control.detail,
        control: results.value.national.prelates.control,
      },
      {
        label: 'Assemblypersons',
        value: formatNumber(results.value.national.assembly.seat_count),
        detail: 'Assembly of the Empire',
      },
      {
        label: 'Popular Vote Leader',
        value: store.partyMeta[topParty(results.value.national.assembly.vote_shares)]?.name || topParty(results.value.national.assembly.vote_shares),
        detail: `${formatShare(results.value.national.assembly.vote_shares[topParty(results.value.national.assembly.vote_shares)])} national vote`,
      },
      {
        label: 'Prelates',
        value: formatNumber(results.value.national.prelates.seat_count),
        detail: 'Council of Prelates',
      },
    ])

    const nationalSeatColumns = [
      { key: 'assemblySeats', label: 'Assembly Seats' },
      { key: 'prelateSeats', label: 'Council Seats' },
    ]

    const popularVoteRows = computed(() => PARTIES.map((party) => ({
      party,
      voteShare: results.value.national.assembly.vote_shares[party],
      voteCount: popularVoteCount(results.value.national.population, results.value.national.assembly.vote_shares, party),
      assemblySeats: results.value.national.assembly.seats[party],
      prelateSeats: results.value.national.prelates.seats[party],
    })))

    const regionRows = computed(() => orderRegionsByReference(Object.values(results.value.regions), regionOrder.value))

    const nationalDetailRows = computed(() => PARTIES.map((party) => {
      const voteShare = Number(results.value.national.assembly.vote_shares?.[party] || 0)
      const baselineVoteShare = Number(baselineResults.value.national.assembly.vote_shares?.[party] || 0)
      const assemblySeats = Number(results.value.national.assembly.seats?.[party] || 0)
      const baselineAssemblySeats = Number(baselineResults.value.national.assembly.seats?.[party] || 0)
      const prelateSeats = Number(results.value.national.prelates.seats?.[party] || 0)
      const baselinePrelateSeats = Number(baselineResults.value.national.prelates.seats?.[party] || 0)
      return {
        party,
        voteShare,
        voteDelta: voteShare - baselineVoteShare,
        assemblySeats,
        assemblyDelta: assemblySeats - baselineAssemblySeats,
        prelateSeats,
        prelateDelta: prelateSeats - baselinePrelateSeats,
        clearedThreshold: voteShare >= THRESHOLDS.nationalAssembly,
      }
    }).sort((a, b) => b.assemblySeats - a.assemblySeats || b.voteShare - a.voteShare))

    const prelateDelegationRows = computed(() => [...results.value.provinces].map((province) => ({
      provinceIndex: province.provinceIndex,
      name: province.name,
      group: province.group,
      seats: province.national_prelate_delegation || {},
      total: sumSeats(province.national_prelate_delegation || {}),
    })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)))

    const warnings = computed(() => results.value.diagnostics.warnings.slice(0, 5))
    const localBlendPct = computed(() => formatShare(results.value.national.assembly.vote_blend?.local_weight || 0))
    const climateBlendPct = computed(() => formatShare(results.value.national.assembly.vote_blend?.climate_weight || 0))
    const apportionmentLabel = computed(() => `${APPORTIONMENT.nationalAssembly} assembly / ${APPORTIONMENT.nationalPrelates} council`)
    const nationalThreshold = THRESHOLDS.nationalAssembly

    const tickerKey = computed(() => [
      results.value.config.trendPackageId,
      results.value.config.seed,
      results.value.config.jitterSeed,
      pollingStore.pollSeed,
    ].join('|'))

    function showElectionTicker(scope = 'national', targetName = null) {
      tickerScope.value = scope
      tickerTargetName.value = targetName
      tickerRequestId.value += 1
    }

    return {
      baselineResults,
      controlCardStyle: (control) => winnerControlStyle(control, store.partyMeta),
      countryName,
      formatCompactNumber,
      formatNumber,
      formatShare,
      formatSignedNumber: (value) => `${Number(value) > 0 ? '+' : ''}${formatNumber(value)}`,
      formatSignedPct: (value) => `${Number(value) > 0 ? '+' : ''}${(Number(value || 0) * 100).toFixed(1)}%`,
      hasData,
      apportionmentLabel,
      climateBlendPct,
      deltaClass: (value) => Number(value) > 0 ? 'delta-positive' : Number(value) < 0 ? 'delta-negative' : 'delta-neutral',
      localBlendPct,
      nationalDetailRows,
      nationalLowerHouseName,
      nationalUpperHouseName,
      nationalSeatColumns,
      nationalThreshold,
      parties: PARTIES,
      partyColumnLabel: (party) => store.partyMeta[party]?.abbreviation || store.partyMeta[party]?.colorLabel || party,
      popularVoteRows,
      prelateDelegationRows,
      regionRows,
      results,
      store,
      summaryCards,
      showElectionTicker,
      tickerKey,
      tickerRequestId,
      tickerScope,
      tickerTargetName,
      warnings,
      uiStore,
    }
  },
}
</script>

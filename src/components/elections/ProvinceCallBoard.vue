<template>
  <section class="panel">
    <header class="panel__head">
      <div class="panel__head-l">
        <span class="panel__icon"><Map :size="15" /></span>
        <div>
          <div class="eyebrow">Provincial</div>
          <h3 class="panel__title">Province Call Board</h3>
        </div>
      </div>
      <div class="panel__head-r">
        <span class="chip chip--up">{{ callCounts.Safe }} Safe</span>
        <span class="chip chip--gold">{{ callCounts.Likely }} Likely</span>
        <span class="chip chip--coral">{{ callCounts.Tossup }} Tossup</span>
      </div>
    </header>

    <div v-if="cards.length" class="callboard">
      <article v-for="card in cards" :key="card.key" class="callcard" :style="{ '--call-c': card.winnerColor }">
        <div class="callcard__head">
          <span class="callcard__name">{{ card.name }}</span>
          <span class="tag" :class="`tag--${card.callTone}`">{{ card.call }}</span>
        </div>
        <div class="callcard__body">
          <PartyBadge :party="card.winner" short />
          <span class="callcard__margin">+{{ card.margin.toFixed(1) }}</span>
        </div>
        <div class="callcard__bar">
          <i :style="{ width: card.winnerShare + '%', background: card.winnerColor }" />
          <i :style="{ width: (100 - card.winnerShare) + '%', background: 'var(--surface-3)' }" />
        </div>
      </article>
    </div>
    <p v-else class="ov-empty" style="padding: 8px 0; color: var(--ink-3); font-size: 12px">No province results to call yet.</p>
  </section>
</template>

<script>
import { computed } from 'vue'
import { Map } from 'lucide-vue-next'
import PartyBadge from './PartyBadge.vue'

const CALL_TONE = { Safe: 'safe', Likely: 'likely', Tossup: 'tossup' }

function rate(marginPct) {
  if (marginPct >= 12) return 'Safe'
  if (marginPct >= 5) return 'Likely'
  return 'Tossup'
}

export default {
  name: 'ProvinceCallBoard',
  components: { Map, PartyBadge },
  props: {
    provinces: { type: Array, default: () => [] },
    partyMeta: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const cards = computed(() => {
      return props.provinces
        .map((province) => {
          const shares = province?.assembly?.vote_shares || {}
          const entries = Object.entries(shares)
            .map(([party, share]) => ({ party, share: Number(share) || 0 }))
            .sort((a, b) => b.share - a.share)
          if (!entries.length || entries[0].share <= 0) return null
          // shares are fractions (0–1); convert to percent
          const top = entries[0]
          const runner = entries[1] || { share: 0 }
          const winnerShare = top.share * 100
          const margin = (top.share - runner.share) * 100
          const meta = props.partyMeta[top.party] || {}
          return {
            key: province.provinceIndex ?? province.name,
            name: province.name || 'Unnamed',
            population: Number(province.provincial_population ?? province.population ?? 0),
            winner: top.party,
            winnerColor: meta.color || 'var(--gold)',
            winnerShare: Math.max(0, Math.min(100, winnerShare)),
            margin,
            call: rate(margin),
            callTone: CALL_TONE[rate(margin)],
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.population - a.population)
    })

    const callCounts = computed(() => {
      const counts = { Safe: 0, Likely: 0, Tossup: 0 }
      cards.value.forEach((c) => { counts[c.call] += 1 })
      return counts
    })

    return { cards, callCounts }
  },
}
</script>

<template>
  <div class="baseline-vote-grid">
    <div
      v-for="party in PARTIES"
      :key="party"
      class="baseline-vote-card"
      :class="{ 'baseline-vote-card--top': topPartyKey === party }"
      :style="partyStyleFor(party)"
    >
      <span class="baseline-vote-card-abbr">{{ partyMeta[party]?.abbreviation || party }}</span>
      <strong class="baseline-vote-card-share">{{ formatShareValue(voteShares?.[party]) }}</strong>
      <small class="baseline-vote-card-name">{{ partyMeta[party]?.name || party }}</small>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useCivilizationStore } from '../../stores/civilizationStore'
import { PARTIES } from '../../domain/elections/constants/parties'
import { partyWinnerStyle, topParty } from '../../domain/elections/viewHelpers'
import { formatShare } from '../../domain/elections'

export default {
  name: 'BaselineVoteShareGrid',
  props: {
    voteShares: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const civStore = useCivilizationStore()
    const partyMeta = computed(() => civStore.partyMeta)
    const topPartyKey = computed(() => topParty(props.voteShares))

    function partyStyleFor(party) {
      return partyWinnerStyle(party, partyMeta.value)
    }

    function formatShareValue(value) {
      const num = Number(value)
      if (!Number.isFinite(num)) return '—'
      return formatShare(num)
    }

    return {
      PARTIES,
      partyMeta,
      topPartyKey,
      partyStyleFor,
      formatShareValue,
    }
  },
}
</script>

<style scoped>
.baseline-vote-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.baseline-vote-card {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  background:
    linear-gradient(135deg, var(--winner-bg, rgba(212, 168, 67, 0.10)), transparent 70%),
    var(--bg-input);
  border: 1px solid var(--winner-border, rgba(212, 168, 67, 0.22));
  border-radius: var(--radius-md);
  min-width: 0;
  transition: transform 120ms ease;
}

.baseline-vote-card--top {
  box-shadow: 0 0 0 1px var(--winner-border, rgba(212, 168, 67, 0.4));
}

.baseline-vote-card-abbr {
  color: var(--winner-color, var(--text-muted));
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.baseline-vote-card-share {
  color: var(--winner-color, var(--accent));
  font-size: 1.1rem;
  line-height: 1.1;
  font-weight: 700;
}

.baseline-vote-card-name {
  color: var(--text-secondary);
  font-size: 0.7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

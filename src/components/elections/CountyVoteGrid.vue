<template>
  <section class="county-vote-grid election-panel">
    <div class="election-panel-heading">
      <div>
        <p class="eyebrow">County Map</p>
        <h3>County Popular Vote Treemap</h3>
      </div>
    </div>
    <div class="election-chart-shell" style="height: 360px">
      <ProvinceChart :option="treemapOption" aria-label="County vote treemap" />
    </div>
  </section>
</template>

<script>
import { computed } from 'vue'
import ProvinceChart from '../ProvinceChart.vue'
import { PARTIES, formatShare } from '../../domain/elections'
import { formatCompactNumber } from '../../domain/formatting'
import { topParty } from '../../domain/elections/viewHelpers'

export default {
  name: 'CountyVoteGrid',
  components: { ProvinceChart },
  props: {
    counties: { type: Array, required: true },
    partyMeta: { type: Object, required: true },
  },
  setup(props) {
    const treemapOption = computed(() => {
      const data = props.counties.map((county) => {
        const winner = topParty(county.vote_shares)
        const color = props.partyMeta[winner]?.color || '#666'
        const winnerShare = county.vote_shares?.[winner] || 0
        return {
          name: county.name || county.tile_id || 'County',
          value: county.county_population || 1,
          itemStyle: { color, borderColor: '#1a1a2e', borderWidth: 2 },
          winner,
          winnerShare,
          county,
        }
      })

      return {
        tooltip: {
          formatter(params) {
            const d = params.data
            if (!d.county) return ''
            const pop = formatCompactNumber(d.value)
            const lines = [`<strong>${d.name}</strong>`, `Pop: ${pop}`, '']
            PARTIES.forEach((p) => {
              const share = d.county.vote_shares?.[p]
              if (share > 0.001) {
                const label = props.partyMeta[p]?.abbreviation || p
                lines.push(`${label}: ${formatShare(share)}`)
              }
            })
            return lines.join('<br/>')
          },
        },
        series: [
          {
            type: 'treemap',
            data,
            roam: false,
            nodeClick: false,
            breadcrumb: { show: false },
            label: {
              show: true,
              formatter: '{b}',
              fontSize: 11,
              color: '#fff',
              textShadowColor: 'rgba(0,0,0,0.6)',
              textShadowBlur: 3,
            },
            levels: [
              {
                itemStyle: {
                  borderColor: '#1a1a2e',
                  borderWidth: 2,
                  gapWidth: 2,
                },
              },
            ],
          },
        ],
      }
    })

    return { treemapOption }
  },
}
</script>

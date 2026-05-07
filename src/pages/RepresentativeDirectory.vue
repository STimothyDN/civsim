<template>
  <ElectionPageShell
    :icon="Users"
    eyebrow="Representative Directory"
    :title="'Master Representative List'"
    :subtitle="`${totalRepresentatives} representatives across all scopes · ${countryName}`"
    scope="directory"
  >
    <div class="dir-stats-strip">
      <div class="dir-stat">
        <strong>{{ totalRepresentatives }}</strong>
        <span>Total</span>
      </div>
      <div v-for="ps in partyStats" :key="ps.party" class="dir-stat">
        <div class="dir-stat-bar" :style="{ '--bar-color': ps.color, '--bar-pct': ps.pct + '%' }">
          <i></i>
        </div>
        <strong :style="{ color: ps.color }">{{ ps.count }}</strong>
        <span>{{ ps.abbrev }}</span>
      </div>
      <div class="dir-stat">
        <strong>{{ govCount }}</strong>
        <span>Govt</span>
      </div>
      <div class="dir-stat">
        <strong>{{ oppCount }}</strong>
        <span>Opp</span>
      </div>
    </div>

    <div class="election-data-grid">
      <PartyCompositionDonut
        :representatives="filteredRepresentatives"
        :party-meta="store.partyMeta"
      />

      <section class="directory-filters election-panel">
        <div class="election-panel-heading">
          <div>
            <p class="eyebrow">Filters</p>
            <h3>Directory Controls</h3>
          </div>
        </div>
        <div class="dir-filter-grid">
          <div class="filter-group">
            <label>Search</label>
            <input v-model="searchQuery" type="text" class="filter-input" placeholder="Name or jurisdiction..." />
          </div>
          <div class="filter-group">
            <label>View</label>
            <div class="filter-buttons">
              <button type="button" class="filter-btn" :class="{ 'filter-btn--active': viewMode === 'table' }" @click="viewMode = 'table'">Table</button>
              <button type="button" class="filter-btn" :class="{ 'filter-btn--active': viewMode === 'cards' }" @click="viewMode = 'cards'">Cards</button>
            </div>
          </div>
          <div class="filter-group">
            <label>Group By</label>
            <div class="filter-buttons">
              <button v-for="option in groupOptions" :key="option.value" type="button" class="filter-btn" :class="{ 'filter-btn--active': groupBy === option.value }" @click="groupBy = option.value">{{ option.label }}</button>
            </div>
          </div>
          <div class="filter-group">
            <label>Sort</label>
            <select v-model="sortBy" class="filter-select">
              <option value="support">Support</option>
              <option value="name">Name</option>
              <option value="party">Party</option>
              <option value="jurisdiction">Jurisdiction</option>
              <option value="seat">Seat Number</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Order</label>
            <div class="filter-buttons">
              <button type="button" class="filter-btn" :class="{ 'filter-btn--active': sortDirection === 'desc' }" @click="sortDirection = 'desc'">Desc</button>
              <button type="button" class="filter-btn" :class="{ 'filter-btn--active': sortDirection === 'asc' }" @click="sortDirection = 'asc'">Asc</button>
            </div>
          </div>
          <div class="filter-group">
            <label>Scope</label>
            <div class="filter-buttons">
              <button v-for="option in scopeOptions" :key="option.value" type="button" class="filter-btn" :class="{ 'filter-btn--active': selectedScope === option.value }" @click="selectedScope = option.value">{{ option.label }}</button>
            </div>
          </div>
          <div class="filter-group">
            <label>Party</label>
            <select v-model="selectedParty" class="filter-select">
              <option value="all">All Parties</option>
              <option v-for="party in parties" :key="party" :value="party">{{ store.partyMeta[party]?.name || party }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Chamber</label>
            <select v-model="selectedChamber" class="filter-select">
              <option value="all">All Chambers</option>
              <option value="assembly">Assembly</option>
              <option value="prelates">Council</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Status</label>
            <select v-model="selectedStatus" class="filter-select">
              <option value="all">All</option>
              <option value="leader">Leaders</option>
              <option value="government">Government</option>
              <option value="opposition">Opposition</option>
            </select>
          </div>
        </div>
      </section>
    </div>

    <section class="directory-content">
      <div v-if="groupedRepresentatives.length === 0" class="directory-empty">
        <span>No representatives match the current filters.</span>
      </div>

      <div v-else class="directory-groups">
        <div v-for="group in groupedRepresentatives" :key="group.key" class="directory-group">
          <div class="directory-group-header">
            <h3>{{ group.label }}</h3>
            <span class="group-count">{{ group.representatives.length }} representatives</span>
          </div>

          <!-- Card view -->
          <div v-if="viewMode === 'cards'" class="dir-card-grid">
            <div
              v-for="rep in group.representatives"
              :key="`${rep.scope}-${rep.chamberType}-${rep.party}-${rep.seatIndex}`"
              class="dir-rep-card"
              :style="repCardStyle(rep)"
            >
              <div class="dir-rep-card-top">
                <span class="representative-name">{{ rep.title }}</span>
                <IncumbencyBadge :party="rep.party" :seat-index="rep.nameIndex" />
                <span class="dir-rep-icons">
                  <Crown v-if="rep.isLeader && rep.isGoverning" :size="13" class="icon-leader" />
                  <Landmark v-if="rep.isGoverning && !rep.isLeader" :size="13" class="icon-govt" />
                  <Swords v-if="rep.isOppositionLeader" :size="13" class="icon-opp" />
                </span>
              </div>
              <div class="dir-rep-card-meta">
                <PartyBadge :party="rep.party" short />
                <span class="scope-badge" :class="`scope-badge--${rep.scope}`">{{ scopeLabel(rep.scope) }}</span>
              </div>
              <div class="dir-rep-card-detail">
                <span>{{ rep.jurisdiction }}</span>
                <span>{{ rep.chamberType === 'assembly' ? 'Assembly' : 'Council' }}</span>
              </div>
              <div class="support-bar-mini">
                <div class="support-bar-mini-fill" :style="{ width: `${rep.supportMetric}%` }"></div>
                <span class="support-bar-mini-value">{{ formatSupport(rep.supportMetric) }}%</span>
              </div>
            </div>
          </div>

          <!-- Table view -->
          <table v-else class="directory-table">
            <thead>
              <tr>
                <th class="col-name">Representative</th>
                <th class="col-party">Party</th>
                <th class="col-scope">Scope</th>
                <th class="col-chamber">Chamber</th>
                <th class="col-jurisdiction">Jurisdiction</th>
                <th class="col-region">Region/Province</th>
                <th class="col-seat">Seat #</th>
                <th class="col-vote">Vote Share</th>
                <th class="col-support">Support</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="rep in group.representatives"
                :key="`${rep.scope}-${rep.chamberType}-${rep.party}-${rep.seatIndex}`"
                class="directory-row"
              >
                <td class="col-name">
                  <span class="representative-name">{{ rep.title }}</span>
                  <IncumbencyBadge :party="rep.party" :seat-index="rep.nameIndex" />
                  <Crown v-if="rep.isLeader && rep.isGoverning" :size="13" class="icon-leader" />
                  <Landmark v-if="rep.isGoverning && !rep.isLeader" :size="13" class="icon-govt" />
                  <Swords v-if="rep.isOppositionLeader" :size="13" class="icon-opp" />
                </td>
                <td class="col-party"><PartyBadge :party="rep.party" abbreviated /></td>
                <td class="col-scope"><span class="scope-badge" :class="`scope-badge--${rep.scope}`">{{ scopeLabel(rep.scope) }}</span></td>
                <td class="col-chamber">{{ rep.chamberType === 'assembly' ? 'Assembly' : 'Council' }}</td>
                <td class="col-jurisdiction">{{ rep.jurisdiction }}</td>
                <td class="col-region">{{ rep.regionName || rep.provinceName || '-' }}</td>
                <td class="col-seat">{{ rep.seatIndex + 1 }}</td>
                <td class="col-vote">{{ formatVoteShare(rep.voteShare) }}</td>
                <td class="col-support">
                  <div class="support-bar-mini">
                    <div class="support-bar-mini-fill" :style="{ width: `${rep.supportMetric}%` }"></div>
                    <span class="support-bar-mini-value">{{ formatSupport(rep.supportMetric) }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </ElectionPageShell>
</template>

<script>
import { computed, ref } from 'vue'
import { Crown, Landmark, Swords, Users } from 'lucide-vue-next'
import ElectionPageShell from '../components/elections/ElectionPageShell.vue'
import PartyBadge from '../components/elections/PartyBadge.vue'
import IncumbencyBadge from '../components/elections/IncumbencyBadge.vue'
import PartyCompositionDonut from '../components/elections/PartyCompositionDonut.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useElectionStore } from '../stores/electionStore'
import { PARTIES } from '../domain/elections/constants/parties'
import { getSeatOffset } from '../domain/elections/constants/seatOffsets'
import { generateSeatDetails } from '../domain/elections/chambers/jurisdictionLabels'
import { lowerHouseLeaderTitle, upperHouseLeaderTitle } from '../domain/elections'
import { num } from '../domain/elections/normalization/numbers'

export default {
  name: 'RepresentativeDirectory',
  components: { Crown, ElectionPageShell, IncumbencyBadge, Landmark, PartyBadge, PartyCompositionDonut, Swords, Users },
  setup() {
    const { results, store } = useElectionResults()
    const electionStore = useElectionStore()
    const countryName = computed(() => store.currentData?.country?.basic_info?.name || 'Untitled Civilization')

    const viewMode = ref('table')
    const groupBy = ref('scope')
    const sortBy = ref('support')
    const sortDirection = ref('desc')
    const searchQuery = ref('')
    const selectedScope = ref('all')
    const selectedParty = ref('all')
    const selectedChamber = ref('all')
    const selectedStatus = ref('all')

    const groupOptions = [
      { value: 'scope', label: 'Scope' },
      { value: 'party', label: 'Party' },
      { value: 'chamber', label: 'Chamber' },
      { value: 'status', label: 'Status' },
    ]
    const scopeOptions = [
      { value: 'all', label: 'All' },
      { value: 'national', label: 'National' },
      { value: 'regional', label: 'Regional' },
      { value: 'provincial', label: 'Provincial' },
    ]

    const allRepresentatives = computed(() => {
      const reps = []
      const r = results.value
      if (!r?.provinces) return reps

      if (selectedScope.value === 'all' || selectedScope.value === 'national') {
        reps.push(...processSeats(generateSeatDetails({ seats: r.national.assembly.seats, chamberType: 'assembly', scope: 'national', provinces: r.provinces }), 'national', 'assembly', r.national.assembly.control))
        reps.push(...processSeats(generateSeatDetails({ seats: r.national.prelates.seats, chamberType: 'prelates', scope: 'national', provinces: r.provinces }), 'national', 'prelates', r.national.prelates.control))
      }
      if (selectedScope.value === 'all' || selectedScope.value === 'regional') {
        Object.values(r.regions || {}).forEach((region) => {
          reps.push(...processSeats(generateSeatDetails({ seats: region.assembly.seats, chamberType: 'assembly', scope: 'regional', provinces: r.provinces, selectedRegionName: region.name }), 'regional', 'assembly', region.assembly.control, region.name))
          reps.push(...processSeats(generateSeatDetails({ seats: region.prelates.seats, chamberType: 'prelates', scope: 'regional', provinces: r.provinces, selectedRegionName: region.name }), 'regional', 'prelates', region.prelates.control, region.name))
        })
      }
      if (selectedScope.value === 'all' || selectedScope.value === 'provincial') {
        r.provinces.forEach((province) => {
          reps.push(...processSeats(generateSeatDetails({ seats: province.assembly.seats, chamberType: 'assembly', scope: 'provincial', provinces: r.provinces, selectedProvince: province }), 'provincial', 'assembly', province.assembly.control, province.name, province))
          reps.push(...processSeats(generateSeatDetails({ seats: province.prelates.seats, chamberType: 'prelates', scope: 'provincial', provinces: r.provinces, selectedProvince: province }), 'provincial', 'prelates', province.prelates.control, province.name, province))
        })
      }
      return reps
    })

    function processSeats(seats, scope, chamberType, control, regionName = null, province = null) {
      return seats.map((seat, index) => {
        const isLeader = index === 0
        const isGoverning = seat.party === control?.leaderParty
        const isOppositionLeader = isLeader && !isGoverning
        const nameIndex = seat.seatIndex + getSeatOffset(scope, chamberType)
        const customName = electionStore.getRepresentativeName(seat.party, nameIndex)
        let title
        if (isLeader && isGoverning) {
          const lt = chamberType === 'prelates' ? upperHouseLeaderTitle(scope) : lowerHouseLeaderTitle(scope)
          title = customName ? `${lt} ${customName}` : lt
        } else if (isOppositionLeader) {
          title = customName ? `Opposition Leader ${customName}` : 'Opposition Leader'
        } else if (isLeader) {
          title = customName ? `Caucus Leader ${customName}` : 'Caucus Leader'
        } else {
          const role = chamberType === 'prelates' ? 'Prelate' : 'Assemblyperson'
          title = customName ? `${role} ${customName}` : role
        }
        return { party: seat.party, scope, chamberType, seatIndex: seat.seatIndex, nameIndex, jurisdiction: seat.jurisdiction, voteShare: seat.voteShare, supportMetric: seat.supportMetric, title, isLeader, isGoverning, isOppositionLeader, regionName, provinceName: province?.name }
      })
    }

    const filteredRepresentatives = computed(() => {
      const q = searchQuery.value.toLowerCase().trim()
      return allRepresentatives.value.filter((rep) => {
        if (q && !rep.title.toLowerCase().includes(q) && !rep.jurisdiction.toLowerCase().includes(q) && !(rep.regionName || '').toLowerCase().includes(q) && !(rep.provinceName || '').toLowerCase().includes(q)) return false
        if (selectedParty.value !== 'all' && rep.party !== selectedParty.value) return false
        if (selectedChamber.value !== 'all' && rep.chamberType !== selectedChamber.value) return false
        if (selectedStatus.value === 'leader' && !rep.isLeader) return false
        if (selectedStatus.value === 'government' && !rep.isGoverning) return false
        if (selectedStatus.value === 'opposition' && rep.isGoverning) return false
        return true
      })
    })

    const groupedRepresentatives = computed(() => {
      const groups = {}
      filteredRepresentatives.value.forEach((rep) => {
        let key, label
        switch (groupBy.value) {
          case 'scope': key = rep.scope; label = scopeLabel(rep.scope); break
          case 'party': key = rep.party; label = store.partyMeta[rep.party]?.name || rep.party; break
          case 'chamber': key = rep.chamberType; label = rep.chamberType === 'assembly' ? 'Assembly' : 'Council'; break
          case 'status':
            if (rep.isLeader && rep.isGoverning) { key = 'government-leader'; label = 'Government Leader' }
            else if (rep.isLeader && !rep.isGoverning) { key = 'opposition-leader'; label = 'Opposition Leader' }
            else if (rep.isGoverning) { key = 'government'; label = 'Government Member' }
            else { key = 'opposition'; label = 'Opposition Member' }
            break
          default: key = rep.scope; label = scopeLabel(rep.scope)
        }
        if (!groups[key]) groups[key] = { key, label, representatives: [] }
        groups[key].representatives.push(rep)
      })

      return Object.values(groups).sort((a, b) => {
        if (groupBy.value === 'scope') return ({ national: 1, regional: 2, provincial: 3 })[a.key] - ({ national: 1, regional: 2, provincial: 3 })[b.key]
        if (groupBy.value === 'party') return b.representatives.length - a.representatives.length
        if (groupBy.value === 'chamber') return ({ assembly: 1, prelates: 2 })[a.key] - ({ assembly: 1, prelates: 2 })[b.key]
        if (groupBy.value === 'status') return ({ 'government-leader': 1, government: 2, 'opposition-leader': 3, opposition: 4 })[a.key] - ({ 'government-leader': 1, government: 2, 'opposition-leader': 3, opposition: 4 })[b.key]
        return a.label.localeCompare(b.label)
      }).map((group) => ({
        ...group,
        representatives: group.representatives.sort((a, b) => {
          const dir = sortDirection.value === 'asc' ? 1 : -1
          switch (sortBy.value) {
            case 'support': if (b.supportMetric !== a.supportMetric) return (a.supportMetric - b.supportMetric) * dir; break
            case 'name': { const c = a.title.localeCompare(b.title); if (c !== 0) return c * dir; break }
            case 'party': { const c = a.party.localeCompare(b.party); if (c !== 0) return c * dir; break }
            case 'jurisdiction': { const c = a.jurisdiction.localeCompare(b.jurisdiction); if (c !== 0) return c * dir; break }
            case 'seat': if (a.seatIndex !== b.seatIndex) return (a.seatIndex - b.seatIndex) * dir; break
          }
          return a.party !== b.party ? a.party.localeCompare(b.party) : a.jurisdiction.localeCompare(b.jurisdiction)
        }),
      }))
    })

    const totalRepresentatives = computed(() => allRepresentatives.value.length)

    const partyStats = computed(() => {
      const counts = {}
      for (const rep of filteredRepresentatives.value) counts[rep.party] = (counts[rep.party] || 0) + 1
      const total = filteredRepresentatives.value.length || 1
      return PARTIES.filter((p) => counts[p]).map((p) => ({
        party: p,
        count: counts[p],
        abbrev: store.partyMeta[p]?.abbreviation || p.slice(0, 3),
        color: store.partyMeta[p]?.color || '#666',
        pct: (counts[p] / total) * 100,
      })).sort((a, b) => b.count - a.count)
    })

    const govCount = computed(() => filteredRepresentatives.value.filter((r) => r.isGoverning).length)
    const oppCount = computed(() => filteredRepresentatives.value.filter((r) => !r.isGoverning).length)

    function scopeLabel(scope) {
      return { national: 'National', regional: 'Regional', provincial: 'Provincial' }[scope] || scope
    }

    function formatSupport(metric) {
      const safe = num(metric)
      return isFinite(safe) && safe >= 0 ? safe.toFixed(1) : '0.0'
    }

    function formatVoteShare(share) {
      const safe = num(share)
      return isFinite(safe) && safe >= 0 ? `${(safe * 100).toFixed(1)}%` : '0.0%'
    }

    function repCardStyle(rep) {
      const c = store.partyMeta[rep.party]?.color || '#666'
      return { borderLeftColor: c }
    }

    return {
      countryName, filteredRepresentatives, formatSupport, formatVoteShare, govCount,
      groupBy, groupedRepresentatives, groupOptions, oppCount, parties: PARTIES,
      partyStats, repCardStyle, scopeLabel, scopeOptions, searchQuery, selectedChamber,
      selectedParty, selectedScope, selectedStatus, sortBy, sortDirection, store,
      totalRepresentatives, Users, viewMode,
    }
  },
}
</script>

<style scoped>
.dir-stats-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.dir-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 48px;
}

.dir-stat strong {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.dir-stat span {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.dir-stat-bar {
  width: 32px;
  height: 3px;
  border-radius: 999px;
  background: var(--bg-surface-overlay);
  overflow: hidden;
}

.dir-stat-bar i {
  display: block;
  height: 100%;
  width: var(--bar-pct);
  background: var(--bar-color);
  border-radius: inherit;
}

.dir-filter-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-buttons {
  display: flex;
  gap: 4px;
}

.filter-btn {
  padding: 5px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.76rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-btn:hover {
  background: var(--bg-surface-overlay);
}

.filter-btn--active {
  background: rgba(212, 168, 67, 0.12);
  border-color: rgba(212, 168, 67, 0.35);
  color: var(--accent);
}

.filter-input {
  padding: 5px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.78rem;
  min-width: 180px;
}

.filter-input:focus {
  outline: none;
  border-color: var(--accent);
}

.filter-select {
  padding: 5px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.78rem;
  min-width: 120px;
}

.directory-content {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow-x: auto;
}

.directory-empty {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.86rem;
}

.directory-groups {
  display: flex;
  flex-direction: column;
}

.directory-group {
  border-bottom: 1px solid var(--border-subtle);
}

.directory-group:last-child {
  border-bottom: none;
}

.directory-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-input);
  border-bottom: 1px solid var(--border-subtle);
}

.directory-group-header h3 {
  margin: 0;
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.group-count {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Card view */
.dir-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
  padding: 12px;
}

.dir-rep-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--bg-surface-raised, var(--bg-surface));
  border: 1px solid var(--border-subtle);
  border-left: 3px solid;
  border-radius: var(--radius-sm);
}

.dir-rep-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
}

.dir-rep-card-top .representative-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
}

.dir-rep-icons {
  display: flex;
  gap: 3px;
}

.dir-rep-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dir-rep-card-detail {
  display: flex;
  gap: 8px;
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* Table view */
.directory-table {
  width: 100%;
  min-width: 1000px;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.directory-table th {
  padding: 8px 12px;
  text-align: left;
  font-weight: 700;
  color: var(--text-muted);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border-subtle);
}

.directory-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.directory-row:last-child td {
  border-bottom: none;
}

.directory-row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.col-name {
  min-width: 180px;
  font-weight: 600;
}

.representative-name {
  color: var(--text-primary);
}

.icon-leader { color: var(--accent); margin-left: 4px; }
.icon-govt { color: #64b5f6; margin-left: 4px; }
.icon-opp { color: #ef9a9a; margin-left: 4px; }

.scope-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.68rem;
  font-weight: 700;
  background: var(--bg-input);
  color: var(--text-secondary);
}

.scope-badge--national {
  background: rgba(212, 168, 67, 0.12);
  border: 1px solid rgba(212, 168, 67, 0.3);
  color: #d4a843;
}

.scope-badge--regional {
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
}

.scope-badge--provincial {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.col-chamber, .col-jurisdiction, .col-region, .col-vote {
  color: var(--text-secondary);
}

.col-seat {
  text-align: center;
  color: var(--text-secondary);
}

.support-bar-mini {
  position: relative;
  height: 18px;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  overflow: hidden;
  min-width: 80px;
}

.support-bar-mini-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, rgba(212, 168, 67, 0.15), rgba(212, 168, 67, 0.4));
  border-radius: var(--radius-sm);
  min-width: 2px;
}

.support-bar-mini-value {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--text-secondary);
}

@media (max-width: 720px) {
  .dir-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <section class="election-page">
    <div v-if="!hasData" class="empty-workspace">
      <Users :size="52" class="text-[var(--accent)]" />
      <div>
        <h2>No Election Data</h2>
        <p>Load or create a template to view the representative directory.</p>
      </div>
      <button type="button" class="btn-primary" @click="store.loadDefault">
        <FilePlus2 :size="16" />
        New Template
      </button>
    </div>

    <template v-else>
      <header class="overview-hero">
        <div class="election-decision-hero-main">
          <div class="election-page-icon-wrap"><Users :size="26" /></div>
          <div>
            <p class="eyebrow">Representative Directory</p>
            <h2>Master Representative List</h2>
            <p>{{ totalRepresentatives }} representatives across all scopes · {{ countryName }}</p>
          </div>
        </div>
      </header>

      <section class="directory-filters">
        <div class="filter-group">
          <label>Search</label>
          <input
            v-model="searchQuery"
            type="text"
            class="filter-input"
            placeholder="Search by name or jurisdiction..."
          />
        </div>

        <div class="filter-group">
          <label>Group By</label>
          <div class="filter-buttons">
            <button
              v-for="option in groupOptions"
              :key="option.value"
              type="button"
              class="filter-btn"
              :class="{ 'filter-btn--active': groupBy === option.value }"
              @click="groupBy = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="filter-group">
          <label>Sort By</label>
          <select v-model="sortBy" class="filter-select">
            <option value="support">Support</option>
            <option value="name">Name</option>
            <option value="party">Party</option>
            <option value="jurisdiction">Jurisdiction</option>
            <option value="seat">Seat Number</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Sort Order</label>
          <div class="filter-buttons">
            <button
              type="button"
              class="filter-btn"
              :class="{ 'filter-btn--active': sortDirection === 'desc' }"
              @click="sortDirection = 'desc'"
            >
              ↓ Desc
            </button>
            <button
              type="button"
              class="filter-btn"
              :class="{ 'filter-btn--active': sortDirection === 'asc' }"
              @click="sortDirection = 'asc'"
            >
              ↑ Asc
            </button>
          </div>
        </div>

        <div class="filter-group">
          <label>Filter Scope</label>
          <div class="filter-buttons">
            <button
              v-for="option in scopeOptions"
              :key="option.value"
              type="button"
              class="filter-btn"
              :class="{ 'filter-btn--active': selectedScope === option.value }"
              @click="selectedScope = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="filter-group">
          <label>Filter Party</label>
          <select v-model="selectedParty" class="filter-select">
            <option value="all">All Parties</option>
            <option v-for="party in parties" :key="party" :value="party">
              {{ store.partyMeta[party]?.name || party }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Filter Chamber</label>
          <select v-model="selectedChamber" class="filter-select">
            <option value="all">All Chambers</option>
            <option value="assembly">Assembly (Lower House)</option>
            <option value="prelates">Council (Upper House)</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Filter Status</label>
          <select v-model="selectedStatus" class="filter-select">
            <option value="all">All Statuses</option>
            <option value="leader">Leaders Only</option>
            <option value="government">Government Only</option>
            <option value="opposition">Opposition Only</option>
          </select>
        </div>
      </section>

      <section class="directory-content">
        <div v-if="groupedRepresentatives.length === 0" class="directory-empty">
          <span>No representatives match the current filters.</span>
        </div>

        <div v-else class="directory-groups">
          <div
            v-for="group in groupedRepresentatives"
            :key="group.key"
            class="directory-group"
          >
            <div class="directory-group-header">
              <h3>{{ group.label }}</h3>
              <span class="group-count">{{ group.representatives.length }} representatives</span>
            </div>

            <table class="directory-table">
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
                    <span v-if="rep.isLeader" class="leader-badge" title="Leader">👑</span>
                    <span v-if="rep.isGoverning" class="government-badge" title="Government">🏛️</span>
                    <span v-if="rep.isOppositionLeader" class="opposition-badge" title="Opposition Leader">⚔️</span>
                  </td>
                  <td class="col-party">
                    <PartyBadge :party="rep.party" abbreviated />
                  </td>
                  <td class="col-scope">
                    <span class="scope-badge" :class="`scope-badge--${rep.scope}`">
                      {{ scopeLabel(rep.scope) }}
                    </span>
                  </td>
                  <td class="col-chamber">
                    {{ rep.chamberType === 'assembly' ? 'Assembly' : 'Council' }}
                  </td>
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
    </template>
  </section>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { FilePlus2, Users } from 'lucide-vue-next'
import PartyBadge from '../components/elections/PartyBadge.vue'
import { useElectionResults } from '../composables/useElectionResults'
import { useElectionStore } from '../stores/electionStore'
import { PARTIES } from '../domain/elections/constants/parties'
import { generateSeatDetails } from '../domain/elections/chambers/jurisdictionLabels'
import { lowerHouseLeaderTitle, upperHouseLeaderTitle } from '../domain/elections'
import { num } from '../domain/elections/normalization/numbers'

export default {
  name: 'RepresentativeDirectory',
  components: { FilePlus2, PartyBadge, Users },
  setup() {
    const { hasData, results, store } = useElectionResults()
    const electionStore = useElectionStore()
    const countryName = computed(() => store.currentData?.country?.basic_info?.name || 'Untitled Civilization')

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
      { value: 'jurisdiction', label: 'Jurisdiction' },
      { value: 'status', label: 'Status' },
    ]

    const scopeOptions = [
      { value: 'all', label: 'All Scopes' },
      { value: 'national', label: 'National' },
      { value: 'regional', label: 'Regional' },
      { value: 'provincial', label: 'Provincial' },
    ]

    // Generate representative data for all scopes
    const allRepresentatives = computed(() => {
      const reps = []
      const resultsValue = results.value

      if (!resultsValue?.provinces) return reps

      // National representatives
      if (selectedScope.value === 'all' || selectedScope.value === 'national') {
        const nationalAssemblySeats = generateSeatDetails({
          seats: resultsValue.national.assembly.seats,
          chamberType: 'assembly',
          scope: 'national',
          provinces: resultsValue.provinces,
        })
        const nationalCouncilSeats = generateSeatDetails({
          seats: resultsValue.national.prelates.seats,
          chamberType: 'prelates',
          scope: 'national',
          provinces: resultsValue.provinces,
        })

        reps.push(...processSeats(nationalAssemblySeats, 'national', 'assembly', resultsValue.national.assembly.control))
        reps.push(...processSeats(nationalCouncilSeats, 'national', 'prelates', resultsValue.national.prelates.control))
      }

      // Regional representatives
      if (selectedScope.value === 'all' || selectedScope.value === 'regional') {
        Object.values(resultsValue.regions || {}).forEach((region) => {
          const regionAssemblySeats = generateSeatDetails({
            seats: region.assembly.seats,
            chamberType: 'assembly',
            scope: 'regional',
            provinces: resultsValue.provinces,
            selectedRegionName: region.name,
          })
          const regionCouncilSeats = generateSeatDetails({
            seats: region.prelates.seats,
            chamberType: 'prelates',
            scope: 'regional',
            provinces: resultsValue.provinces,
            selectedRegionName: region.name,
          })

          reps.push(...processSeats(regionAssemblySeats, 'regional', 'assembly', region.assembly.control, region.name))
          reps.push(...processSeats(regionCouncilSeats, 'regional', 'prelates', region.prelates.control, region.name))
        })
      }

      // Provincial representatives
      if (selectedScope.value === 'all' || selectedScope.value === 'provincial') {
        resultsValue.provinces.forEach((province) => {
          const provinceAssemblySeats = generateSeatDetails({
            seats: province.assembly.seats,
            chamberType: 'assembly',
            scope: 'provincial',
            provinces: resultsValue.provinces,
            selectedProvince: province,
          })
          const provinceCouncilSeats = generateSeatDetails({
            seats: province.prelates.seats,
            chamberType: 'prelates',
            scope: 'provincial',
            provinces: resultsValue.provinces,
            selectedProvince: province,
          })

          reps.push(...processSeats(provinceAssemblySeats, 'provincial', 'assembly', province.assembly.control, province.name, province))
          reps.push(...processSeats(provinceCouncilSeats, 'provincial', 'prelates', province.prelates.control, province.name, province))
        })
      }

      return reps
    })

    function processSeats(seats, scope, chamberType, control, regionName = null, province = null) {
      return seats.map((seat, index) => {
        const isLeader = index === 0
        const isGoverning = seat.party === control?.leaderParty
        const isOppositionLeader = isLeader && !isGoverning

        // Determine title
        let title
        // Calculate offset based on scope and chamber type to avoid collisions
        let offset = 0
        if (scope === 'national') {
          offset = chamberType === 'prelates' ? 2500 : 0
        } else if (scope === 'regional') {
          offset = chamberType === 'prelates' ? 7500 : 5000
        } else if (scope === 'provincial') {
          offset = chamberType === 'prelates' ? 12500 : 10000
        }
        const nameIndex = seat.seatIndex + offset
        const customName = electionStore.getRepresentativeName(seat.party, nameIndex)

        if (isLeader && isGoverning) {
          const leaderTitle = chamberType === 'prelates' ? upperHouseLeaderTitle(scope) : lowerHouseLeaderTitle(scope)
          title = customName ? `${leaderTitle} ${customName}` : leaderTitle
        } else if (isOppositionLeader) {
          title = customName ? `Opposition Leader ${customName}` : 'Opposition Leader'
        } else if (isLeader) {
          title = customName ? `Caucus Leader ${customName}` : 'Caucus Leader'
        } else {
          const role = chamberType === 'prelates' ? 'Prelate' : 'Assemblyperson'
          title = customName ? `${role} ${customName}` : role
        }

        return {
          party: seat.party,
          scope,
          chamberType,
          seatIndex: seat.seatIndex,
          jurisdiction: seat.jurisdiction,
          voteShare: seat.voteShare,
          supportMetric: seat.supportMetric,
          title,
          isLeader,
          isGoverning,
          isOppositionLeader,
          regionName,
          provinceName: province?.name,
        }
      })
    }

    // Filter representatives
    const filteredRepresentatives = computed(() => {
      const query = searchQuery.value.toLowerCase().trim()
      return allRepresentatives.value.filter((rep) => {
        // Search filter
        if (query) {
          const nameMatch = rep.title.toLowerCase().includes(query)
          const jurisdictionMatch = rep.jurisdiction.toLowerCase().includes(query)
          const regionMatch = rep.regionName?.toLowerCase().includes(query)
          const provinceMatch = rep.provinceName?.toLowerCase().includes(query)
          if (!nameMatch && !jurisdictionMatch && !regionMatch && !provinceMatch) return false
        }

        // Party filter
        if (selectedParty.value !== 'all' && rep.party !== selectedParty.value) return false

        // Chamber filter
        if (selectedChamber.value !== 'all' && rep.chamberType !== selectedChamber.value) return false

        // Status filter
        if (selectedStatus.value !== 'all') {
          if (selectedStatus.value === 'leader' && !rep.isLeader) return false
          if (selectedStatus.value === 'government' && !rep.isGoverning) return false
          if (selectedStatus.value === 'opposition' && rep.isGoverning) return false
        }

        return true
      })
    })

    // Group representatives
    const groupedRepresentatives = computed(() => {
      const groups = {}

      filteredRepresentatives.value.forEach((rep) => {
        let key
        let label

        switch (groupBy.value) {
          case 'scope':
            key = rep.scope
            label = scopeLabel(rep.scope)
            break
          case 'party':
            key = rep.party
            label = store.partyMeta[rep.party]?.name || rep.party
            break
          case 'chamber':
            key = rep.chamberType
            label = rep.chamberType === 'assembly' ? 'Assembly' : 'Council'
            break
          case 'jurisdiction':
            key = rep.jurisdiction
            label = rep.jurisdiction
            break
          case 'status':
            if (rep.isLeader && rep.isGoverning) {
              key = 'government-leader'
              label = 'Government Leader'
            } else if (rep.isLeader && !rep.isGoverning) {
              key = 'opposition-leader'
              label = 'Opposition Leader'
            } else if (rep.isGoverning) {
              key = 'government'
              label = 'Government Member'
            } else {
              key = 'opposition'
              label = 'Opposition Member'
            }
            break
          default:
            key = rep.scope
            label = scopeLabel(rep.scope)
        }

        if (!groups[key]) {
          groups[key] = { key, label, representatives: [] }
        }
        groups[key].representatives.push(rep)
      })

      // Sort groups and representatives within groups
      return Object.values(groups).sort((a, b) => {
        if (groupBy.value === 'scope') {
          const order = { national: 1, regional: 2, provincial: 3 }
          return order[a.key] - order[b.key]
        }
        if (groupBy.value === 'party') {
          return b.representatives.length - a.representatives.length
        }
        if (groupBy.value === 'chamber') {
          const order = { assembly: 1, prelates: 2 }
          return order[a.key] - order[b.key]
        }
        if (groupBy.value === 'status') {
          const order = { 'government-leader': 1, 'government': 2, 'opposition-leader': 3, 'opposition': 4 }
          return order[a.key] - order[b.key]
        }
        return a.label.localeCompare(b.label)
      }).map((group) => ({
        ...group,
        representatives: group.representatives.sort((a, b) => {
          // Sort based on selected sort option
          const direction = sortDirection.value === 'asc' ? 1 : -1

          switch (sortBy.value) {
            case 'support':
              if (b.supportMetric !== a.supportMetric) {
                return (a.supportMetric - b.supportMetric) * direction
              }
              break
            case 'name':
              const nameCompare = a.title.localeCompare(b.title)
              if (nameCompare !== 0) return nameCompare * direction
              break
            case 'party':
              const partyCompare = a.party.localeCompare(b.party)
              if (partyCompare !== 0) return partyCompare * direction
              break
            case 'jurisdiction':
              const jurisdictionCompare = a.jurisdiction.localeCompare(b.jurisdiction)
              if (jurisdictionCompare !== 0) return jurisdictionCompare * direction
              break
            case 'seat':
              if (a.seatIndex !== b.seatIndex) {
                return (a.seatIndex - b.seatIndex) * direction
              }
              break
          }

          // Secondary sort: by party, then by jurisdiction
          if (a.party !== b.party) {
            return a.party.localeCompare(b.party)
          }
          return a.jurisdiction.localeCompare(b.jurisdiction)
        }),
      }))
    })

    const totalRepresentatives = computed(() => allRepresentatives.value.length)

    function scopeLabel(scope) {
      const labels = {
        national: 'National',
        regional: 'Regional',
        provincial: 'Provincial',
      }
      return labels[scope] || scope
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

    return {
      hasData,
      store,
      countryName,
      groupBy,
      sortBy,
      sortDirection,
      searchQuery,
      selectedScope,
      selectedParty,
      selectedChamber,
      selectedStatus,
      groupOptions,
      scopeOptions,
      parties: PARTIES,
      groupedRepresentatives,
      totalRepresentatives,
      scopeLabel,
      formatSupport,
      formatVoteShare,
    }
  },
}
</script>

<style scoped>
.overview-hero {
  margin-bottom: 24px;
}

.election-decision-hero-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.election-page-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: var(--accent-dim);
  border-radius: var(--radius-md);
}

.eyebrow {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.election-decision-hero-main h2 {
  margin: 4px 0 8px;
  font-family: 'Cinzel', serif;
  font-size: 1.5rem;
  font-weight: 700;
}

.election-decision-hero-main p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.directory-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  margin-bottom: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 8px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-btn:hover {
  background: var(--bg-surface-raised);
  border-color: var(--border-subtle);
}

.filter-btn--active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--text-primary);
}

.filter-input {
  padding: 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  min-width: 200px;
}

.filter-input:focus {
  outline: none;
  border-color: var(--accent);
}

.filter-input::placeholder {
  color: var(--text-muted);
}

.filter-select {
  padding: 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  min-width: 150px;
}

.directory-content {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  overflow-x: auto;
}

.directory-empty {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.directory-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.directory-group {
  background: var(--bg-surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.directory-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--bg-input);
  border-bottom: 1px solid var(--border-subtle);
}

.directory-group-header h3 {
  margin: 0;
  font-family: 'Cinzel', serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.group-count {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}

.directory-table {
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.directory-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-surface);
  font-size: 0.78rem;
  border-bottom: 1px solid var(--border-subtle);
}

.directory-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.directory-row:last-child td {
  border-bottom: none;
}

.directory-row:hover {
  background: var(--bg-input);
}

.col-name {
  min-width: 200px;
  font-weight: 600;
}

.representative-name {
  color: var(--text-primary);
}

.leader-badge,
.government-badge,
.opposition-badge {
  font-size: 0.8rem;
  margin-left: 6px;
}

.col-party {
  width: 120px;
}

.col-scope {
  width: 100px;
}

.scope-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--bg-input);
  color: var(--text-secondary);
}

.scope-badge--national {
  background: linear-gradient(135deg, #d4a84322, #d4a84311);
  border: 1px solid #d4a84366;
  color: #d4a843;
}

.scope-badge--regional {
  background: linear-gradient(135deg, #3b82f622, #3b82f611);
  border: 1px solid #3b82f666;
  color: #3b82f6;
}

.scope-badge--provincial {
  background: linear-gradient(135deg, #22c55e22, #22c55e11);
  border: 1px solid #22c55e66;
  color: #22c55e;
}

.col-chamber {
  width: 120px;
  color: var(--text-secondary);
}

.col-jurisdiction {
  min-width: 150px;
  color: var(--text-secondary);
}

.col-region {
  min-width: 140px;
  color: var(--text-secondary);
}

.col-seat {
  width: 80px;
  text-align: center;
  color: var(--text-secondary);
}

.col-vote {
  width: 90px;
  color: var(--text-secondary);
}

.col-support {
  width: 120px;
}

.support-bar-mini {
  position: relative;
  height: 20px;
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
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
}
</style>

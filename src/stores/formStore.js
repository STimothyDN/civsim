import { defineStore } from 'pinia'
import { watch } from 'vue'
import { defaultTemplate, normalizeIds, createBlankArrayItem, sortClosestProvinces } from '../utils/schema'
import { getValueAtPath, setValueAtPath, removeValueAtPath } from '../utils/path'
import { deepClone } from '../utils/object'
import { computeAllProvinceCalcs, computeRegionalTotals, resetJitterCache } from '../utils/calculatedFields'
import { clearAutosavedTemplate, readAutosavedState, writeAutosavedState } from '../domain/autosave'
import { partyMetaFromConfig, partyPaletteOption } from '../domain/elections/constants/parties'
import { buildExportTemplate, buildFullExportEnvelope, normalizeTemplateInput } from '../domain/templateCodec'
import {
  addNamedItem,
  removeProvinceGroup,
  renameGlobalReligion,
  renameProvinceGroup,
  setNationalCapital,
  setRegionalCapital,
} from '../domain/templateOperations'
import { useUiStore } from './uiStore'
import { useElectionStore } from './electionStore'
import { usePollingStore } from './pollingStore'

function makeWorldId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `world-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function defaultPollingSnapshot() {
  return { pollSeed: 'poll-baseline', view: 'national', regionName: '', provinceIndex: 0, comparePollsters: [] }
}

function worldDisplayName(data) {
  const name = data?.country?.basic_info?.name
  return (typeof name === 'string' && name.trim()) || 'Untitled Civilization'
}

function collectUniqueCountyField(data, fieldPath) {
  if (!data || !Array.isArray(data.provinces)) return []
  const set = new Set()
  for (const prov of data.provinces) {
    if (!Array.isArray(prov.counties)) continue
    for (const county of prov.counties) {
      const val = getValueAtPath(county, fieldPath)
      if (typeof val === 'string' && val.trim() !== '') {
        set.add(val.trim())
      }
    }
  }
  return Array.from(set).sort()
}

function collectUniqueCountyKeys(data, objectPath) {
  if (!data || !Array.isArray(data.provinces)) return []
  const set = new Set()
  for (const prov of data.provinces) {
    if (!Array.isArray(prov.counties)) continue
    for (const county of prov.counties) {
      const obj = getValueAtPath(county, objectPath)
      if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          if (key.trim() !== '') set.add(key.trim())
        }
      }
    }
  }
  return Array.from(set).sort()
}

function collectBuildingsForImprovement(data, improvementName, excludeCountyPath = '') {
  const wanted = String(improvementName || '').trim().toLowerCase()
  if (!wanted || !data || !Array.isArray(data.provinces)) return []

  const buildings = new Set()
  data.provinces.forEach((province, provinceIndex) => {
    if (!Array.isArray(province.counties)) return
    province.counties.forEach((county, countyIndex) => {
      const countyPath = `provinces[${provinceIndex}].counties[${countyIndex}]`
      if (countyPath === excludeCountyPath) return
      const name = String(county?.improvement?.name || '').trim().toLowerCase()
      if (name !== wanted) return
      Object.entries(county?.improvement?.buildings || {}).forEach(([building, enabled]) => {
        if (building.trim() && enabled === true) buildings.add(building.trim())
      })
    })
  })

  return Array.from(buildings).sort()
}

const AUTOSAVE_DELAY = 350
let autosaveStop = null
let autosaveTimer = null

// Memoization cache for unique value collections
const uniqueValueCache = new Map()
const cacheVersions = {
  terrains: 0,
  resources: 0,
  rivers: 0,
  improvementNames: 0,
  features: 0,
  buildings: 0,
  greatWorks: 0,
}

function invalidateCacheForKey(key) {
  if (cacheVersions.hasOwnProperty(key)) {
    cacheVersions[key]++
  }
}

function invalidateUniqueValueCache() {
  // Invalidate all caches (fallback for bulk operations)
  Object.keys(cacheVersions).forEach(key => {
    cacheVersions[key]++
  })
}

function getMemoizedUniqueValue(key, computeFn) {
  const version = cacheVersions[key] || 0
  const cacheKey = `${key}-${version}`
  if (uniqueValueCache.has(cacheKey)) {
    return uniqueValueCache.get(cacheKey)
  }
  const value = computeFn()
  uniqueValueCache.set(cacheKey, value)
  return value
}

function clearPendingAutosave() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
    autosaveTimer = null
  }
}

export const useFormStore = defineStore('form', {
  state: () => ({
    currentData: null,
    lastAutosavedAt: null,
    _recalcVersion: 0,
    // Multi-civ registry. The active world's live data IS `currentData`;
    // inactive worlds keep their data + election/polling snapshots here.
    worlds: [],
    activeWorldId: null,
  }),
  getters: {
    /** Display rows for the world switcher (active world reads live data). */
    worldSummaries(state) {
      void state._recalcVersion
      return state.worlds.map((world) => {
        const isActive = world.id === state.activeWorldId
        const data = isActive ? state.currentData : world.data
        return {
          id: world.id,
          active: isActive,
          name: worldDisplayName(data),
          leader: data?.country?.basic_info?.leader || '',
          provinceCount: data?.provinces?.length || 0,
          savedAt: world.savedAt || null,
        }
      })
    },
    provinceCalcs(state) {
      // Access _recalcVersion to create a reactive dependency so
      // that bumping it forces Vue to recompute this getter.
      void state._recalcVersion
      return computeAllProvinceCalcs(state.currentData?.provinces, state.currentData?.config?.calculations)
    },

    uniqueTerrains(state) {
      void state._recalcVersion
      return getMemoizedUniqueValue('terrains', () => collectUniqueCountyField(state.currentData, 'terrain'))
    },
    uniqueResources(state) {
      void state._recalcVersion
      return getMemoizedUniqueValue('resources', () => collectUniqueCountyField(state.currentData, 'resource'))
    },
    uniqueRivers(state) {
      void state._recalcVersion
      return getMemoizedUniqueValue('rivers', () => collectUniqueCountyField(state.currentData, 'river'))
    },
    uniqueImprovementNames(state) {
      void state._recalcVersion
      return getMemoizedUniqueValue('improvementNames', () => collectUniqueCountyField(state.currentData, 'improvement.name'))
    },
    uniqueFeatures(state) {
      void state._recalcVersion
      return getMemoizedUniqueValue('features', () => collectUniqueCountyKeys(state.currentData, 'features'))
    },
    uniqueBuildings(state) {
      void state._recalcVersion
      return getMemoizedUniqueValue('buildings', () => collectUniqueCountyKeys(state.currentData, 'improvement.buildings'))
    },
    uniqueGreatWorks(state) {
      void state._recalcVersion
      return getMemoizedUniqueValue('greatWorks', () => collectUniqueCountyKeys(state.currentData, 'improvement.great_works'))
    },
    /** @deprecated Use civilizationStore.partyMeta instead. Kept for backward compatibility. */
    partyMeta(state) {
      void state._recalcVersion
      return partyMetaFromConfig(state.currentData?.config?.parties)
    },
  },
  actions: {
    showToast(message, type = 'info') {
      useUiStore().showToast(message, type)
    },
    loadTemplate(template, options = {}) {
      resetJitterCache()
      invalidateUniqueValueCache()
      const data = normalizeTemplateInput(template || defaultTemplate)
      this.currentData = data
      this._registerActiveWorld(data, options)
      if (!options.silent) this.showToast('Template loaded successfully', 'success')
    },
    loadDefault() {
      this.loadTemplate(defaultTemplate)
    },

    // ── Multi-civ world registry ──────────────────────────────────────────

    /** Ensure the freshly-loaded data is reflected as the active world record. */
    _registerActiveWorld(data, options = {}) {
      const existing = this.activeWorldId ? this.worlds.find((w) => w.id === this.activeWorldId) : null
      if (existing) {
        existing.data = data
        existing.savedAt = new Date().toISOString()
        return existing
      }
      const record = {
        id: makeWorldId(),
        data,
        election: options.election || null,
        polling: defaultPollingSnapshot(),
        savedAt: new Date().toISOString(),
      }
      this.worlds.push(record)
      this.activeWorldId = record.id
      return record
    },

    /** Stash the active world's live data + election/polling back into its record. */
    _snapshotActiveWorld() {
      if (!this.activeWorldId) return
      const record = this.worlds.find((w) => w.id === this.activeWorldId)
      if (!record) return
      record.data = this.currentData
      record.election = useElectionStore().snapshotElectionState()
      record.polling = { ...usePollingStore().$state }
      record.savedAt = new Date().toISOString()
    },

    /** Restore a world's election + polling state into their stores. */
    _applyWorldSideState(record) {
      const election = useElectionStore()
      if (record?.election) election.hydrateElectionState(record.election)
      else election.resetScenario()
      usePollingStore().$patch({ ...defaultPollingSnapshot(), ...(record?.polling || {}) })
    },

    /** Switch the active civilization, snapshotting the current one first. */
    switchWorld(id) {
      if (id === this.activeWorldId) return false
      const target = this.worlds.find((w) => w.id === id)
      if (!target) return false
      this._snapshotActiveWorld()
      resetJitterCache()
      invalidateUniqueValueCache()
      this.currentData = target.data
      this.activeWorldId = id
      this._applyWorldSideState(target)
      this._recalcVersion++
      this.scheduleAutosave()
      this.showToast(`Switched to ${worldDisplayName(this.currentData)}`, 'success')
      return true
    },

    /** Add a new civilization (parking the current one) and activate it. */
    addWorld(template, options = {}) {
      this._snapshotActiveWorld()
      resetJitterCache()
      invalidateUniqueValueCache()
      const data = normalizeTemplateInput(template || defaultTemplate)
      const record = {
        id: makeWorldId(),
        data,
        election: options.election || null,
        polling: defaultPollingSnapshot(),
        savedAt: new Date().toISOString(),
      }
      this.worlds.push(record)
      this.currentData = data
      this.activeWorldId = record.id
      this._applyWorldSideState(record)
      this._recalcVersion++
      this.scheduleAutosave()
      if (!options.silent) this.showToast(`Added ${worldDisplayName(data)}`, 'success')
      return record.id
    },

    /** Remove a civilization; if it was active, fall back to another (or empty). */
    removeWorld(id) {
      const index = this.worlds.findIndex((w) => w.id === id)
      if (index === -1) return
      const wasActive = id === this.activeWorldId
      const name = worldDisplayName(wasActive ? this.currentData : this.worlds[index].data)
      this.worlds.splice(index, 1)

      if (wasActive) {
        const next = this.worlds[0] || null
        resetJitterCache()
        invalidateUniqueValueCache()
        this.currentData = next ? next.data : null
        this.activeWorldId = next ? next.id : null
        this._applyWorldSideState(next)
        this._recalcVersion++
      }
      this.scheduleAutosave()
      this.showToast(`Removed ${name}`, 'info')
    },
    setValueAtPath(path, value) {
      if (!this.currentData) return

      // Get previous value for resource field to clean up old feature
      const resourceMatch = path.match(/^(provinces\[\d+\]\.counties\[\d+\])\.resource$/)
      let previousResource = null
      if (resourceMatch) {
        previousResource = getValueAtPath(this.currentData, path)
      }

      setValueAtPath(this.currentData, path, value)

      // Selective cache invalidation based on what changed
      if (path.includes('.counties[')) {
        if (path.endsWith('.terrain')) {
          invalidateCacheForKey('terrains')
        } else if (path.endsWith('.resource')) {
          invalidateCacheForKey('resources')
          invalidateCacheForKey('features')
        } else if (path.endsWith('.river')) {
          invalidateCacheForKey('rivers')
        } else if (path.endsWith('.improvement.name')) {
          invalidateCacheForKey('improvementNames')
          invalidateCacheForKey('buildings')
        } else if (path.includes('.improvement.buildings')) {
          invalidateCacheForKey('buildings')
        } else if (path.includes('.improvement.great_works')) {
          invalidateCacheForKey('greatWorks')
        } else if (path.includes('.features')) {
          invalidateCacheForKey('features')
        } else {
          // For other county fields, invalidate all as fallback
          invalidateUniqueValueCache()
        }
      }

      const improvementMatch = path.match(/^(provinces\[\d+\]\.counties\[\d+\])\.improvement\.name$/)
      if (improvementMatch) {
        const buildingPath = `${improvementMatch[1]}.improvement.buildings`
        const existingBuildings = getValueAtPath(this.currentData, buildingPath) || {}
        collectBuildingsForImprovement(this.currentData, value, improvementMatch[1]).forEach((building) => {
          if (!Object.prototype.hasOwnProperty.call(existingBuildings, building)) {
            setValueAtPath(this.currentData, `${buildingPath}.${building}`, false)
          }
        })
      }

      if (resourceMatch) {
        const featuresPath = `${resourceMatch[1]}.features`
        // Remove previous resource from features if it existed
        if (previousResource && typeof previousResource === 'string' && previousResource.trim()) {
          removeValueAtPath(this.currentData, `${featuresPath}.${previousResource.trim()}`)
        }
        // Add new resource to features if it's non-empty
        if (typeof value === 'string' && value.trim()) {
          setValueAtPath(this.currentData, `${featuresPath}.${value.trim()}`, true)
        }
      }

      const closestProvinceMatch = path.match(/^(provinces\[\d+\]\.closest_provinces)\[\d+\]\.(province_name|distance)$/)
      if (closestProvinceMatch) {
        sortClosestProvinces(getValueAtPath(this.currentData, closestProvinceMatch[1]))
      }

      // Trigger autosave on data changes instead of relying on deep watch
      this.scheduleAutosave()
      
      // Bump recalc version only for fields that actually affect calculations
      // This prevents unnecessary re-renders of computed properties
      if (!path.match(/^(provinces\[\d+\]\.counties\[\d+\]\.(name|terrain|resource|river|improvement\.name))$/)) {
        this._recalcVersion++
      }
    },
    getValueAtPath(path) {
      if (!this.currentData) return undefined
      return getValueAtPath(this.currentData, path)
    },
    addArrayItem(path) {
      if (!this.currentData) return
      const arr = getValueAtPath(this.currentData, path)
      if (!Array.isArray(arr)) return
      const blank = createBlankArrayItem(path) || (arr.length > 0 ? deepClone(arr[0]) : null)
      arr.push(blank)
      normalizeIds(this.currentData)

      // Selective cache invalidation when counties are added
      if (path.includes('.counties')) {
        // Adding/removing counties affects all unique value collections
        invalidateUniqueValueCache()
      }

      this.scheduleAutosave()
    },
    removeArrayItem(path, index) {
      if (!this.currentData) return
      const arr = getValueAtPath(this.currentData, path)
      if (!Array.isArray(arr)) return
      arr.splice(index, 1)
      normalizeIds(this.currentData)

      // Selective cache invalidation when counties are removed
      if (path.includes('.counties')) {
        // Adding/removing counties affects all unique value collections
        invalidateUniqueValueCache()
      }

      this.scheduleAutosave()
    },
    removeObjectKey(path) {
      if (!this.currentData) return
      removeValueAtPath(this.currentData, path)

      // Selective cache invalidation for removed keys
      if (path.includes('.counties[')) {
        if (path.includes('.features')) {
          invalidateCacheForKey('features')
        } else if (path.includes('.improvement.buildings')) {
          invalidateCacheForKey('buildings')
        } else if (path.includes('.improvement.great_works')) {
          invalidateCacheForKey('greatWorks')
        } else {
          invalidateUniqueValueCache()
        }
      }

      this.scheduleAutosave()
    },
    exportTemplate() {
      const regionalTotals = computeRegionalTotals(
        this.currentData?.provinces,
        this.provinceCalcs
      )
      return buildExportTemplate(this.currentData, this.provinceCalcs, regionalTotals)
    },
    downloadJson() {
      const output = this.exportTemplate()
      if (!output) return
      const data = JSON.stringify(output, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'template-output.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      this.showToast('JSON file downloaded', 'success')
    },
    downloadJsonWithElection(electionSnapshot = null, computedSnapshot = {}) {
      const regionalTotals = computeRegionalTotals(this.currentData?.provinces, this.provinceCalcs)
      const output = buildFullExportEnvelope(this.currentData, this.provinceCalcs, regionalTotals, electionSnapshot, computedSnapshot)
      if (!output) return
      const rawName = this.currentData?.country?.basic_info?.name || ''
      const safeName = rawName
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase() || 'civ-save'
      const data = JSON.stringify(output, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${safeName}-save.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      this.showToast('Full state exported to JSON', 'success')
    },
    loadFromFile(file) {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result)
          this.loadTemplate(parsed)
        } catch (err) {
          this.showToast('Invalid JSON file. Please choose a valid template file.', 'error')
        }
      }
      reader.readAsText(file)
    },
    addProvinceGroup(name) {
      if (!this.currentData) return
      this.currentData.province_groups = addNamedItem(this.currentData.province_groups, name)
      this.scheduleAutosave()
    },
    removeProvinceGroup(index) {
      removeProvinceGroup(this.currentData, index)
      this.scheduleAutosave()
    },
    renameProvinceGroup(index, newName) {
      renameProvinceGroup(this.currentData, index, newName)
      this.scheduleAutosave()
    },
    setProvinceGroupForProvince(provinceIndex, groupName) {
      if (!this.currentData || !Array.isArray(this.currentData.provinces)) return
      if (!this.currentData.provinces[provinceIndex]) return
      this.currentData.provinces[provinceIndex].group = groupName || null
      this.scheduleAutosave()
    },
    addGlobalReligion(name) {
      if (!this.currentData) return
      this.currentData.global_religions = addNamedItem(this.currentData.global_religions, name)
      this.scheduleAutosave()
    },
    removeGlobalReligion(index) {
      if (!this.currentData || !Array.isArray(this.currentData.global_religions)) return
      this.currentData.global_religions.splice(index, 1)
      this.scheduleAutosave()
    },
    renameGlobalReligion(index, newName) {
      renameGlobalReligion(this.currentData, index, newName)
      this.scheduleAutosave()
    },
    _findParty(partyId) {
      const parties = this.currentData?.config?.parties
      if (!Array.isArray(parties)) return null
      return parties.find((party) => party.id === partyId) || null
    },
    setPartyName(partyId, name) {
      const party = this._findParty(partyId)
      if (!party) return
      party.name = String(name || '').trim()
      this._recalcVersion++
      this.scheduleAutosave()
    },
    setPartyAbbreviation(partyId, abbreviation) {
      const party = this._findParty(partyId)
      if (!party) return
      party.abbreviation = String(abbreviation || '').trim().toUpperCase().replace(/\s+/g, '').slice(0, 8)
      this._recalcVersion++
      this.scheduleAutosave()
    },
    setPartyColor(partyId, color) {
      const party = this._findParty(partyId)
      if (!party) return
      const option = partyPaletteOption(color, party.colorName)
      party.colorName = option.name
      party.color = option.color
      this._recalcVersion++
      this.scheduleAutosave()
    },
    setPartyColorName(partyId, colorName) {
      const party = this._findParty(partyId)
      if (!party) return
      const option = partyPaletteOption(colorName, party.colorName)
      party.colorName = option.name
      party.color = option.color
      this._recalcVersion++
      this.scheduleAutosave()
    },
    addParty(name = '') {
      if (!this.currentData) return null
      if (!Array.isArray(this.currentData.config?.parties)) {
        if (!this.currentData.config) this.currentData.config = {}
        this.currentData.config.parties = []
      }
      const parties = this.currentData.config.parties
      const usedIds = new Set(parties.map((p) => p.id))
      let base = String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `party-${parties.length + 1}`
      let id = base
      let n = 1
      while (usedIds.has(id)) id = `${base}-${++n}`
      const palette = partyPaletteOption(undefined, 'Slate')
      parties.push({
        id,
        name: String(name || '').trim() || `Party ${parties.length + 1}`,
        abbreviation: id.slice(0, 3).toUpperCase(),
        colorName: palette.name,
        color: palette.color,
        tier: 'major',
        ideology: '',
        coalitionPartners: [],
        bias: { county: 0, province: 0, national: 0 },
        affinities: { county: {}, province: {}, national: {} },
      })
      this._recalcVersion++
      this.scheduleAutosave()
      return id
    },
    removeParty(partyId) {
      const parties = this.currentData?.config?.parties
      if (!Array.isArray(parties)) return
      const index = parties.findIndex((p) => p.id === partyId)
      if (index === -1) return
      parties.splice(index, 1)
      // Drop voter blocs and coalition references targeting the removed party.
      const blocs = this.currentData.config.voterBlocs
      if (Array.isArray(blocs)) {
        this.currentData.config.voterBlocs = blocs.filter((b) => b.party !== partyId)
      }
      parties.forEach((p) => {
        if (Array.isArray(p.coalitionPartners)) {
          p.coalitionPartners = p.coalitionPartners.filter((id) => id !== partyId)
        }
      })
      this._recalcVersion++
      this.scheduleAutosave()
    },
    addCulture() {
      if (!this.currentData) return
      if (!this.currentData.config) this.currentData.config = {}
      if (!this.currentData.config.naming) {
        this.currentData.config.naming = { homeCulture: { id: 'home', label: 'Home', givenMale: [], givenFemale: [], surnames: [] }, cultures: [] }
      }
      if (!Array.isArray(this.currentData.config.naming.cultures)) this.currentData.config.naming.cultures = []
      const cultures = this.currentData.config.naming.cultures
      const used = new Set(cultures.map((c) => c.id))
      let n = cultures.length + 1
      let id = `culture-${n}`
      while (used.has(id)) id = `culture-${++n}`
      cultures.push({
        id,
        label: 'New culture',
        givenMale: [],
        givenFemale: [],
        surnames: [],
        selector: { originalCountryIncludes: [] },
        parties: [],
        influence: 1,
        ambient: 0,
        surnameBlend: 0,
      })
      this._recalcVersion++
      this.scheduleAutosave()
    },
    removeCulture(index) {
      const cultures = this.currentData?.config?.naming?.cultures
      if (!Array.isArray(cultures)) return
      cultures.splice(index, 1)
      this._recalcVersion++
      this.scheduleAutosave()
    },
    addVoterBloc() {
      if (!this.currentData) return
      if (!this.currentData.config) this.currentData.config = {}
      if (!Array.isArray(this.currentData.config.voterBlocs)) this.currentData.config.voterBlocs = []
      const blocs = this.currentData.config.voterBlocs
      const firstParty = this.currentData.config.parties?.[0]?.id || ''
      let id = `bloc-${blocs.length + 1}`
      const used = new Set(blocs.map((b) => b.id))
      let n = blocs.length + 1
      while (used.has(id)) id = `bloc-${++n}`
      blocs.push({
        id,
        label: 'New voter bloc',
        party: firstParty,
        source: { selector: { originalCountryIncludes: [] } },
        strength: { county: 0, province: 0, national: 0 },
      })
      this._recalcVersion++
      this.scheduleAutosave()
    },
    removeVoterBloc(index) {
      const blocs = this.currentData?.config?.voterBlocs
      if (!Array.isArray(blocs)) return
      blocs.splice(index, 1)
      this._recalcVersion++
      this.scheduleAutosave()
    },
    reorderParty(partyId, direction) {
      const parties = this.currentData?.config?.parties
      if (!Array.isArray(parties)) return
      const index = parties.findIndex((p) => p.id === partyId)
      if (index === -1) return
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= parties.length) return
      const [moved] = parties.splice(index, 1)
      parties.splice(target, 0, moved)
      this._recalcVersion++
      this.scheduleAutosave()
    },
    setPartyTier(partyId, tier) {
      const party = this._findParty(partyId)
      if (!party) return
      party.tier = tier === 'minor' ? 'minor' : 'major'
      this.scheduleAutosave()
    },
    /**
     * Replace every party's affinities + bias (the political model) in bulk.
     * `newParties` is a full party array; only affinities/bias are taken from it,
     * other fields (id/name/color/tier/coalitionPartners) are preserved from the
     * matching current party by id.
     */
    applyPoliticalModel(newParties) {
      const parties = this.currentData?.config?.parties
      if (!Array.isArray(parties) || !Array.isArray(newParties)) return
      const byId = new Map(newParties.map((p) => [p.id, p]))
      parties.forEach((party) => {
        const next = byId.get(party.id)
        if (!next) return
        if (next.affinities) party.affinities = next.affinities
        if (next.bias) party.bias = next.bias
      })
      this._recalcVersion++
      this.scheduleAutosave()
    },
    setNationalCapital(provinceIndex) {
      setNationalCapital(this.currentData, provinceIndex)
      this.scheduleAutosave()
    },
    clearNationalCapital(provinceIndex) {
      if (!this.currentData || !Array.isArray(this.currentData.provinces)) return
      const province = this.currentData.provinces[provinceIndex]
      if (province) province.is_national_capital = false
      this.scheduleAutosave()
    },
    setRegionalCapital(provinceIndex) {
      setRegionalCapital(this.currentData, provinceIndex)
      this.scheduleAutosave()
    },
    clearRegionalCapital(provinceIndex) {
      if (!this.currentData || !Array.isArray(this.currentData.provinces)) return
      const province = this.currentData.provinces[provinceIndex]
      if (province) province.is_regional_capital = false
      this.scheduleAutosave()
    },
    recalculate() {
      resetJitterCache()
      this._recalcVersion++
      this.showToast('Values recalculated', 'success')
    },
    async hydrateFromAutosave() {
      const { worlds, activeWorldId, error } = await readAutosavedState()
      if (error) {
        this.showToast('Autosaved draft was invalid and has been cleared', 'error')
        return false
      }
      if (!worlds || !worlds.length) return false

      resetJitterCache()
      invalidateUniqueValueCache()
      this.worlds = worlds
      const active = worlds.find((w) => w.id === activeWorldId) || worlds[0]
      this.activeWorldId = active.id
      this.currentData = active.data
      this.lastAutosavedAt = active.savedAt || null
      this._applyWorldSideState(active)
      this.showToast(
        worlds.length > 1 ? `Restored ${worlds.length} worlds` : 'Autosaved world restored',
        'success'
      )
      return true
    },
    async persistAutosaveNow() {
      clearPendingAutosave()
      this._snapshotActiveWorld()
      if (!this.worlds.length) {
        await clearAutosavedTemplate()
        this.lastAutosavedAt = null
        return false
      }

      const saved = await writeAutosavedState({ worlds: this.worlds, activeWorldId: this.activeWorldId })
      if (saved) this.lastAutosavedAt = new Date().toISOString()
      return saved
    },
    scheduleAutosave() {
      clearPendingAutosave()
      autosaveTimer = setTimeout(() => {
        // Fire-and-forget: IndexedDB writes are async and must not block edits.
        Promise.resolve(this.persistAutosaveNow()).catch(() => {})
      }, AUTOSAVE_DELAY)
    },
    startAutosave() {
      // Autosave is now manually triggered from data-modifying actions
      // No deep watch needed - it was causing performance issues
    },
    stopAutosave() {
      if (autosaveStop) {
        autosaveStop()
        autosaveStop = null
      }
      clearPendingAutosave()
    },
  }
})

import { defineStore } from 'pinia'
import { watch } from 'vue'
import { defaultTemplate, normalizeIds, createBlankArrayItem, sortClosestProvinces } from '../utils/schema'
import { getValueAtPath, setValueAtPath, removeValueAtPath } from '../utils/path'
import { deepClone } from '../utils/object'
import { computeAllProvinceCalcs, computeRegionalTotals, resetJitterCache } from '../utils/calculatedFields'
import { clearAutosavedTemplate, readAutosavedTemplate, writeAutosavedTemplate } from '../domain/autosave'
import { partyColorsFromConfig, partyMetaFromConfig, partyNamesFromConfig, partyPaletteOption } from '../domain/elections/constants/parties'
import { buildExportTemplate, normalizeTemplateInput } from '../domain/templateCodec'
import {
  addNamedItem,
  removeProvinceGroup,
  renameGlobalReligion,
  renameProvinceGroup,
  setNationalCapital,
  setRegionalCapital,
} from '../domain/templateOperations'
import { useUiStore } from './uiStore'

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
  }),
  getters: {
    provinceCalcs(state) {
      // Access _recalcVersion to create a reactive dependency so
      // that bumping it forces Vue to recompute this getter.
      void state._recalcVersion
      return computeAllProvinceCalcs(state.currentData?.provinces)
    },
    regionalTotals(state) {
      void state._recalcVersion
      return computeRegionalTotals(
        state.currentData?.provinces,
        this.provinceCalcs
      )
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
    partyMeta(state) {
      void state._recalcVersion
      return partyMetaFromConfig(state.currentData?.election_parties)
    },
    partyNames(state) {
      void state._recalcVersion
      return partyNamesFromConfig(state.currentData?.election_parties)
    },
    partyColors(state) {
      void state._recalcVersion
      return partyColorsFromConfig(state.currentData?.election_parties)
    },
  },
  actions: {
    showToast(message, type = 'info') {
      useUiStore().showToast(message, type)
    },
    loadTemplate(template, options = {}) {
      resetJitterCache()
      invalidateUniqueValueCache()
      this.currentData = normalizeTemplateInput(template || defaultTemplate)
      if (!options.silent) this.showToast('Template loaded successfully', 'success')
    },
    loadDefault() {
      this.loadTemplate(defaultTemplate)
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
      return buildExportTemplate(this.currentData, this.provinceCalcs, this.regionalTotals)
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
    setPartyName(party, name) {
      if (!this.currentData?.election_parties?.[party]) return
      this.currentData.election_parties[party].name = String(name || '').trim()
      this._recalcVersion++
      this.scheduleAutosave()
    },
    setPartyAbbreviation(party, abbreviation) {
      if (!this.currentData?.election_parties?.[party]) return
      this.currentData.election_parties[party].abbreviation = String(abbreviation || '').trim().toUpperCase().replace(/\s+/g, '').slice(0, 8)
      this._recalcVersion++
      this.scheduleAutosave()
    },
    setPartyColor(party, color) {
      if (!this.currentData?.election_parties?.[party]) return
      const option = partyPaletteOption(color, this.currentData.election_parties[party].colorName)
      this.currentData.election_parties[party].colorName = option.name
      this.currentData.election_parties[party].color = option.color
      this._recalcVersion++
      this.scheduleAutosave()
    },
    setPartyColorName(party, colorName) {
      if (!this.currentData?.election_parties?.[party]) return
      const option = partyPaletteOption(colorName, this.currentData.election_parties[party].colorName)
      this.currentData.election_parties[party].colorName = option.name
      this.currentData.election_parties[party].color = option.color
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
    hydrateFromAutosave() {
      const { template, savedAt, error } = readAutosavedTemplate()
      if (error) {
        this.showToast('Autosaved draft was invalid and has been cleared', 'error')
        return false
      }
      if (!template) return false

      resetJitterCache()
      invalidateUniqueValueCache()
      this.currentData = template
      this.lastAutosavedAt = savedAt
      this.showToast('Autosaved template restored', 'success')
      return true
    },
    persistAutosaveNow() {
      clearPendingAutosave()
      if (!this.currentData) {
        clearAutosavedTemplate()
        this.lastAutosavedAt = null
        return false
      }

      const saved = writeAutosavedTemplate(normalizeTemplateInput(this.currentData))
      if (saved) this.lastAutosavedAt = new Date().toISOString()
      return saved
    },
    scheduleAutosave() {
      clearPendingAutosave()
      autosaveTimer = setTimeout(() => {
        this.persistAutosaveNow()
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

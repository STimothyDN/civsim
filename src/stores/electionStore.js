import { defineStore } from 'pinia'
import { BASELINE_ELECTION_CONFIG, generateRandomTrendPackage } from '../domain/elections'
import { makeSeed } from '../domain/elections/randomness/seededRandom'
import { generateRepresentativeNames } from '../domain/elections/representativeNames'

const RANDOM_SCENARIO_NAME = 'Randomized Election Climate'
const RANDOM_SCENARIO_DESCRIPTION = 'A randomized set of climate signals is shaping the electorate.'

function climateDescriptionForTrends(trends = []) {
  const labels = trends.slice(0, 3).map((trend) => trend.label).filter(Boolean)
  if (!labels.length) return RANDOM_SCENARIO_DESCRIPTION
  return `Climate signals include ${labels.join(', ')}${trends.length > labels.length ? ', and more' : ''}.`
}

function cloneBaseline() {
  return {
    ...BASELINE_ELECTION_CONFIG,
    volatility: { ...BASELINE_ELECTION_CONFIG.volatility },
    trends: [],
    scenarioMetadataStatus: 'idle',
    scenarioMetadataError: null,
    representativeNames: {}, // Map of "{party}_{seatIndex}" -> "Full Name"
    electionNumber: 0,
    trendHistory: [],
    previousElectionConfig: null,
    // Incumbent tracking: stable keys "{party}_{withinPartyIndex}_{scope}_{chamberType}_{scopeName}" -> name
    currentRoster: {},    // rebuilt after each name generation pass
    incumbentRoster: {},  // promoted from currentRoster on confirmElection()
  }
}

export const useElectionStore = defineStore('election', {
  state: () => cloneBaseline(),
  getters: {
    electionConfig(state) {
      return {
        seed: state.seed,
        jitterSeed: state.jitterSeed,
        trendPackageId: state.trendPackageId,
        scenarioName: state.scenarioName,
        scenarioDescription: state.scenarioDescription,
        trends: state.trends,
        volatility: state.volatility,
      }
    },
    isBaseline(state) {
      return state.trendPackageId === 'baseline' && state.seed === 'baseline' && state.jitterSeed === 'baseline' && state.trends.length === 0
    },
    electionYear(state) {
      return 2026 + state.electionNumber * 2
    },
    pendingTrends(state) {
      const confirmedCount = state.trendHistory.flat().length
      return state.trends.slice(confirmedCount)
    },
    hasPendingElection(state) {
      return state.trends.length > state.trendHistory.flat().length
    },
  },
  actions: {
    resetScenario() {
      Object.assign(this, cloneBaseline())
    },
    randomizeScenario() {
      const seed = makeSeed('scenario')
      const jitterSeed = makeSeed('jitter')
      const newTrends = generateRandomTrendPackage({ seed })
      const trendPackageId = `random-${seed}`
      const confirmedBase = this.trendHistory.flat()
      this.trends = [...confirmedBase, ...newTrends]
      this.seed = seed
      this.jitterSeed = jitterSeed
      this.trendPackageId = trendPackageId
      this.scenarioName = RANDOM_SCENARIO_NAME
      this.scenarioDescription = climateDescriptionForTrends(newTrends)
      this.scenarioMetadataStatus = 'idle'
      this.scenarioMetadataError = null

      return {
        id: trendPackageId,
        trendPackageId,
        title: this.scenarioName,
        summary: this.scenarioDescription,
        seed,
        jitterSeed,
        trends: newTrends,
      }
    },
    applyTrendPackage(packageDef) {
      const newTrends = Array.isArray(packageDef?.trends) ? packageDef.trends : []
      const confirmedBase = this.trendHistory.flat()
      this.trends = [...confirmedBase, ...newTrends]
      this.seed = packageDef?.seed || this.seed
      this.jitterSeed = packageDef?.jitterSeed || this.jitterSeed
      this.trendPackageId = packageDef?.id || packageDef?.trendPackageId || 'manual'
      this.scenarioName = packageDef?.scenarioName || packageDef?.name || packageDef?.title || RANDOM_SCENARIO_NAME
      this.scenarioDescription = packageDef?.scenarioDescription || packageDef?.description || packageDef?.summary || climateDescriptionForTrends(newTrends)
      this.scenarioMetadataStatus = 'idle'
      this.scenarioMetadataError = null
      if (packageDef?.volatility) {
        this.volatility = {
          ...this.volatility,
          ...packageDef.volatility,
        }
      }
    },
    confirmElection() {
      if (!this.hasPendingElection) return
      this.previousElectionConfig = {
        seed: this.seed,
        jitterSeed: this.jitterSeed,
        trendPackageId: this.trendPackageId,
        scenarioName: this.scenarioName,
        scenarioDescription: this.scenarioDescription,
        trends: [...this.trends],
        volatility: { ...this.volatility },
      }
      const confirmedBase = this.trendHistory.flat()
      const newTrends = this.trends.slice(confirmedBase.length)
      this.trendHistory.push([...newTrends])
      this.electionNumber++
      this.incumbentRoster = { ...this.currentRoster }
    },
    saveCurrentRoster(roster) {
      this.currentRoster = roster
    },
    setScenarioMetadataLoading(trendPackageId = this.trendPackageId) {
      if (trendPackageId && trendPackageId !== this.trendPackageId) return
      this.scenarioMetadataStatus = 'loading'
      this.scenarioMetadataError = null
    },
    applyScenarioMetadata(metadata = {}, trendPackageId = this.trendPackageId) {
      if (trendPackageId && trendPackageId !== this.trendPackageId) return false
      this.scenarioName = metadata.scenarioName || metadata.name || metadata.title || this.scenarioName
      this.scenarioDescription = metadata.scenarioDescription || metadata.description || metadata.summary || this.scenarioDescription
      this.scenarioMetadataStatus = 'idle'
      this.scenarioMetadataError = null
      return true
    },
    setScenarioMetadataError(message, trendPackageId = this.trendPackageId) {
      if (trendPackageId && trendPackageId !== this.trendPackageId) return
      this.scenarioMetadataStatus = 'error'
      this.scenarioMetadataError = message || 'Scenario description could not be generated.'
    },
    generateAndStoreRepresentativeNames(seatDetails, provinces, countryName, seed) {
      const names = generateRepresentativeNames(seatDetails, provinces, `${countryName}_${seed}`)
      // Merge with existing names instead of overwriting
      this.representativeNames = { ...this.representativeNames, ...names }
      return names
    },
    clearRepresentativeNames() {
      this.representativeNames = {}
    },
    getRepresentativeName(party, seatIndex) {
      const key = `${party}_${seatIndex}`
      return this.representativeNames[key] || null
    },
  },
})

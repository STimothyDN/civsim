import { defineStore } from 'pinia'
import { BASELINE_ELECTION_CONFIG, generateRandomTrendPackage } from '../domain/elections'
import { makeSeed } from '../domain/elections/randomness/seededRandom'

function cloneBaseline() {
  return {
    ...BASELINE_ELECTION_CONFIG,
    volatility: { ...BASELINE_ELECTION_CONFIG.volatility },
    trends: [],
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
        trends: state.trends,
        volatility: state.volatility,
      }
    },
    isBaseline(state) {
      return state.trendPackageId === 'baseline' && state.seed === 'baseline' && state.jitterSeed === 'baseline' && state.trends.length === 0
    },
  },
  actions: {
    resetScenario() {
      Object.assign(this, cloneBaseline())
    },
    randomizeScenario() {
      const seed = makeSeed('scenario')
      const jitterSeed = makeSeed('jitter')
      this.seed = seed
      this.jitterSeed = jitterSeed
      this.trendPackageId = `random-${seed}`
      this.trends = generateRandomTrendPackage({ seed })
    },
    applyTrendPackage(packageDef) {
      this.seed = packageDef?.seed || this.seed
      this.jitterSeed = packageDef?.jitterSeed || this.jitterSeed
      this.trendPackageId = packageDef?.id || packageDef?.trendPackageId || 'manual'
      this.trends = Array.isArray(packageDef?.trends) ? packageDef.trends : []
    },
  },
})


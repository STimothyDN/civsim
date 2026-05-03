import { defineStore } from 'pinia'
import { makeSeed } from '../domain/elections/randomness/seededRandom'

const VIEWS = ['national', 'regional', 'provincial']

export const usePollingStore = defineStore('polling', {
  state: () => ({
    pollSeed: 'poll-baseline',
    view: 'national',
    regionName: '',
    provinceIndex: 0,
    comparePollsters: [],
  }),
  actions: {
    randomizePolls() {
      this.pollSeed = makeSeed('poll')
      this.comparePollsters = []
    },
    setView(view) {
      if (!VIEWS.includes(view)) return
      this.view = view
    },
    selectRegion(name) {
      this.regionName = String(name || '')
      this.view = 'regional'
    },
    selectProvince(index) {
      const parsed = Number(index)
      this.provinceIndex = Number.isFinite(parsed) ? parsed : 0
      this.view = 'provincial'
    },
    togglePollsterCompare(id) {
      const key = String(id || '')
      if (!key) return
      if (this.comparePollsters.includes(key)) {
        this.comparePollsters = this.comparePollsters.filter((pollsterId) => pollsterId !== key)
        return
      }
      this.comparePollsters = [...this.comparePollsters, key]
    },
  },
})

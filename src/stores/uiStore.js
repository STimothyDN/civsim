import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    toast: null,
    _toastId: 0,
    electionNarrativeModalOpen: false,
    electionBroadcastModalOpen: false,
    pollBreakdownModalOpen: false,
    broadcastScope: 'national',
    broadcastTargetName: null,
  }),
  actions: {
    showToast(message, type = 'info') {
      this._toastId += 1
      this.toast = { message, type, id: this._toastId }
    },
    openElectionNarrativeModal() {
      this.electionNarrativeModalOpen = true
    },
    closeElectionNarrativeModal() {
      this.electionNarrativeModalOpen = false
    },
    openElectionBroadcastModal(scope = 'national', targetName = null) {
      this.broadcastScope = scope
      this.broadcastTargetName = targetName
      this.electionBroadcastModalOpen = true
    },
    closeElectionBroadcastModal() {
      this.electionBroadcastModalOpen = false
    },
    openPollBreakdownModal() {
      this.pollBreakdownModalOpen = true
    },
    closePollBreakdownModal() {
      this.pollBreakdownModalOpen = false
    },
  },
})

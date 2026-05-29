import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    toast: null,
    _toastId: 0,
    newTemplateModalOpen: false,
    newTemplateMode: 'choice',
    electionNarrativeModalOpen: false,
    electionBroadcastModalOpen: false,
    pollBreakdownModalOpen: false,
    broadcastScope: 'national',
    broadcastTargetName: null,
    currentPageScope: 'overview',
    currentPageTargetName: null,
    highlightedParty: null,
  }),
  actions: {
    showToast(message, type = 'info') {
      this._toastId += 1
      this.toast = { message, type, id: this._toastId }
    },
    openNewTemplateModal() {
      this.newTemplateMode = 'choice'
      this.newTemplateModalOpen = true
    },
    openWizardModal() {
      // Open straight into the wizard walkthrough over the current template,
      // without offering the scratch/wizard choice or resetting the data.
      this.newTemplateMode = 'wizard'
      this.newTemplateModalOpen = true
    },
    closeNewTemplateModal() {
      this.newTemplateModalOpen = false
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
    setPageContext(scope, targetName = null) {
      this.currentPageScope = scope
      this.currentPageTargetName = targetName
    },
    setHighlightedParty(party) {
      this.highlightedParty = this.highlightedParty === party ? null : party
    },
    clearHighlightedParty() {
      this.highlightedParty = null
    },
  },
})

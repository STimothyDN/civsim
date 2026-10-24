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
    // Global election ticker (rendered in AppTicker). The button bumps
    // `electionTickerRequest`; a global generator composable watches it, runs the
    // LLM, and feeds headlines back in via the actions below. New headlines are
    // layered onto the existing ticker rather than replacing it.
    electionTicker: {
      scope: 'national',
      targetName: null,
      request: 0,
      loading: false,
      status: null,
      items: [],
      seq: 0,
    },
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
    // Ask the global generator to produce a fresh batch of ticker headlines for
    // the given scope. Bumping `request` is the signal the generator watches.
    triggerElectionTicker(scope = 'national', targetName = null) {
      this.electionTicker.scope = scope
      this.electionTicker.targetName = targetName
      this.electionTicker.request += 1
    },
    setElectionTickerLoading(loading) {
      this.electionTicker.loading = loading
    },
    setElectionTickerStatus(status) {
      this.electionTicker.status = status
    },
    // Layer new LLM headlines onto the front of the ticker without clearing what
    // is already scrolling. Each item gets a unique, ever-increasing id so the
    // ticker can animate only the genuinely new ones. Capped to keep the marquee
    // from growing without bound across repeated runs.
    addElectionTickerItems(items = []) {
      const incoming = (Array.isArray(items) ? items : [])
        .filter((item) => item && item.text)
        .map((item) => {
          this.electionTicker.seq += 1
          return {
            id: `et-${this.electionTicker.seq}`,
            tag: item.tag || 'ELECTION',
            tone: item.tone || 'gold',
            text: item.text,
          }
        })
      this.electionTicker.items = [...incoming, ...this.electionTicker.items].slice(0, 14)
    },
    clearElectionTicker() {
      this.electionTicker.items = []
      this.electionTicker.loading = false
      this.electionTicker.status = null
    },
  },
})

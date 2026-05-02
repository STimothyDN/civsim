import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    toast: null,
    _toastId: 0,
  }),
  actions: {
    showToast(message, type = 'info') {
      this._toastId += 1
      this.toast = { message, type, id: this._toastId }
    },
  },
})

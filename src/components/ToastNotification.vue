<template>
  <Transition name="toast-slide">
    <div v-if="visible" class="toast" :class="['toast--' + type]" @click="dismiss">
      <span class="toast-icon">{{ icon }}</span>
      <span class="toast-msg">{{ message }}</span>
    </div>
  </Transition>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { useUiStore } from '../stores/uiStore'

export default {
  name: 'ToastNotification',
  setup() {
    const uiStore = useUiStore()
    const visible = ref(false)
    const message = ref('')
    const type = ref('info')
    let timer = null

    const icon = computed(() => {
      const icons = {
        success: '✓',
        error: '×',
        info: 'i',
      }
      return icons[type.value] || icons.info
    })

    watch(() => uiStore.toast, (t) => {
      if (!t) return
      message.value = t.message
      type.value = t.type || 'info'
      visible.value = true
      clearTimeout(timer)
      timer = setTimeout(() => {
        visible.value = false
      }, 3000)
    }, { deep: true })

    function dismiss() {
      visible.value = false
      clearTimeout(timer)
    }

    return { visible, message, type, icon, dismiss }
  }
}
</script>

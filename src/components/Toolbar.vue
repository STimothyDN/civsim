<template>
  <div class="toolbar">
    <button type="button" class="btn-primary" @click="loadDefault">
      <FilePlus2 :size="16" />
      New Template
    </button>

    <label class="file-input">
      <span>
        <Upload :size="16" />
        Load JSON
      </span>
      <input type="file" accept=".json" @change="onFileChange" />
    </label>

    <button type="button" :disabled="!hasData" @click="downloadJson">
      <Download :size="16" />
      Download JSON
    </button>
  </div>
</template>

<script>
import { computed } from 'vue'
import { Download, FilePlus2, Upload } from 'lucide-vue-next'
import { useFormStore } from '../stores/formStore'

export default {
  name: 'Toolbar',
  components: { Download, FilePlus2, Upload },
  setup() {
    const store = useFormStore()
    const hasData = computed(() => !!store.currentData)

    function loadDefault() {
      store.loadDefault()
    }

    function downloadJson() {
      store.downloadJson()
    }

    function onFileChange(e) {
      const file = e.target.files?.[0]
      if (file) store.loadFromFile(file)
      e.target.value = ''
    }

    return { loadDefault, onFileChange, downloadJson, hasData }
  }
}
</script>

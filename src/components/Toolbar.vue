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

    <button type="button" @click="downloadExample">
      <Download :size="16" />
      Download Example
    </button>
  </div>
</template>

<script>
import { computed } from 'vue'
import { Download, FilePlus2, Upload } from 'lucide-vue-next'
import { useFormStore } from '../stores/formStore'
import exampleData from '../../jayavarman.json'

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

    function downloadExample() {
      const blob = new Blob([JSON.stringify(exampleData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'jayavarman.json'
      a.click()
      URL.revokeObjectURL(url)
    }

    function onFileChange(e) {
      const file = e.target.files?.[0]
      if (file) store.loadFromFile(file)
      e.target.value = ''
    }

    return { loadDefault, onFileChange, downloadJson, downloadExample, hasData }
  }
}
</script>

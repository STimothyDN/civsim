<template>
  <section class="reference-grid">
    <div class="reference-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Reference Data</p>
          <h2>Province Groups</h2>
        </div>
        <Layers class="panel-icon" />
      </div>

      <div v-if="groupWarnings.length" class="warning-list">
        <div v-for="warning in groupWarnings" :key="warning" class="warning-item">
          <AlertTriangle :size="15" />
          <span>{{ warning }}</span>
        </div>
      </div>

      <div class="reference-list">
        <div v-for="(group, index) in groups" :key="index" class="reference-row">
          <span class="swatch" :style="{ background: colorForIndex(index) }"></span>
          <input
            :value="group"
            :aria-label="`Province group ${index + 1}`"
            @input="renameGroup(index, $event.target.value)"
          />
          <span class="pill">{{ provinceCountForGroup(group) }}</span>
          <button type="button" class="icon-danger" :aria-label="`Remove ${group || 'group'}`" @click="removeGroup(index)">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>

      <form class="inline-add" @submit.prevent="addGroup">
        <input v-model="newGroup" placeholder="New group name" />
        <button type="submit" class="btn-primary">
          <Plus :size="16" />
          Add Group
        </button>
      </form>

      <div class="assignment-list">
        <div class="assignment-header">
          <MapPinned :size="16" />
          <span>Province Assignments</span>
        </div>
        <div v-if="provinces.length === 0" class="empty-inline">No provinces yet.</div>
        <div v-for="(province, index) in provinces" :key="index" class="assignment-row">
          <span class="assignment-name">{{ province.name || `Province ${index + 1}` }}</span>
          <select :value="province.group || ''" @change="setGroup(index, $event.target.value)">
            <option value="">No group</option>
            <option v-for="(group, groupIndex) in groups" :key="`${group}-${groupIndex}`" :value="group">{{ group || 'Unnamed group' }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="reference-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Reference Data</p>
          <h2>Global Religions</h2>
        </div>
        <Sparkles class="panel-icon" />
      </div>

      <div v-if="religionWarnings.length" class="warning-list">
        <div v-for="warning in religionWarnings" :key="warning" class="warning-item">
          <AlertTriangle :size="15" />
          <span>{{ warning }}</span>
        </div>
      </div>

      <div class="reference-list">
        <div v-for="(religion, index) in religions" :key="index" class="reference-row">
          <span class="swatch swatch--religion"></span>
          <input
            :value="religion"
            :aria-label="`Global religion ${index + 1}`"
            @input="renameReligion(index, $event.target.value)"
          />
          <span class="pill">{{ religionReferenceCount(religion) }}</span>
          <button type="button" class="icon-danger" :aria-label="`Remove ${religion || 'religion'}`" @click="removeReligion(index)">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>

      <form class="inline-add" @submit.prevent="addReligion">
        <input v-model="newReligion" placeholder="New religion name" />
        <button type="submit" class="btn-primary">
          <Plus :size="16" />
          Add Religion
        </button>
      </form>

      <div class="assignment-list">
        <div class="assignment-header">
          <Landmark :size="16" />
          <span>State Religion</span>
        </div>
        <select :value="stateReligion || ''" @change="setStateReligion($event.target.value)">
          <option value="">No state religion</option>
          <option v-for="(religion, religionIndex) in religions" :key="`${religion}-${religionIndex}`" :value="religion">{{ religion || 'Unnamed religion' }}</option>
        </select>
      </div>
    </div>
  </section>
</template>

<script>
import { computed, ref } from 'vue'
import { AlertTriangle, Landmark, Layers, MapPinned, Plus, Sparkles, Trash2 } from 'lucide-vue-next'
import { useFormStore } from '../stores/formStore'
import { colorForIndex } from '../domain/colors'

function duplicateNames(items) {
  const seen = new Set()
  const duplicates = new Set()

  items.map((item) => String(item || '').trim()).filter(Boolean).forEach((item) => {
    if (seen.has(item)) duplicates.add(item)
    seen.add(item)
  })

  return [...duplicates]
}

export default {
  name: 'ReferenceDataSection',
  components: { AlertTriangle, Landmark, Layers, MapPinned, Plus, Sparkles, Trash2 },
  setup() {
    const store = useFormStore()
    const newGroup = ref('')
    const newReligion = ref('')

    const groups = computed(() => store.currentData?.province_groups || [])
    const religions = computed(() => store.currentData?.global_religions || [])
    const provinces = computed(() => store.currentData?.provinces || [])
    const stateReligion = computed(() => store.currentData?.country?.state_religion || null)

    const referencedReligions = computed(() => {
      const refs = new Set()
      if (stateReligion.value) refs.add(stateReligion.value)

      provinces.value.forEach((province) => {
        if (!Array.isArray(province.religions)) return
        province.religions.forEach((religion) => {
          if (religion.name) refs.add(religion.name)
        })
      })

      return refs
    })

    const groupWarnings = computed(() => {
      const warnings = []
      const duplicates = duplicateNames(groups.value)
      const unnamedCount = groups.value.filter((group) => !String(group || '').trim()).length
      const unassignedCount = provinces.value.filter((province) => !province.group).length

      if (duplicates.length) warnings.push(`Duplicate groups: ${duplicates.join(', ')}`)
      if (unnamedCount) warnings.push(`${unnamedCount} group ${unnamedCount === 1 ? 'is' : 'are'} unnamed`)
      if (unassignedCount) warnings.push(`${unassignedCount} ${unassignedCount === 1 ? 'province is' : 'provinces are'} unassigned`)

      return warnings
    })

    const religionWarnings = computed(() => {
      const warnings = []
      const duplicates = duplicateNames(religions.value)
      const unnamedCount = religions.value.filter((religion) => !String(religion || '').trim()).length
      const configured = new Set(religions.value.filter(Boolean))
      const missing = [...referencedReligions.value].filter((religion) => !configured.has(religion))

      if (duplicates.length) warnings.push(`Duplicate religions: ${duplicates.join(', ')}`)
      if (unnamedCount) warnings.push(`${unnamedCount} ${unnamedCount === 1 ? 'religion is' : 'religions are'} unnamed`)
      if (missing.length) warnings.push(`Referenced but not global: ${missing.join(', ')}`)

      return warnings
    })

    function addGroup() {
      const name = newGroup.value.trim()
      if (!name) return
      store.addProvinceGroup(name)
      newGroup.value = ''
    }

    function removeGroup(index) {
      const name = groups.value[index] || 'this group'
      if (!window.confirm(`Remove "${name}" and clear province assignments?`)) return
      store.removeProvinceGroup(index)
    }

    function renameGroup(index, value) {
      store.renameProvinceGroup(index, value)
    }

    function setGroup(index, value) {
      store.setProvinceGroupForProvince(index, value || null)
    }

    function provinceCountForGroup(group) {
      const count = provinces.value.filter((province) => province.group === group).length
      return `${count} ${count === 1 ? 'province' : 'provinces'}`
    }

    function addReligion() {
      const name = newReligion.value.trim()
      if (!name) return
      store.addGlobalReligion(name)
      newReligion.value = ''
    }

    function removeReligion(index) {
      const name = religions.value[index] || 'this religion'
      if (!window.confirm(`Remove "${name}"?`)) return
      store.removeGlobalReligion(index)
    }

    function renameReligion(index, value) {
      store.renameGlobalReligion(index, value)
    }

    function religionReferenceCount(religion) {
      let count = stateReligion.value === religion ? 1 : 0
      provinces.value.forEach((province) => {
        if (!Array.isArray(province.religions)) return
        count += province.religions.filter((entry) => entry.name === religion).length
      })
      return `${count} ${count === 1 ? 'reference' : 'references'}`
    }

    function setStateReligion(value) {
      store.setValueAtPath('country.state_religion', value || null)
    }

    return {
      addGroup,
      addReligion,
      colorForIndex,
      groupWarnings,
      groups,
      newGroup,
      newReligion,
      provinceCountForGroup,
      provinces,
      religionReferenceCount,
      religionWarnings,
      religions,
      removeGroup,
      removeReligion,
      renameGroup,
      renameReligion,
      setGroup,
      setStateReligion,
      stateReligion,
    }
  },
}
</script>

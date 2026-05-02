<template>
  <fieldset class="fieldset" :class="'fieldset--depth-' + Math.min(depth, 3)">
    <legend class="fieldset-legend" @click="toggle">
      <span class="chev" :class="{ collapsed: !expanded }">▾</span>
      <span class="section-icon">{{ sectionIcon }}</span>
      {{ displayTitle }}
      <small v-if="countText">{{ countText }}</small>
    </legend>

    <div v-if="!obj">
      <p class="empty-note">Empty</p>
    </div>

    <div v-else v-show="expanded">
      <div v-if="isDynamicKeys">
        <div v-for="key in keys" :key="key" class="dynamic-key-row">
          <div class="dynamic-key-content">
            <component
              :is="componentForChild(key)"
              :path="childPath(key)"
              :label="key"
              :depth="depth + 1"
            />
          </div>
          <div>
            <button type="button" class="btn-danger" @click="removeKey(key)">Remove</button>
          </div>
        </div>
        <div class="dynamic-key-add">
          <button v-if="!isAddingKey" type="button" class="btn-ghost" @click="startAddKey">+ Add key</button>
          <div v-else class="dynamic-key-input-wrap" style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem;">
            <input
              ref="addKeyInput"
              type="text"
              v-model="newKeyName"
              :list="dynamicKeyDatalistId"
              placeholder="Enter new key name..."
              @keydown.enter.prevent="confirmAddKey"
              @keydown.esc.prevent="cancelAddKey"
            />
            <button type="button" class="btn-primary" style="padding: 0.25rem 0.5rem;" @click="confirmAddKey">Add</button>
            <button type="button" class="btn-ghost" style="padding: 0.25rem 0.5rem;" @click="cancelAddKey">Cancel</button>
          </div>
        </div>
        <datalist v-if="dynamicKeyDatalistId" :id="dynamicKeyDatalistId">
          <option v-for="opt in dynamicKeyOptions" :key="opt" :value="opt"></option>
        </datalist>
      </div>
      <div v-else>
        <!-- Primitive fields in a responsive grid -->
        <div v-if="primitiveKeys.length > 0" class="field-row field-row--spaced">
          <template v-for="key in primitiveKeys" :key="key">
            <component
              v-if="isFieldVisible(key)"
              :is="componentForChild(key)"
              :path="childPath(key)"
              :label="key"
              :depth="depth + 1"
            />
          </template>
        </div>
        
        <!-- Complex fields (objects, arrays) stacked vertically -->
        <div v-if="complexKeys.length > 0" class="complex-fields">
          <template v-for="key in complexKeys" :key="key">
            <component
              v-if="isFieldVisible(key)"
              :is="componentForChild(key)"
              :path="childPath(key)"
              :label="key"
              :depth="depth + 1"
            />
          </template>
        </div>
      </div>
    </div>
  </fieldset>
</template>

<script>
import { computed, defineAsyncComponent, ref, toRaw, nextTick } from 'vue'
import { useFormStore } from '../stores/formStore'
import { humanize } from '../utils/text'
import { isObject } from '../utils/object'

const SECTION_ICONS = {
  template: '📋',
  country: '🏛',
  basic_info: '📝',
  economy: '💰',
  yields: '📊',
  provinces: '🗺',
  counties: '🏘',
  closest_provinces: '📍',
  religions: '⛪',
  improvement: '🔨',
  features: '🌿',
  buildings: '🏗',
  great_works: '🖼',
  province_groups: '🗂',
}

export default {
  name: 'FieldsetGroup',
  components: {
    ArraySection: defineAsyncComponent(() => import('./ArraySection.vue')),
    FormField: defineAsyncComponent(() => import('./FormField.vue')),
  },
  props: {
    path: { type: String, default: '' },
    label: { type: String, default: '' },
    depth: { type: Number, default: 0 },
  },
  setup(props) {
    const store = useFormStore()
    const obj = computed(() => (props.path === '' ? store.currentData : store.getValueAtPath(props.path)))
    const keys = computed(() => (obj.value && typeof obj.value === 'object' ? Object.keys(obj.value) : []))
    const title = computed(() => {
      // If a label is explicitly provided, use it as-is
      if (props.label) return props.label
      if (!props.path) return 'Template'
      // Extract last meaningful segment, stripping array indices
      const segment = props.path.split('.').slice(-1)[0].replace(/\[\d+\]$/, '')
      return segment
    })
    // Display title: for labeled items use label directly (already humanized by parent),
    // otherwise humanize the computed title
    const displayTitle = computed(() => {
      if (props.label) return props.label
      return humanize(title.value)
    })

    const sectionIcon = computed(() => {
      const key = title.value.toLowerCase().replace(/\s+/g, '_')
      return SECTION_ICONS[key] || '📁'
    })

    // local reactive state for expansion - default collapse provinces and counties
    const expanded = ref(!((props.path || '').match(/(provinces|counties)\[\d+\]$/)))
    
    function toggle() {
      expanded.value = !expanded.value
    }
    const countText = computed(() => {
      const v = obj.value
      if (Array.isArray(v)) return `${v.length} ${v.length === 1 ? 'item' : 'items'}`
      if (v && typeof v === 'object') {
        const count = Object.keys(v).length
        return `${count} ${count === 1 ? 'field' : 'fields'}`
      }
      return ''
    })

    function childPath(key) {
      return props.path ? `${props.path}.${key}` : key
    }

    const isDynamicKeys = computed(() => {
      const p = props.path || ''
      if (!p) return false
      const clean = p.replace(/\[\d+\]/g, '').split('.').filter(Boolean)
      const last = clean[clean.length - 1]
      return last === 'features' || last === 'buildings' || last === 'great_works'
    })

    const isAddingKey = ref(false)
    const newKeyName = ref('')
    const addKeyInput = ref(null)

    function startAddKey() {
      if (!isDynamicKeys.value) return
      isAddingKey.value = true
      newKeyName.value = ''
      nextTick(() => {
        if (addKeyInput.value) addKeyInput.value.focus()
      })
    }

    function cancelAddKey() {
      isAddingKey.value = false
      newKeyName.value = ''
    }

    function confirmAddKey() {
      const newKey = newKeyName.value.trim()
      if (!newKey) {
        cancelAddKey()
        return
      }
      if (!obj.value) return
      if (Object.prototype.hasOwnProperty.call(obj.value, newKey)) {
        store.showToast('Key already exists', 'error')
        return
      }
      // Default new key to true so features act like toggles by default
      store.setValueAtPath(childPath(newKey), true)
      cancelAddKey()
    }

    const dynamicKeyOptions = computed(() => {
      if (!isDynamicKeys.value) return []
      const p = props.path || ''
      const clean = p.replace(/\[\d+\]/g, '').split('.').filter(Boolean)
      const last = clean[clean.length - 1]
      if (last === 'features') return store.uniqueFeatures
      if (last === 'buildings') return store.uniqueBuildings
      if (last === 'great_works') return store.uniqueGreatWorks
      return []
    })

    const dynamicKeyDatalistId = computed(() => {
      return dynamicKeyOptions.value.length > 0 ? `datalist-dynamic-${props.path.replace(/[^a-zA-Z0-9]/g, '-')}` : null
    })

    function removeKey(key) {
      const confirmed = window.confirm(`Remove key "${key}"? This cannot be undone.`)
      if (!confirmed) return
      store.removeObjectKey(childPath(key))
    }

    function componentForChild(key) {
      const rawObj = toRaw(obj.value)
      const child = rawObj ? rawObj[key] : undefined
      if (Array.isArray(child)) return 'ArraySection'
      if (isObject(child)) return 'FieldsetGroup'
      return 'FormField'
    }

    const KEY_ORDER = [
      // Identifiers & Core
      'name', 'province_name', 'leader', 'group', 'city_id', 'tile_id', 'distance_from_center', 'distance', 'terrain', 'resource',
      // Status Toggles
      'is_national_capital', 'is_regional_capital', 'is_founded', 'is_joined', 'is_conquered', 'original_country', 'has_railroad',
      // Demographics & Stats
      'total_population', 'population', 'citizens_working', 'loyalty', 'housing', 'growth_percentage', 'happiness_percentage',
      // Modifiers & Net values
      'net_amenities', 'net_food', 'appeal', 'river',
      // Nested sections
      'yields', 'religions', 'closest_provinces', 'counties', 'features', 'improvement', 'buildings', 'great_works',
      // Miscellaneous
      'state_religion', 'notes'
    ]

    function getKeyWeight(key) {
      const idx = KEY_ORDER.indexOf(key)
      return idx === -1 ? 999 : idx
    }

    const primitiveKeys = computed(() => {
      const pKeys = keys.value.filter(k => componentForChild(k) === 'FormField')
      return pKeys.sort((a, b) => getKeyWeight(a) - getKeyWeight(b))
    })

    const complexKeys = computed(() => {
      const cKeys = keys.value.filter(k => componentForChild(k) !== 'FormField')
      return cKeys.sort((a, b) => getKeyWeight(a) - getKeyWeight(b))
    })

    function isFieldVisible(key) {
      if (key !== 'original_country') return true
      const p = props.path || ''
      if (!p.match(/provinces\[\d+\]$/)) return true
      
      const province = obj.value
      return province?.is_joined || province?.is_conquered
    }

    return { obj, keys, displayTitle, sectionIcon, childPath, componentForChild, toggle, expanded, countText, isAddingKey, newKeyName, addKeyInput, startAddKey, cancelAddKey, confirmAddKey, dynamicKeyOptions, dynamicKeyDatalistId, removeKey, isDynamicKeys, primitiveKeys, complexKeys, isFieldVisible, depth: props.depth }
  }
}
</script>

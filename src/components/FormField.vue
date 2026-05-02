<template>
  <div class="field" :class="{ 'field--capital-toggle': capitalToggleInfo }">
    <label :for="path">
      <span v-if="capitalToggleInfo" class="capital-label-icon">{{ capitalToggleInfo.field === 'is_national_capital' ? '👑' : '⭐' }}</span>
      {{ humanize(name) }}
    </label>

    <template v-if="isBoolean">
      <div class="toggle-wrap">
        <input :id="path" type="checkbox" class="toggle" :class="{ 'toggle--national': capitalToggleInfo?.field === 'is_national_capital' && valueComputed, 'toggle--regional': capitalToggleInfo?.field === 'is_regional_capital' && valueComputed }" :checked="valueComputed" @change="onCheckboxChange" />
      </div>
    </template>

    <template v-else-if="isNumber">
      <input
        :id="path"
        type="number"
        :value="valueComputed === null ? '' : valueComputed"
        :disabled="disabled"
        :placeholder="valueComputed === null ? 'null' : ''"
        @input="onNumberInput"
      />
    </template>

    <template v-else-if="isStringOrNull">
      <template v-if="isProvinceGroupField">
        <select :id="path" :value="valueComputed === null ? '' : valueComputed" :disabled="disabled" @change="onTextInput">
          <option value="">— No Group —</option>
          <option v-for="(g, index) in provinceGroups" :key="`${g}-${index}`" :value="g">{{ g }}</option>
        </select>
      </template>
      <template v-else-if="isReligionField">
        <select :id="path" :value="valueComputed === null ? '' : valueComputed" :disabled="disabled" @change="onTextInput">
          <option value="">— Select Religion —</option>
          <option v-for="(r, index) in globalReligions" :key="`${r}-${index}`" :value="r">{{ r }}</option>
        </select>
      </template>
      <template v-else>
        <input :id="path" type="text" :value="valueComputed === null ? '' : valueComputed" :placeholder="valueComputed === null ? 'null' : ''" :disabled="disabled" :list="datalistId" @input="onTextInput" />
        <datalist v-if="datalistId" :id="datalistId">
          <option v-for="opt in datalistOptions" :key="opt" :value="opt"></option>
        </datalist>
      </template>
    </template>

    <template v-else>
      <textarea :id="path" :value="stringValue" :disabled="disabled" @input="onTextInput"></textarea>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useFormStore } from '../stores/formStore'
import { humanize } from '../utils/text'

export default {
  name: 'FormField',
  props: {
    path: { type: String, required: true },
    label: { type: String, default: '' }
  },
  setup(props) {
    const store = useFormStore()

    const valueComputed = computed(() => store.getValueAtPath(props.path))
    const name = computed(() => props.label || (props.path ? props.path.replace(/\[\d+\]/g, '').split('.').slice(-1)[0] : ''))
    const isBoolean = computed(() => typeof valueComputed.value === 'boolean')
    const isDistanceField = computed(() => {
      return /^provinces\[\d+\]\.closest_provinces\[\d+\]\.distance$/.test(props.path) ||
             /^provinces\[\d+\]\.counties\[\d+\]\.distance_from_center$/.test(props.path)
    })
    const isNumber = computed(() => typeof valueComputed.value === 'number' || isDistanceField.value)

    const isStringOrNull = computed(() => typeof valueComputed.value === 'string' || valueComputed.value === null)
    const stringValue = computed(() => (valueComputed.value === null ? '' : JSON.stringify(valueComputed.value)))
    const disabled = computed(() => {
      const n = name.value
      return n === 'city_id' || n === 'tile_id'
    })

    const globalReligions = computed(() => store.currentData?.global_religions || [])
    const provinceGroups = computed(() => store.currentData?.province_groups || [])
    const closestProvinceOptions = computed(() => {
      const match = props.path.match(/^provinces\[(\d+)\]\.closest_provinces\[\d+\]\.province_name$/)
      const currentProvinceIndex = match ? parseInt(match[1], 10) : -1
      return (store.currentData?.provinces || [])
        .map((province, index) => index === currentProvinceIndex ? null : province.name)
        .filter(Boolean)
    })
    const isReligionField = computed(() => {
      return (props.path.includes('.religions[') && props.path.endsWith('.name')) ||
             props.path === 'country.state_religion'
    })
    const isProvinceGroupField = computed(() => /^provinces\[\d+\]\.group$/.test(props.path))

    // Capital toggle detection
    const capitalToggleInfo = computed(() => {
      const match = props.path.match(/^provinces\[(\d+)\]\.(is_national_capital|is_regional_capital)$/)
      if (!match) return null
      return { provinceIndex: parseInt(match[1], 10), field: match[2] }
    })

    const provinceStatusToggleInfo = computed(() => {
      const match = props.path.match(/^provinces\[(\d+)\]\.(is_founded|is_joined|is_conquered)$/)
      if (!match) return null
      return { provinceIndex: parseInt(match[1], 10), field: match[2] }
    })

    const datalistOptions = computed(() => {
      if (props.path.match(/^provinces\[\d+\]\.closest_provinces\[\d+\]\.province_name$/)) return closestProvinceOptions.value
      if (props.path.match(/^provinces\[\d+\]\.counties\[\d+\]\.terrain$/)) return store.uniqueTerrains
      if (props.path.match(/^provinces\[\d+\]\.counties\[\d+\]\.resource$/)) return store.uniqueResources
      if (props.path.match(/^provinces\[\d+\]\.counties\[\d+\]\.river$/)) return store.uniqueRivers
      if (props.path.match(/^provinces\[\d+\]\.counties\[\d+\]\.improvement\.name$/)) return store.uniqueImprovementNames
      return null
    })

    const datalistId = computed(() => {
      return datalistOptions.value ? `datalist-${props.path.replace(/[^a-zA-Z0-9]/g, '-')}` : null
    })

    function onCheckboxChange(e) {
      const info = capitalToggleInfo.value
      if (info) {
        if (e.target.checked) {
          if (info.field === 'is_national_capital') {
            store.setNationalCapital(info.provinceIndex)
          } else {
            store.setRegionalCapital(info.provinceIndex)
          }
        } else {
          if (info.field === 'is_national_capital') {
            store.clearNationalCapital(info.provinceIndex)
          } else {
            store.clearRegionalCapital(info.provinceIndex)
          }
        }
        return
      }

      const statusInfo = provinceStatusToggleInfo.value
      if (statusInfo && e.target.checked) {
        const fields = ['is_founded', 'is_joined', 'is_conquered']
        fields.forEach((f) => {
          store.setValueAtPath(`provinces[${statusInfo.provinceIndex}].${f}`, f === statusInfo.field)
        })
        return
      }

      store.setValueAtPath(props.path, e.target.checked)
    }

    function onNumberInput(e) {
      const v = e.target.value
      store.setValueAtPath(props.path, v === '' ? null : Number(v))
    }

    function onTextInput(e) {
      const v = e.target.value.trim()
      store.setValueAtPath(props.path, v === '' ? null : v)
    }

    return { humanize, valueComputed, name, isBoolean, isNumber, isStringOrNull, stringValue, disabled, globalReligions, provinceGroups, closestProvinceOptions, isReligionField, isProvinceGroupField, capitalToggleInfo, datalistOptions, datalistId, onCheckboxChange, onNumberInput, onTextInput }
  }
}
</script>

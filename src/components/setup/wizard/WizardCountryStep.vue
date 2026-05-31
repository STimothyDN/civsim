<template>
  <div class="wizard-step-body">
    <p class="wizard-step-lead">
      Begin with the headline facts of your realm. These appear across the
      Country Overview and feed the national treasury totals.
    </p>

    <div class="wizard-grid wizard-grid--two">
      <label class="wizard-field">
        <span>Civilization name <InfoTip text="The name of your nation as it appears throughout the app." /></span>
        <input
          type="text"
          :value="get('country.basic_info.name')"
          placeholder="e.g. The Khmer Empire"
          @input="set('country.basic_info.name', $event.target.value)"
        />
      </label>

      <label class="wizard-field">
        <span>Leader <InfoTip text="The head of state. Used in narrative and overview headers." /></span>
        <input
          type="text"
          :value="get('country.basic_info.leader')"
          placeholder="e.g. Jayavarman VII"
          @input="set('country.basic_info.leader', $event.target.value)"
        />
      </label>

      <label class="wizard-field">
        <span>Total population <InfoTip text="Empire-wide population figure. Provincial populations are derived separately from province data." /></span>
        <input
          type="number"
          :value="getNum('country.total_population')"
          placeholder="null"
          @input="setNum('country.total_population', $event.target.value)"
        />
      </label>
    </div>

    <h4 class="wizard-subhead">Treasury <small>output per turn</small></h4>
    <div class="wizard-grid wizard-grid--four">
      <label v-for="field in economyFields" :key="field.key" class="wizard-field wizard-field--compact">
        <span>{{ field.label }} <InfoTip :text="field.tip" /></span>
        <input
          type="number"
          :value="getNum(`country.economy.${field.key}`)"
          placeholder="null"
          @input="setNum(`country.economy.${field.key}`, $event.target.value)"
        />
      </label>
    </div>
  </div>
</template>

<script>
import { useFormStore } from '../../../stores/formStore'
import InfoTip from '../InfoTip.vue'

export default {
  name: 'WizardCountryStep',
  components: { InfoTip },
  setup() {
    const store = useFormStore()

    const economyFields = [
      { key: 'gold_per_turn', label: 'Gold', tip: 'Net treasury income generated each turn.' },
      { key: 'faith_per_turn', label: 'Faith', tip: 'Faith generated each turn.' },
      { key: 'culture_per_turn', label: 'Culture', tip: 'Culture generated each turn.' },
      { key: 'science_per_turn', label: 'Science', tip: 'Science generated each turn.' },
    ]

    const get = (path) => store.getValueAtPath(path) ?? ''
    const getNum = (path) => {
      const v = store.getValueAtPath(path)
      return v === null || v === undefined ? '' : v
    }
    const set = (path, value) => {
      const v = String(value).trim()
      store.setValueAtPath(path, v === '' ? '' : v)
    }
    const setNum = (path, value) => {
      const v = String(value).trim()
      store.setValueAtPath(path, v === '' ? null : Number(v))
    }

    return { economyFields, get, getNum, set, setNum }
  },
}
</script>

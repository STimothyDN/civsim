<template>
  <div class="wizard-step-body">
    <p class="wizard-step-lead">
      Define the shared building blocks your provinces will reference: regional
      groups, faiths, and the factions that contest elections.
    </p>

    <div class="wizard-grid wizard-grid--two">
      <!-- Province groups -->
      <section class="wizard-panel">
        <h4 class="wizard-subhead">Province groups <InfoTip text="Regions that provinces are organized into. Each province can be assigned to one group." /></h4>
        <div v-if="groups.length === 0" class="wizard-empty">No groups yet.</div>
        <div v-for="(group, index) in groups" :key="`group-${index}`" class="wizard-list-row">
          <span class="wizard-swatch" :style="{ background: colorForIndex(index) }"></span>
          <input
            :value="group"
            placeholder="Group name"
            @input="store.renameProvinceGroup(index, $event.target.value)"
          />
          <button type="button" class="wizard-icon-danger" :aria-label="`Remove group ${index + 1}`" @click="store.removeProvinceGroup(index)">
            <Trash2 :size="15" />
          </button>
        </div>
        <form class="wizard-inline-add" @submit.prevent="addGroup">
          <input v-model="newGroup" placeholder="New group name" />
          <button type="submit" class="wizard-add-btn"><Plus :size="14" /> Add</button>
        </form>
      </section>

      <!-- Religions -->
      <section class="wizard-panel">
        <h4 class="wizard-subhead">Global religions <InfoTip text="Religions available across the empire. Provinces draw their religious makeup from this list." /></h4>
        <div v-if="religions.length === 0" class="wizard-empty">No religions yet.</div>
        <div v-for="(religion, index) in religions" :key="`religion-${index}`" class="wizard-list-row">
          <span class="wizard-swatch wizard-swatch--religion"></span>
          <input
            :value="religion"
            placeholder="Religion name"
            @input="store.renameGlobalReligion(index, $event.target.value)"
          />
          <button type="button" class="wizard-icon-danger" :aria-label="`Remove religion ${index + 1}`" @click="store.removeGlobalReligion(index)">
            <Trash2 :size="15" />
          </button>
        </div>
        <form class="wizard-inline-add" @submit.prevent="addReligion">
          <input v-model="newReligion" placeholder="New religion name" />
          <button type="submit" class="wizard-add-btn"><Plus :size="14" /> Add</button>
        </form>

        <label class="wizard-field wizard-field--compact" style="margin-top: 12px;">
          <span>State religion <InfoTip text="The official religion of the empire, if any." /></span>
          <select :value="stateReligion || ''" @change="setStateReligion($event.target.value)">
            <option value="">No state religion</option>
            <option v-for="(religion, i) in religions" :key="`sr-${i}`" :value="religion">{{ religion || 'Unnamed' }}</option>
          </select>
        </label>
      </section>
    </div>

    <!-- Parties -->
    <section class="wizard-panel">
      <h4 class="wizard-subhead">Election parties <InfoTip text="The parties that contest elections. Name, abbreviation, and color are set here; deeper political tuning lives in Advanced Setup." /></h4>
      <div class="wizard-party-list">
        <div v-for="party in parties" :key="party.id" class="wizard-party-row">
          <span class="wizard-swatch" :style="{ background: party.color }"></span>
          <input
            class="wizard-party-name"
            :value="party.name"
            placeholder="Party name"
            @input="store.setPartyName(party.id, $event.target.value)"
          />
          <input
            class="wizard-party-abbr"
            :value="party.abbreviation"
            placeholder="ABBR"
            maxlength="8"
            @input="store.setPartyAbbreviation(party.id, $event.target.value)"
          />
          <div class="wizard-palette" role="radiogroup" :aria-label="`${party.name} color`">
            <button
              v-for="option in palette"
              :key="`${party.id}-${option.name}`"
              type="button"
              class="wizard-palette-swatch"
              :class="{ 'wizard-palette-swatch--active': party.colorName === option.name }"
              :style="{ '--swatch-color': option.color }"
              :aria-label="option.name"
              :aria-pressed="party.colorName === option.name"
              @click="store.setPartyColorName(party.id, option.name)"
            ><span></span></button>
          </div>
          <button type="button" class="wizard-icon-danger" :aria-label="`Remove ${party.name}`" @click="store.removeParty(party.id)">
            <Trash2 :size="15" />
          </button>
        </div>
      </div>
      <form class="wizard-inline-add" @submit.prevent="addParty">
        <input v-model="newParty" placeholder="New party name" />
        <button type="submit" class="wizard-add-btn"><Plus :size="14" /> Add Party</button>
      </form>
    </section>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import { useFormStore } from '../../../stores/formStore'
import { PARTY_COLOR_PALETTE } from '../../../domain/elections/constants/parties'
import { colorForIndex } from '../../../domain/colors'
import InfoTip from '../InfoTip.vue'

export default {
  name: 'WizardReferenceStep',
  components: { InfoTip, Plus, Trash2 },
  setup() {
    const store = useFormStore()
    const newGroup = ref('')
    const newReligion = ref('')
    const newParty = ref('')

    const groups = computed(() => store.currentData?.province_groups || [])
    const religions = computed(() => store.currentData?.global_religions || [])
    const parties = computed(() => store.currentData?.config?.parties || [])
    const stateReligion = computed(() => store.currentData?.country?.state_religion || null)

    function addGroup() {
      const name = newGroup.value.trim()
      if (!name) return
      store.addProvinceGroup(name)
      newGroup.value = ''
    }
    function addReligion() {
      const name = newReligion.value.trim()
      if (!name) return
      store.addGlobalReligion(name)
      newReligion.value = ''
    }
    function addParty() {
      store.addParty(newParty.value.trim())
      newParty.value = ''
    }
    function setStateReligion(value) {
      store.setValueAtPath('country.state_religion', value || null)
    }

    return {
      store,
      palette: PARTY_COLOR_PALETTE,
      colorForIndex,
      groups,
      religions,
      parties,
      stateReligion,
      newGroup,
      newReligion,
      newParty,
      addGroup,
      addReligion,
      addParty,
      setStateReligion,
    }
  },
}
</script>

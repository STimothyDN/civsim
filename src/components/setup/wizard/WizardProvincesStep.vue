<template>
  <div class="wizard-step-body">
    <p class="wizard-step-lead">
      Add each province and fill the key figures inline. Expand a row for yields,
      religions, counties, and finer details — everything is optional and saves as you type.
    </p>

    <div v-if="provinces.length === 0" class="wizard-empty wizard-empty--block">
      No provinces yet. Add your first one to begin.
    </div>

    <div v-else class="wizard-table">
      <div class="wizard-table-head wizard-prov-grid">
        <span></span>
        <span>Name</span>
        <span>Group</span>
        <span>Population</span>
        <span>Loyalty</span>
        <span>Growth %</span>
        <span>Happy %</span>
        <span></span>
      </div>

      <div v-for="(province, i) in provinces" :key="`prov-${i}`" class="wizard-prov">
        <div class="wizard-table-row wizard-prov-grid">
          <button type="button" class="wizard-expand" :aria-expanded="isProvExpanded(i)" @click="toggleProv(i)">
            <ChevronRight :size="15" :class="{ 'wizard-chev--open': isProvExpanded(i) }" />
          </button>
          <div class="wizard-cell"><FormField :path="`provinces[${i}].name`" label="Name" /></div>
          <div class="wizard-cell"><FormField :path="`provinces[${i}].group`" label="Group" /></div>
          <div class="wizard-cell"><FormField :path="`provinces[${i}].population`" label="Population" /></div>
          <div class="wizard-cell"><FormField :path="`provinces[${i}].loyalty`" label="Loyalty" /></div>
          <div class="wizard-cell"><FormField :path="`provinces[${i}].growth_percentage`" label="Growth" /></div>
          <div class="wizard-cell"><FormField :path="`provinces[${i}].happiness_percentage`" label="Happy" /></div>
          <button type="button" class="wizard-icon-danger" :aria-label="`Remove province ${i + 1}`" @click="removeProvince(i)">
            <Trash2 :size="15" />
          </button>
        </div>

        <div v-if="isProvExpanded(i)" class="wizard-expander">
          <!-- Yields -->
          <h5 class="wizard-mini-head">Yields <InfoTip text="Per-turn yields contributed by this province." /></h5>
          <div class="wizard-grid wizard-grid--yields">
            <label v-for="key in provinceYieldKeys" :key="`py-${i}-${key}`" class="wizard-field wizard-field--compact">
              <span>{{ humanize(key) }}</span>
              <FormField :path="`provinces[${i}].yields.${key}`" :label="key" />
            </label>
          </div>

          <!-- Religions -->
          <h5 class="wizard-mini-head">Religions <InfoTip text="Religious populations within this province. Names are drawn from your global religions." /></h5>
          <div class="wizard-religion-list">
            <div v-for="(religion, r) in (province.religions || [])" :key="`rel-${i}-${r}`" class="wizard-religion-row">
              <div class="wizard-cell"><FormField :path="`provinces[${i}].religions[${r}].name`" label="Religion" /></div>
              <div class="wizard-cell"><FormField :path="`provinces[${i}].religions[${r}].followers`" label="Followers" /></div>
              <button type="button" class="wizard-icon-danger" :aria-label="`Remove religion ${r + 1}`" @click="store.removeArrayItem(`provinces[${i}].religions`, r)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
          <button type="button" class="wizard-add-btn wizard-add-btn--ghost" @click="store.addArrayItem(`provinces[${i}].religions`)">
            <Plus :size="14" /> Add religion
          </button>

          <!-- Counties -->
          <h5 class="wizard-mini-head">Counties <InfoTip text="The counties (tiles) that make up this province, with their terrain, improvements, and yields." /></h5>
          <div v-if="(province.counties || []).length === 0" class="wizard-empty">No counties yet.</div>
          <div v-else class="wizard-table wizard-table--nested">
            <div class="wizard-table-head wizard-county-grid">
              <span></span>
              <span>Name</span>
              <span>Terrain</span>
              <span>Resource</span>
              <span>River</span>
              <span>Improvement</span>
              <span>Workers</span>
              <span></span>
            </div>
            <div v-for="(county, j) in province.counties" :key="`county-${i}-${j}`" class="wizard-county">
              <div class="wizard-table-row wizard-county-grid">
                <button type="button" class="wizard-expand" :aria-expanded="isCountyExpanded(i, j)" @click="toggleCounty(i, j)">
                  <ChevronRight :size="14" :class="{ 'wizard-chev--open': isCountyExpanded(i, j) }" />
                </button>
                <div class="wizard-cell"><FormField :path="`provinces[${i}].counties[${j}].name`" label="Name" /></div>
                <div class="wizard-cell"><FormField :path="`provinces[${i}].counties[${j}].terrain`" label="Terrain" /></div>
                <div class="wizard-cell"><FormField :path="`provinces[${i}].counties[${j}].resource`" label="Resource" /></div>
                <div class="wizard-cell"><FormField :path="`provinces[${i}].counties[${j}].river`" label="River" /></div>
                <div class="wizard-cell"><FormField :path="`provinces[${i}].counties[${j}].improvement.name`" label="Improvement" /></div>
                <div class="wizard-cell"><FormField :path="`provinces[${i}].counties[${j}].citizens_working`" label="Workers" /></div>
                <button type="button" class="wizard-icon-danger" :aria-label="`Remove county ${j + 1}`" @click="store.removeArrayItem(`provinces[${i}].counties`, j)">
                  <Trash2 :size="14" />
                </button>
              </div>

              <div v-if="isCountyExpanded(i, j)" class="wizard-expander wizard-expander--county">
                <h5 class="wizard-mini-head">County yields</h5>
                <div class="wizard-grid wizard-grid--yields">
                  <label v-for="key in countyYieldKeys" :key="`cy-${i}-${j}-${key}`" class="wizard-field wizard-field--compact">
                    <span>{{ humanize(key) }}</span>
                    <FormField :path="`provinces[${i}].counties[${j}].yields.${key}`" :label="key" />
                  </label>
                </div>

                <button type="button" class="wizard-more-toggle" @click="toggleCountyMore(i, j)">
                  <ChevronRight :size="13" :class="{ 'wizard-chev--open': isCountyMore(i, j) }" />
                  More details
                </button>
                <div v-if="isCountyMore(i, j)" class="wizard-more">
                  <div class="wizard-grid wizard-grid--four">
                    <label class="wizard-field wizard-field--compact">
                      <span>Distance from center</span>
                      <FormField :path="`provinces[${i}].counties[${j}].distance_from_center`" label="Distance" />
                    </label>
                    <label class="wizard-field wizard-field--compact">
                      <span>Appeal</span>
                      <FormField :path="`provinces[${i}].counties[${j}].appeal`" label="Appeal" />
                    </label>
                    <label class="wizard-field wizard-field--compact wizard-field--toggle">
                      <span>Has railroad</span>
                      <FormField :path="`provinces[${i}].counties[${j}].has_railroad`" label="Railroad" />
                    </label>
                  </div>
                  <div class="wizard-fieldset-host">
                    <FieldsetGroup :path="`provinces[${i}].counties[${j}].features`" label="Features" :depth="2" />
                    <FieldsetGroup :path="`provinces[${i}].counties[${j}].improvement.buildings`" label="Buildings" :depth="2" />
                    <FieldsetGroup :path="`provinces[${i}].counties[${j}].improvement.great_works`" label="Great Works" :depth="2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button type="button" class="wizard-add-btn wizard-add-btn--ghost" @click="store.addArrayItem(`provinces[${i}].counties`)">
            <Plus :size="14" /> Add county
          </button>

          <!-- Province advanced -->
          <button type="button" class="wizard-more-toggle" @click="toggleProvMore(i)">
            <ChevronRight :size="13" :class="{ 'wizard-chev--open': isProvMore(i) }" />
            More details
          </button>
          <div v-if="isProvMore(i)" class="wizard-more">
            <div class="wizard-grid wizard-grid--four">
              <label class="wizard-field wizard-field--compact">
                <span>Continent</span>
                <FormField :path="`provinces[${i}].continent`" label="Continent" />
              </label>
              <label class="wizard-field wizard-field--compact">
                <span>Original country</span>
                <FormField :path="`provinces[${i}].original_country`" label="Original country" />
              </label>
              <label class="wizard-field wizard-field--compact">
                <span>Housing</span>
                <FormField :path="`provinces[${i}].housing`" label="Housing" />
              </label>
              <label class="wizard-field wizard-field--compact">
                <span>Net amenities</span>
                <FormField :path="`provinces[${i}].net_amenities`" label="Net amenities" />
              </label>
              <label class="wizard-field wizard-field--compact">
                <span>Net food</span>
                <FormField :path="`provinces[${i}].net_food`" label="Net food" />
              </label>
            </div>

            <h5 class="wizard-mini-head">Status <InfoTip text="Capital flags and how the province came under your control." /></h5>
            <div class="wizard-grid wizard-grid--four">
              <label v-for="flag in statusFlags" :key="`flag-${i}-${flag.key}`" class="wizard-field wizard-field--compact wizard-field--toggle">
                <span>{{ flag.label }}</span>
                <FormField :path="`provinces[${i}].${flag.key}`" :label="flag.label" />
              </label>
            </div>

            <h5 class="wizard-mini-head">Closest provinces <InfoTip text="The five nearest provinces and their distances, used for regional adjacency." /></h5>
            <div class="wizard-religion-list">
              <div v-for="k in 5" :key="`cp-${i}-${k}`" class="wizard-religion-row">
                <div class="wizard-cell"><FormField :path="`provinces[${i}].closest_provinces[${k - 1}].province_name`" label="Province" /></div>
                <div class="wizard-cell"><FormField :path="`provinces[${i}].closest_provinces[${k - 1}].distance`" label="Distance" /></div>
              </div>
            </div>

            <label class="wizard-field" style="margin-top: 12px;">
              <span>Notes</span>
              <FormField :path="`provinces[${i}].notes`" label="Notes" />
            </label>
          </div>
        </div>
      </div>
    </div>

    <button type="button" class="wizard-add-btn wizard-add-btn--primary" @click="addProvince">
      <Plus :size="15" /> Add province
    </button>
  </div>
</template>

<script>
import { computed, defineAsyncComponent, ref } from 'vue'
import { ChevronRight, Plus, Trash2 } from 'lucide-vue-next'
import { useFormStore } from '../../../stores/formStore'
import { humanize } from '../../../utils/text'
import FormField from '../../FormField.vue'

export default {
  name: 'WizardProvincesStep',
  components: {
    ChevronRight,
    Plus,
    Trash2,
    FormField,
    FieldsetGroup: defineAsyncComponent(() => import('../../FieldsetGroup.vue')),
  },
  setup() {
    const store = useFormStore()
    const provinces = computed(() => store.currentData?.provinces || [])

    const provinceYieldKeys = ['amenities', 'food', 'production', 'gold', 'culture', 'science', 'faith']
    const countyYieldKeys = ['amenities', 'food', 'production', 'gold', 'culture', 'science', 'faith', 'tourism']
    const statusFlags = [
      { key: 'is_national_capital', label: 'National capital' },
      { key: 'is_regional_capital', label: 'Regional capital' },
      { key: 'is_founded', label: 'Founded' },
      { key: 'is_joined', label: 'Joined' },
      { key: 'is_conquered', label: 'Conquered' },
    ]

    const expandedProv = ref(new Set())
    const expandedCounty = ref(new Set())
    const provMore = ref(new Set())
    const countyMore = ref(new Set())

    const toggleIn = (setRef, key) => {
      const next = new Set(setRef.value)
      next.has(key) ? next.delete(key) : next.add(key)
      setRef.value = next
    }

    const isProvExpanded = (i) => expandedProv.value.has(i)
    const toggleProv = (i) => toggleIn(expandedProv, i)
    const isProvMore = (i) => provMore.value.has(i)
    const toggleProvMore = (i) => toggleIn(provMore, i)
    const countyKey = (i, j) => `${i}-${j}`
    const isCountyExpanded = (i, j) => expandedCounty.value.has(countyKey(i, j))
    const toggleCounty = (i, j) => toggleIn(expandedCounty, countyKey(i, j))
    const isCountyMore = (i, j) => countyMore.value.has(countyKey(i, j))
    const toggleCountyMore = (i, j) => toggleIn(countyMore, countyKey(i, j))

    function addProvince() {
      const newIndex = provinces.value.length
      store.addArrayItem('provinces')
      toggleIn(expandedProv, newIndex)
    }

    function removeProvince(i) {
      store.removeArrayItem('provinces', i)
      // Collapse all expansion state to avoid stale indices after a removal.
      expandedProv.value = new Set()
      expandedCounty.value = new Set()
      provMore.value = new Set()
      countyMore.value = new Set()
    }

    return {
      store,
      provinces,
      provinceYieldKeys,
      countyYieldKeys,
      statusFlags,
      humanize,
      isProvExpanded,
      toggleProv,
      isProvMore,
      toggleProvMore,
      isCountyExpanded,
      toggleCounty,
      isCountyMore,
      toggleCountyMore,
      addProvince,
      removeProvince,
    }
  },
}
</script>

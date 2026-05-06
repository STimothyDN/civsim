<template>
  <div class="fieldset array-section" :class="'fieldset--depth-' + Math.min(depth, 3)">
    <legend>{{ humanize(title) }}</legend>

    <!-- Province Groups Summary (only for provinces array) -->
    <div v-if="isProvincesArray && carouselItems.length > 0" class="province-groups-summary">
      <div class="province-groups-summary-header">
        <div class="province-groups-summary-title">Province Groups</div>
        <div v-if="carouselItems.length > VISIBLE_COUNT" class="carousel-controls">
          <button type="button" class="carousel-btn" @click="carouselPrev" aria-label="Previous group">‹</button>
          <span class="carousel-indicator">{{ carouselOffset + 1 }}–{{ Math.min(carouselOffset + VISIBLE_COUNT, carouselItems.length) }} of {{ carouselItems.length }}</span>
          <button type="button" class="carousel-btn" @click="carouselNext" aria-label="Next group">›</button>
        </div>
      </div>
      <div class="carousel-viewport">
        <TransitionGroup :name="slideDirection" tag="div" class="carousel-track">
          <div v-for="card in visibleCards" :key="card.key" class="group-summary-card">
            <!-- Regular group card -->
            <template v-if="card.type === 'group'">
              <h4>
                <span class="group-dot" :style="{ background: card.color }"></span>
                {{ card.name }}
                <span v-if="card.regionalCapital" class="group-capital-label">⭐ {{ card.regionalCapital }}</span>
              </h4>
              <div v-if="card.totals" class="calc-stats-grid">
                <div class="calc-stat">
                  <span class="calc-icon">📊</span>
                  <span class="calc-label">Regional Pop</span>
                  <span class="calc-value">{{ formatNumber(card.totals.regionalPopulation) }}</span>
                </div>
                <div class="calc-stat">
                  <span class="calc-icon">🏛️</span>
                  <span class="calc-label">Assemblypeople</span>
                  <span class="calc-value">{{ formatNumber(card.totals.assemblypeople) }}</span>
                </div>
                <div class="calc-stat">
                  <span class="calc-icon">⛪</span>
                  <span class="calc-label">Prelates</span>
                  <span class="calc-value">{{ formatNumber(card.totals.prelates) }}</span>
                </div>
              </div>
              <div class="province-chips">
                <span v-for="(pInfo, provinceInfoIndex) in card.provinces" :key="`${pInfo.name}-${provinceInfoIndex}`" class="province-chip" :class="{ 'province-chip--national': pInfo.isNationalCapital, 'province-chip--regional': pInfo.isRegionalCapital && !pInfo.isNationalCapital }">
                  <span v-if="pInfo.isNationalCapital" class="chip-capital-icon">👑</span>
                  <span v-else-if="pInfo.isRegionalCapital" class="chip-capital-icon">⭐</span>
                  {{ pInfo.name }}
                </span>
              </div>
            </template>
            <!-- Unassigned card -->
            <template v-else>
              <h4>
                <span class="group-dot group-dot--muted"></span>
                Unassigned
              </h4>
              <div class="province-chips">
                <span v-for="(pInfo, provinceInfoIndex) in card.provinces" :key="`${pInfo.name}-${provinceInfoIndex}`" class="province-chip" :class="{ 'province-chip--national': pInfo.isNationalCapital }">
                  <span v-if="pInfo.isNationalCapital" class="chip-capital-icon">👑</span>
                  {{ pInfo.name }}
                </span>
              </div>
            </template>
          </div>
        </TransitionGroup>
      </div>
    </div>

    <TransitionGroup v-if="isClosestProvincesArray && arr.length > 0" name="closest-province" tag="div" class="closest-provinces-editor">
      <div v-for="(item, index) in arr" :key="closestProvinceKey(item)" class="closest-province-row">
        <div class="closest-province-index">{{ index + 1 }}</div>
        <FormField :path="`${itemPath(index)}.province_name`" label="Province name" />
        <FormField :path="`${itemPath(index)}.distance`" label="Distance" />
      </div>
    </TransitionGroup>

    <div class="array-layout" v-else-if="arr.length > 0">
      <!-- Master List / Sidebar -->
      <div class="array-sidebar">
        <button v-if="!isFixedArray" class="btn-ghost add-sidebar-btn" type="button" @click="add">+ Add {{ singular }}</button>
        <div class="array-list">
          <template v-if="isProvincesArray">
            <section v-for="group in provinceSidebarGroups" :key="group.key" class="sidebar-group">
              <button
                type="button"
                class="sidebar-group-header"
                :aria-expanded="!isSidebarGroupCollapsed(group.key)"
                @click="toggleSidebarGroup(group.key)"
              >
                <span class="sidebar-group-title">
                  <span class="chev" :class="{ collapsed: isSidebarGroupCollapsed(group.key) }">▾</span>
                  <span class="sidebar-group-dot" :style="{ backgroundColor: group.color }"></span>
                  <span class="sidebar-group-label">{{ group.label }}</span>
                  <span class="sidebar-group-capital" :class="{ 'sidebar-group-capital--missing': !group.hasRegionalCapital }" :title="group.hasRegionalCapital ? `Regional Capital: ${group.regionalCapitalName}` : 'No Regional Capital Assigned'">⭐</span>
                </span>
                <span class="sidebar-group-meta">{{ group.items.length }}</span>
              </button>

              <Transition name="sidebar-collapse">
                <div v-show="!isSidebarGroupCollapsed(group.key)" class="sidebar-group-items">
                  <button
                    type="button"
                    v-for="entry in group.items"
                    :key="entry.index"
                    class="sidebar-item"
                    :class="{
                      'sidebar-item--active': selectedIndex === entry.index,
                      'sidebar-item--national-capital': entry.item?.is_national_capital,
                      'sidebar-item--regional-capital': entry.item?.is_regional_capital
                    }"
                    @click="selectedIndex = entry.index"
                  >
                    <span class="sidebar-item-name">{{ itemSidebarDisplayName(entry.item, entry.index) }}</span>
                    <div class="sidebar-item-badges">
                      <span v-if="entry.item?.is_national_capital" class="sidebar-badge" title="National Capital">👑</span>
                      <span v-if="entry.item?.is_regional_capital" class="sidebar-badge" title="Regional Capital">⭐</span>
                    </div>
                  </button>
                </div>
              </Transition>
            </section>
          </template>

          <template v-else>
            <button
              type="button"
              v-for="(item, index) in arr"
              :key="index"
              class="sidebar-item"
              :class="{ 'sidebar-item--active': selectedIndex === index }"
              @click="selectedIndex = index"
            >
              <span class="sidebar-item-name">{{ itemSidebarDisplayName(item, index) }}</span>
            </button>
          </template>
        </div>
      </div>
      
      <!-- Detail View / Content -->
      <div ref="contentEl" class="array-content">
        <template v-if="selectedIndex < arr.length">
          <div class="array-item-header">
            <h3>
              {{ itemDisplayName(arr[selectedIndex], selectedIndex) }}
              <span v-if="isProvincesArray && arr[selectedIndex]?.is_national_capital" class="capital-badge capital-badge--national" title="National Capital">👑 National Capital</span>
              <span v-if="isProvincesArray && arr[selectedIndex]?.is_regional_capital" class="capital-badge capital-badge--regional" title="Regional Capital">⭐ Regional Capital</span>
              <span v-if="isProvincesArray" class="group-badge" :class="{ 'group-badge--none': !arr[selectedIndex]?.group }" :style="arr[selectedIndex]?.group ? badgeStyle(arr[selectedIndex].group) : {}">
                {{ arr[selectedIndex]?.group || 'No group' }}
              </span>
            </h3>
            <button v-if="!isFixedArray" type="button" class="btn-danger remove-btn" @click="remove(selectedIndex)">Remove</button>
          </div>

          <div class="array-item-body">
            <div v-if="isProvincesArray" class="calc-row">
              <div class="calc-stat calc-stat--inline">
                <span class="calc-icon">🧮</span>
                <span class="calc-label">Provincial Population</span>
                <span class="calc-value">{{ calcField(selectedIndex, 'provincialPopulation') }}</span>
              </div>
              <div class="calc-stat calc-stat--inline">
                <span class="calc-icon">🏛️</span>
                <span class="calc-label">Assemblypeople</span>
                <span class="calc-value">{{ calcField(selectedIndex, 'assemblypeople') }}</span>
              </div>
              <div class="calc-stat calc-stat--inline">
                <span class="calc-icon">⛪</span>
                <span class="calc-label">Prelates</span>
                <span class="calc-value">{{ calcField(selectedIndex, 'prelates') }}</span>
              </div>
              <div class="calc-stat calc-stat--inline">
                <span class="calc-icon">🛐</span>
                <span class="calc-label">Dominant Religion</span>
                <span class="calc-value">{{ calcField(selectedIndex, 'dominantReligion', true) }}</span>
              </div>
            </div>
            
            <FieldsetGroup v-if="isObject(arr[selectedIndex])" :path="itemPath(selectedIndex)" :label="itemDisplayName(arr[selectedIndex], selectedIndex)" :depth="depth + 1" />
            <FormField v-else :path="itemPath(selectedIndex)" :label="title + ' value'" />
          </div>
        </template>

        <div v-if="isCountiesArray" class="array-bottom-actions">
          <button type="button" class="btn-primary" @click="add">+ Add {{ singular }}</button>
        </div>
      </div>
    </div>
    
    <div v-else class="array-empty-state">
      <p>No {{ title.toLowerCase() }}.</p>
      <button v-if="!isFixedArray" type="button" class="btn-primary" @click="add">+ Add {{ singular }}</button>
    </div>
  </div>
</template>

<script>
import { computed, defineAsyncComponent, nextTick, ref, watch } from 'vue'
import { useFormStore } from '../stores/formStore'
import { humanize, getSingularLabel } from '../utils/text'
import { isObject } from '../utils/object'
import { groupColor as getGroupColor } from '../domain/colors'
import { computeRegionalTotals } from '../utils/calculatedFields'

export default {
  name: 'ArraySection',
  components: {
    FieldsetGroup: defineAsyncComponent(() => import('./FieldsetGroup.vue')),
    FormField: defineAsyncComponent(() => import('./FormField.vue')),
  },
  props: {
    path: { type: String, required: true },
    label: { type: String, default: '' },
    depth: { type: Number, default: 0 },
  },
  setup(props) {
    const store = useFormStore()
    const contentEl = ref(null)
    const arr = computed(() => store.getValueAtPath(props.path) || [])
    const rawLabel = computed(() => props.label || (props.path.split('.').slice(-1)[0] || 'Array'))
    const title = computed(() => humanize(rawLabel.value))
    const singular = computed(() => getSingularLabel(title.value))

    const isProvincesArray = computed(() => props.path === 'provinces')
    const isCountiesArray = computed(() => /^provinces\[\d+\]\.counties$/.test(props.path))
    const isClosestProvincesArray = computed(() => /^provinces\[\d+\]\.closest_provinces$/.test(props.path))
    const isFixedArray = computed(() => isClosestProvincesArray.value)
    const closestProvinceKeys = new WeakMap()
    let closestProvinceKeyCounter = 0

    const groups = computed(() => store.currentData?.province_groups || [])

    // Map group name -> color
    function groupColor(name) {
      return getGroupColor(groups.value, name)
    }

    function badgeStyle(groupName) {
      const c = groupColor(groupName)
      return {
        background: c + '1a',
        borderColor: c + '44',
        color: c,
      }
    }

    const groupSummary = computed(() => {
      if (!isProvincesArray.value) return []
      const provs = arr.value
      const totals = computeRegionalTotals(store.currentData?.provinces, store.provinceCalcs)
      return groups.value.map(g => {
        const groupProvs = provs.filter(p => p.group === g)
        const regionalCap = groupProvs.find(p => p.is_regional_capital)
        return {
          name: g,
          color: groupColor(g),
          regionalCapital: regionalCap ? (regionalCap.name || 'Unnamed') : null,
          provinces: groupProvs.map(p => ({
            name: p.name || 'Unnamed',
            isNationalCapital: !!p.is_national_capital,
            isRegionalCapital: !!p.is_regional_capital,
          })),
          totals: totals.get(g) ?? null,
        }
      }).filter(gs => gs.provinces.length > 0)
    })

    const unassignedProvinces = computed(() => {
      if (!isProvincesArray.value) return []
      return arr.value.filter(p => !p.group).map(p => ({
        name: p.name || 'Unnamed',
        isNationalCapital: !!p.is_national_capital,
      }))
    })

    // --- Carousel logic ---
    const VISIBLE_COUNT = 3
    const carouselOffset = ref(0)
    const slideDirection = ref('carousel-slide-left')
    const collapsedSidebarGroups = ref(new Set())

    // Combine group cards + optional unassigned card into a single list
    const carouselItems = computed(() => {
      const items = groupSummary.value.map((gs, index) => ({ ...gs, type: 'group', key: `g-${index}-${gs.name}` }))
      if (unassignedProvinces.value.length > 0) {
        items.push({ type: 'unassigned', key: 'unassigned', provinces: unassignedProvinces.value })
      }
      return items
    })

    // Clamp offset if items shrink
    watch(carouselItems, (items) => {
      if (items.length <= VISIBLE_COUNT) {
        carouselOffset.value = 0
      } else if (carouselOffset.value >= items.length) {
        carouselOffset.value = 0
      }
    })

    const visibleCards = computed(() => {
      const items = carouselItems.value
      const count = items.length
      if (count <= VISIBLE_COUNT) return items
      const result = []
      for (let i = 0; i < VISIBLE_COUNT; i++) {
        result.push(items[(carouselOffset.value + i) % count])
      }
      return result
    })

    function carouselNext() {
      slideDirection.value = 'carousel-slide-left'
      carouselOffset.value = (carouselOffset.value + 1) % carouselItems.value.length
    }

    function carouselPrev() {
      slideDirection.value = 'carousel-slide-right'
      const len = carouselItems.value.length
      carouselOffset.value = (carouselOffset.value - 1 + len) % len
    }

    function provincePopulationForIndex(index) {
      const value = store.provinceCalcs[index]?.provincialPopulation
      return typeof value === 'number' && Number.isFinite(value) ? value : 0
    }

    function provinceSidebarGroupKey(groupName) {
      return groupName ? `group:${groupName}` : 'group:__unassigned__'
    }

    function createSidebarGroup(groupName) {
      const unassigned = !groupName
      return {
        key: provinceSidebarGroupKey(groupName),
        label: unassigned ? 'Unassigned' : groupName,
        color: unassigned ? 'var(--text-muted)' : groupColor(groupName),
        items: [],
      }
    }

    const provinceSidebarGroups = computed(() => {
      if (!isProvincesArray.value) return []

      const byGroup = new Map()
      const ensureGroup = (groupName) => {
        const key = provinceSidebarGroupKey(groupName)
        if (!byGroup.has(key)) byGroup.set(key, createSidebarGroup(groupName))
        return byGroup.get(key)
      }

      groups.value.forEach((groupName) => {
        if (groupName) ensureGroup(groupName)
      })

      arr.value.forEach((item, index) => {
        const group = item?.group || ''
        ensureGroup(group).items.push({
          item,
          index,
          provincialPopulation: provincePopulationForIndex(index),
        })
      })

      return [...byGroup.values()]
        .filter((group) => group.items.length > 0)
        .map((group) => {
          const sortedItems = [...group.items].sort((a, b) => {
            if (b.provincialPopulation !== a.provincialPopulation) {
              return b.provincialPopulation - a.provincialPopulation
            }
            return a.index - b.index
          })
          const regionalCapital = sortedItems.find((entry) => entry.item?.is_regional_capital)
          return {
            ...group,
            hasRegionalCapital: !!regionalCapital,
            regionalCapitalName: regionalCapital?.item?.name || null,
            items: sortedItems,
          }
        })
    })

    watch(provinceSidebarGroups, (nextGroups) => {
      const validKeys = new Set(nextGroups.map((group) => group.key))
      const retained = new Set([...collapsedSidebarGroups.value].filter((key) => validKeys.has(key)))
      if (retained.size !== collapsedSidebarGroups.value.size) {
        collapsedSidebarGroups.value = retained
      }
    })

    function isSidebarGroupCollapsed(key) {
      return collapsedSidebarGroups.value.has(key)
    }

    function toggleSidebarGroup(key) {
      const next = new Set(collapsedSidebarGroups.value)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      collapsedSidebarGroups.value = next
    }

    function itemPath(index) {
      return `${props.path}[${index}]`
    }

    function closestProvinceKey(item) {
      if (!item || typeof item !== 'object') return `closest-province-${item}`
      if (!closestProvinceKeys.has(item)) {
        closestProvinceKeyCounter += 1
        closestProvinceKeys.set(item, `closest-province-${closestProvinceKeyCounter}`)
      }
      return closestProvinceKeys.get(item)
    }

    function itemDisplayName(item, index) {
      // Try to pull a meaningful name from the item's data
      if (item && typeof item === 'object') {
        const name = item.name || item.province_name || item.basic_info?.name
        if (name) return `${singular.value}: ${name}`
      }
      // Fallback for primitives with a value
      if (item && typeof item !== 'object') return `${singular.value}: ${item}`
      // Default numbered fallback
      return `${singular.value} #${index + 1}`
    }

    function itemSidebarDisplayName(item, index) {
      if (item && typeof item === 'object') {
        const name = item.name || item.province_name || item.basic_info?.name
        if (name) return name
      }
      if (item && typeof item !== 'object') return String(item)
      return `#${index + 1}`
    }

    async function add() {
      const newIndex = arr.value.length
      store.addArrayItem(props.path)
      if (!isCountiesArray.value) return

      selectedIndex.value = newIndex
      await focusSelectedCounty()
    }

    function remove(index) {
      const item = arr.value[index]
      const displayName = itemDisplayName(item, index)
      const confirmed = window.confirm(`Remove "${displayName}"? This cannot be undone.`)
      if (!confirmed) return
      store.removeArrayItem(props.path, index)
    }

    const selectedIndex = ref(0)
    
    // When items are deleted, make sure selectedIndex doesn't exceed bounds
    watch(arr, (newArr) => {
      if (selectedIndex.value >= newArr.length && newArr.length > 0) {
        selectedIndex.value = Math.max(0, newArr.length - 1)
      }
    }, { deep: true })

    function calcField(index, field, isString = false) {
      const calc = store.provinceCalcs[index]
      if (!calc || calc[field] == null) return '—'
      return isString ? calc[field] : formatNumber(calc[field])
    }

    function formatNumber(n) {
      return n.toLocaleString()
    }

    function expandSelectedCounty() {
      const legend = contentEl.value?.querySelector('.array-item-body > .fieldset > .fieldset-legend')
      const collapsedChevron = legend?.querySelector('.chev.collapsed')
      if (collapsedChevron) legend.click()
    }

    function focusFirstCountyField() {
      const firstField = contentEl.value?.querySelector(
        '.array-item-body input:not([disabled]):not([type="hidden"]), .array-item-body select:not([disabled]), .array-item-body textarea:not([disabled])'
      )
      if (!firstField) return false
      firstField.focus()
      if (firstField.tagName === 'INPUT' && typeof firstField.select === 'function') {
        firstField.select()
      }
      return document.activeElement === firstField
    }

    async function waitForRenderedCounty() {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    async function focusSelectedCounty() {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        await nextTick()
        expandSelectedCounty()
        await nextTick()
        if (focusFirstCountyField()) return
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }

    return { arr, title, singular, humanize, isObject, itemPath, closestProvinceKey, itemDisplayName, itemSidebarDisplayName, add, remove, isProvincesArray, isCountiesArray, isClosestProvincesArray, isFixedArray, groupSummary, unassignedProvinces, carouselItems, visibleCards, carouselOffset, slideDirection, VISIBLE_COUNT, carouselPrev, carouselNext, badgeStyle, groupColor, depth: props.depth, calcField, formatNumber, selectedIndex, provinceSidebarGroups, isSidebarGroupCollapsed, toggleSidebarGroup, contentEl }
  }
}
</script>

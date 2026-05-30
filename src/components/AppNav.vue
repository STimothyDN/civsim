<template>
  <aside class="rail">
    <div class="rail__brand">
      <span class="rail__crest" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2 20 5.5V11c0 4.6-3.2 7.4-8 9-4.8-1.6-8-4.4-8-9V5.5L12 2Z" />
          <path d="M8 9.5h8M8.8 13h6.4M7.6 16.5h8.8" />
        </svg>
      </span>
      <span class="rail__title">
        <b>CIV SIM</b>
        <span>Atlas</span>
      </span>
    </div>

    <div class="rail__group-label eyebrow">Workspace</div>
    <router-link
      v-for="item in workspace"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      :class="{ 'nav-item--active': isActiveLink($route.path, item) }"
    >
      <component :is="item.icon" :size="17" />
      <span>{{ item.label }}</span>
      <span v-if="item.badge != null" class="nav-item__badge num">{{ item.badge }}</span>
    </router-link>

    <div class="rail__group-label eyebrow">Tools</div>
    <button type="button" class="nav-item" @click="recalculate">
      <RefreshCw :size="17" :class="{ spin: recalcSpinning }" />
      <span>Recalculate</span>
    </button>
    <button type="button" class="nav-item" :disabled="!hasData" @click="openWizard">
      <Wand2 :size="17" />
      <span>Edit in Wizard</span>
    </button>

    <div class="rail__foot">
      <div class="world-switcher" :class="{ 'world-switcher--open': switcherOpen }">
        <div v-if="switcherOpen" class="world-switcher__pop">
          <div class="world-switcher__head">
            <span class="eyebrow">Loaded Worlds</span>
            <span class="num world-switcher__count">{{ worlds.length }}</span>
          </div>
          <div class="world-switcher__list">
            <button
              v-for="world in worlds"
              :key="world.id"
              type="button"
              class="world-row"
              :class="{ 'world-row--active': world.active }"
              @click="selectWorld(world.id)"
            >
              <span class="world-row__dot" :class="{ 'world-row__dot--active': world.active }" />
              <span class="world-row__meta">
                <b>{{ world.name }}</b>
                <span>{{ world.leader || 'Unassigned' }} · {{ world.provinceCount }} prov</span>
              </span>
              <Check v-if="world.active" :size="14" class="world-row__check" />
              <span
                v-else
                class="world-row__remove"
                role="button"
                title="Remove world"
                @click.stop="removeWorld(world.id)"
              ><X :size="13" /></span>
            </button>
            <p v-if="!worlds.length" class="world-switcher__empty">No worlds loaded yet.</p>
          </div>
          <div class="world-switcher__actions">
            <label class="world-switcher__action" title="Load a civilization from a JSON file">
              <input type="file" accept=".json" hidden @change="onLoadCiv" />
              <Upload :size="14" /> Load civ…
            </label>
            <button type="button" class="world-switcher__action" title="Start a fresh civilization" @click="newCiv">
              <Plus :size="14" /> New civ
            </button>
          </div>
        </div>
        <button type="button" class="rail__world" @click="switcherOpen = !switcherOpen">
          <span class="rail__world-dot" />
          <span class="rail__world-meta">
            <b>{{ countryName }}</b>
            <span>{{ worldSub }}</span>
          </span>
          <ChevronsUpDown :size="14" class="rail__world-toggle" />
        </button>
      </div>
      <div v-if="switcherOpen" class="world-switcher__scrim" @click="switcherOpen = false" />
    </div>
  </aside>
</template>

<script>
import { computed, markRaw, ref } from 'vue'
import { Check, ChevronsUpDown, LayoutDashboard, Globe2, Layers, Plus, RefreshCw, Upload, Vote, Wand2, X } from 'lucide-vue-next'
import { useFormStore } from '../stores/formStore'
import { useUiStore } from '../stores/uiStore'
import { extractElectionState } from '../domain/templateCodec'

export default {
  name: 'AppNav',
  components: { Check, ChevronsUpDown, Plus, RefreshCw, Upload, Wand2, X },
  setup() {
    const store = useFormStore()
    const ui = useUiStore()
    const recalcSpinning = ref(false)
    const switcherOpen = ref(false)
    const worlds = computed(() => store.worldSummaries)

    const hasData = computed(() => !!store.currentData)
    const countryName = computed(() => {
      if (!store.currentData) return 'No World Loaded'
      return store.currentData.country?.basic_info?.name?.trim() || 'Untitled Civilization'
    })
    const provinceCount = computed(() => store.currentData?.provinces?.length ?? null)
    const worldSub = computed(() => {
      const leader = store.currentData?.country?.basic_info?.leader
      return hasData.value ? `${leader || 'Unassigned'} · autosaved` : 'Create or load a template'
    })

    const workspace = computed(() => [
      { to: '/', label: 'Command', icon: markRaw(LayoutDashboard), exact: true },
      { to: '/overview', label: 'Country Overview', icon: markRaw(Globe2), prefix: '/overview' },
      { to: '/builder', label: 'Builder', icon: markRaw(Layers), prefix: '/builder', badge: provinceCount.value },
      { to: '/elections', label: 'Election Simulator', icon: markRaw(Vote), prefix: '/elections' },
    ])

    function recalculate() {
      store.recalculate()
      recalcSpinning.value = true
      setTimeout(() => { recalcSpinning.value = false }, 700)
    }

    function openWizard() {
      ui.openWizardModal()
    }

    function isActiveLink(path, link) {
      if (link.exact) return path === link.to
      if (link.prefix) return path.startsWith(link.prefix)
      return path === link.to
    }

    // ── World switcher ──
    function selectWorld(id) {
      store.switchWorld(id)
      switcherOpen.value = false
    }

    function removeWorld(id) {
      store.removeWorld(id)
    }

    function newCiv() {
      store.addWorld()
      switcherOpen.value = false
    }

    function onLoadCiv(event) {
      const file = event.target.files?.[0]
      if (!file) { event.target.value = ''; return }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result)
          const electionState = extractElectionState(parsed)
          store.addWorld(parsed, { election: electionState })
        } catch (err) {
          store.showToast('Invalid JSON file. Please choose a valid template file.', 'error')
        }
      }
      reader.readAsText(file)
      event.target.value = ''
      switcherOpen.value = false
    }

    return {
      workspace, hasData, countryName, worldSub, recalcSpinning, isActiveLink, recalculate, openWizard,
      switcherOpen, worlds, selectWorld, removeWorld, newCiv, onLoadCiv,
    }
  },
}
</script>

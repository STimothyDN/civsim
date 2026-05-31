<template>
  <section class="election-page-shell">
    <div v-if="!hasData" class="election-page-placeholder">
      <component :is="icon" :size="52" class="placeholder-icon" />
      <h3>No Election Data</h3>
      <p>Load or found a realm to view {{ eyebrow.toLowerCase() }} results.</p>
      <button type="button" class="btn-primary" style="margin-top: 16px" @click="openNewTemplate">
        <FilePlus2 :size="16" />
        New Realm
      </button>
    </div>

    <template v-else>
      <header v-if="!hideHero" class="election-shell-hero">
        <div class="election-shell-icon-wrap">
          <component :is="icon" :size="22" />
        </div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h2>{{ title }}</h2>
        <p v-if="subtitle" class="election-shell-subtitle">{{ subtitle }}</p>
        <div v-if="$slots['hero-calls']" class="election-shell-hero-calls">
          <slot name="hero-calls" />
        </div>
      </header>

      <slot />
    </template>
  </section>
</template>

<script>
import { watch } from 'vue'
import { FilePlus2 } from 'lucide-vue-next'
import { useUiStore } from '../../stores/uiStore'
import { useElectionResults } from '../../composables/useElectionResults'

export default {
  name: 'ElectionPageShell',
  components: { FilePlus2 },
  props: {
    icon: { type: [Object, Function], required: true },
    eyebrow: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    scope: { type: String, default: 'overview' },
    targetName: { type: String, default: null },
    hideHero: { type: Boolean, default: false },
  },
  setup(props) {
    const uiStore = useUiStore()
    const { hasData, store } = useElectionResults()

    watch(
      () => [props.scope, props.targetName],
      ([s, t]) => uiStore.setPageContext(s, t),
      { immediate: true },
    )

    const openNewTemplate = () => uiStore.openNewTemplateModal()

    return { hasData, store, openNewTemplate }
  },
}
</script>

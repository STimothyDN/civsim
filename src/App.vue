<template>
  <div class="app" :class="{ 'rail-open': railOpen }" @click="onShellClick">
    <AppNav />
    <div class="main">
      <AppHeader @toggle-rail="railOpen = !railOpen" />
      <AppTicker />
      <main class="view">
        <div class="view__inner">
          <router-view v-slot="{ Component }">
            <Transition name="page-fade" mode="out-in">
              <component :is="Component" />
            </Transition>
          </router-view>
        </div>
      </main>
    </div>

    <NewTemplateModal />
    <ElectionNarrativeModal />
    <ElectionBroadcastModal />
    <PollBreakdownModal />
    <ToastNotification />
  </div>
</template>

<script>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppNav from './components/AppNav.vue'
import AppTicker from './components/AppTicker.vue'
import NewTemplateModal from './components/setup/NewTemplateModal.vue'
import ElectionNarrativeModal from './components/elections/ElectionNarrativeModal.vue'
import ElectionBroadcastModal from './components/elections/ElectionBroadcastModal.vue'
import PollBreakdownModal from './components/elections/PollBreakdownModal.vue'
import ToastNotification from './components/ToastNotification.vue'
import { useGlobalElectionTicker } from './composables/useGlobalElectionTicker'

export default {
  name: 'App',
  components: {
    AppHeader, AppNav, AppTicker,
    NewTemplateModal, ElectionNarrativeModal, ElectionBroadcastModal, PollBreakdownModal, ToastNotification,
  },
  setup() {
    const route = useRoute()
    const railOpen = ref(false)

    // Mount the global election-ticker generator once at the shell so the
    // ticker button (anywhere in the app) can drive AppTicker via the store.
    useGlobalElectionTicker()

    // Close the mobile rail whenever navigation occurs.
    watch(() => route.path, () => { railOpen.value = false })

    // Dismiss the mobile rail when the scrim (the ::after overlay area) is tapped.
    function onShellClick(e) {
      if (railOpen.value && e.target.classList.contains('app')) railOpen.value = false
    }

    return { railOpen, onShellClick }
  },
}
</script>

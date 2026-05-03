<template>
  <div class="app-shell">
    <AppHeader />
    <AppNav />
    <router-view v-slot="{ Component }">
      <Transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
    <ElectionNarrativeModal />
    <ElectionBroadcastModal />
    <PollBreakdownModal />
    <ToastNotification />
  </div>
</template>

<script>
import AppHeader from './components/AppHeader.vue'
import AppNav from './components/AppNav.vue'
import ElectionNarrativeModal from './components/elections/ElectionNarrativeModal.vue'
import ElectionBroadcastModal from './components/elections/ElectionBroadcastModal.vue'
import PollBreakdownModal from './components/elections/PollBreakdownModal.vue'
import ToastNotification from './components/ToastNotification.vue'

export default {
  name: 'App',
  components: { AppHeader, AppNav, ElectionNarrativeModal, ElectionBroadcastModal, PollBreakdownModal, ToastNotification },
}
</script>

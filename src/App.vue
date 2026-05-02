<template>
  <div class="app-shell">
    <AppHeader />
    <AppNav />
    <router-view v-slot="{ Component }">
      <Transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
    <ToastNotification />
  </div>
</template>

<script>
import AppHeader from './components/AppHeader.vue'
import AppNav from './components/AppNav.vue'
import ToastNotification from './components/ToastNotification.vue'

export default {
  name: 'App',
  components: { AppHeader, AppNav, ToastNotification },
}
</script>

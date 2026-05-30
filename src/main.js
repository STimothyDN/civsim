import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useFormStore } from './stores/formStore'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const formStore = useFormStore(pinia)

// Mount first for instant first paint; the autosaved world hydrates
// asynchronously from IndexedDB just after (the app shows proper empty
// states until it arrives). Then arm the debounced autosave.
app.mount('#app')

formStore
  .hydrateFromAutosave()
  .catch(() => {})
  .finally(() => formStore.startAutosave())

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
formStore.hydrateFromAutosave()
formStore.startAutosave()

app.mount('#app')

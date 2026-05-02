<template>
  <header class="app-header">
    <div class="app-header-inner">
      <ScrollText class="app-header-icon" />
      <div>
        <h1>Civ Sim</h1>
      </div>
    </div>
    <p>Build, simulate, and explore your civilization — provinces, elections, demographics, and more.</p>
  </header>
</template>

<script>
import { ScrollText } from 'lucide-vue-next'

export default {
  name: 'AppHeader',
  components: { ScrollText },
}
</script>

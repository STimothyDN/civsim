<template>
  <div>
    <Toolbar />
    <FormContainer :initial-section="initialSection" />
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Toolbar from '../components/Toolbar.vue'
import FormContainer from '../components/FormContainer.vue'

export default {
  name: 'HomePage',
  components: { Toolbar, FormContainer },
  setup() {
    const route = useRoute()
    const initialSection = computed(() => {
      const section = route.query.section
      return Array.isArray(section) ? section[0] : section
    })

    return { initialSection }
  },
}
</script>

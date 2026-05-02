<template>
  <div>
    <Toolbar />
    <FormContainer />
  </div>
</template>

<script>
import Toolbar from '../components/Toolbar.vue'
import FormContainer from '../components/FormContainer.vue'

export default {
  name: 'HomePage',
  components: { Toolbar, FormContainer },
}
</script>
